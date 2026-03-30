const { logError, logInfo } = require("./utils.cjs");
const {
  X11_LIBRARY_NAME,
  bindX11,
  configureKoffiX11,
} = require("./x11_bindings.cjs");

const X11_HANDLE = { promise: null };

function getX11Handle() {
  if (X11_HANDLE.promise) return X11_HANDLE.promise;

  X11_HANDLE.promise = new Promise((resolve, reject) => {
    const koffi = require("koffi");
    configureKoffiX11(koffi);

    for (const libName of X11_LIBRARY_NAME) {
      try {
        const lib = koffi.load(libName);
        const x11 = bindX11(lib);
        const dpy = x11.XOpenDisplay(process.env.DISPLAY || null);

        if (!dpy) {
          throw new Error("Failed to initialize x11 display");
        }

        const root = x11.XDefaultRootWindow(dpy);
        process.on("exit", () => x11.XCloseDisplay(dpy));

        resolve({ x11, dpy, root, koffi });
        return;
      } catch (error) {
        logError("Unable to load", libName, error);
      }
    }

    reject(new Error("Unable to load libX11"));
  });

  return X11_HANDLE.promise;
}

async function cycleGamescopeFocus() {
  const { x11, dpy, root, koffi } = await getX11Handle();

  const gamescopeFocusableWindowsAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPE_FOCUSABLE_WINDOWS",
    x11.True,
  );
  const gamescopeFocusedWindowAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPE_FOCUSED_WINDOW",
    x11.True,
  );
  const gamescopeCtrlWindowAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPECTRL_BASELAYER_WINDOW",
    x11.False,
  );
  const gamescopeCtrlAppIDAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPECTRL_BASELAYER_APPID",
    x11.False,
  );

  function getProp(atom, type) {
    if (atom === 0n) return null;

    const actualType = Buffer.alloc(8);
    const actualFormat = Buffer.alloc(4);
    const nitems = Buffer.alloc(8);
    const bytesAfter = Buffer.alloc(8);
    const propPtr = Buffer.alloc(8);

    const status = x11.XGetWindowProperty(
      dpy,
      root,
      atom,
      0n,
      1024n,
      x11.False,
      type,
      actualType,
      actualFormat,
      nitems,
      bytesAfter,
      propPtr,
    );

    const n = nitems.readBigUInt64LE(0);
    const ptrAddress = propPtr.readBigUInt64LE(0);

    if (status !== 0 || ptrAddress === 0n || n === 0n) {
      return null;
    }

    const format = actualFormat.readInt32LE(0);
    const realPtr = koffi.decode(propPtr, "void*", 1)[0];
    let result = null;

    if (format === 32) {
      result = koffi.decode(realPtr, "uint64", Number(n));
    } else if (format === 8) {
      result = koffi.decode(realPtr, "unsigned char", Number(n));
    }

    x11.XFree(realPtr);
    return result;
  }

  const rawFocusable = getProp(gamescopeFocusableWindowsAtom, 0n);
  const focused = getProp(gamescopeFocusedWindowAtom, 0n);

  if (!rawFocusable || rawFocusable.length === 0) {
    logInfo("No focusable windows found");
    return;
  }

  const apps = [];
  for (let i = 0; i < rawFocusable.length; i += 3) {
    apps.push({
      window: BigInt(rawFocusable[i]),
      appID: BigInt(rawFocusable[i + 1]),
      pid: BigInt(rawFocusable[i + 2]),
    });
  }

  const currentFocusedWindow =
    focused && focused.length > 0 ? BigInt(focused[0]) : 0n;

  const currentIndex = apps.findIndex(
    (app) => app.window === currentFocusedWindow,
  );

  const nextApp = apps[(currentIndex + 1) % apps.length];

  logInfo(
    `Cycling focus from ${currentFocusedWindow} to ${nextApp.window} (AppID: ${nextApp.appID})`,
  );

  const winData = Buffer.alloc(8);
  winData.writeBigUInt64LE(nextApp.window);

  const appData = Buffer.alloc(8);
  appData.writeBigUInt64LE(nextApp.appID);

  x11.XChangeProperty(
    dpy,
    root,
    gamescopeCtrlWindowAtom,
    x11.XA_CARDINAL,
    32,
    x11.PropModeReplace,
    winData,
    1,
  );
  x11.XChangeProperty(
    dpy,
    root,
    gamescopeCtrlAppIDAtom,
    x11.XA_CARDINAL,
    32,
    x11.PropModeReplace,
    appData,
    1,
  );

  x11.XFlush(dpy);
}

module.exports = { cycleGamescopeFocus };

cycleGamescopeFocus();
