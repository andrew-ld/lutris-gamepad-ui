const { getMainWindow } = require("./state.cjs");
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

function getProp(x11, dpy, window, atom, type, koffi) {
  if (atom === 0n) return null;

  const actualType = Buffer.alloc(8);
  const actualFormat = Buffer.alloc(4);
  const nitems = Buffer.alloc(8);
  const bytesAfter = Buffer.alloc(8);
  const propPtr = Buffer.alloc(8);

  const status = x11.XGetWindowProperty(
    dpy,
    window,
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
    if (ptrAddress !== 0n) {
      const realPtr = koffi.decode(propPtr, "void*", 1)[0];
      x11.XFree(realPtr);
    }
    return { status, ptrAddress, n };
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
  return { status, ptrAddress, n, result };
}

async function x11gamescopeRotateActiveWindow() {
  const { x11, dpy, root, koffi } = await getX11Handle();

  const gamescopeFocusableWindowsAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPE_FOCUSABLE_WINDOWS",
    x11.True,
  );
  if (gamescopeFocusableWindowsAtom === 0) {
    return;
  }

  const gamescopeFocusedWindowAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPE_FOCUSED_WINDOW",
    x11.True,
  );
  if (gamescopeFocusedWindowAtom === 0) {
    return;
  }

  const gamescopeCtrlWindowAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPECTRL_BASELAYER_WINDOW",
    x11.True,
  );
  if (gamescopeCtrlWindowAtom === 0) {
    return;
  }

  const gamescopeCtrlAppIDAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPECTRL_BASELAYER_APPID",
    x11.True,
  );
  if (gamescopeCtrlAppIDAtom === 0) {
    return;
  }

  const { result: rawFocusable } = getProp(
    x11,
    dpy,
    root,
    gamescopeFocusableWindowsAtom,
    0n,
    koffi,
  );

  if (!rawFocusable || rawFocusable.length === 0) {
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

  const { result: focused } = getProp(
    x11,
    dpy,
    root,
    gamescopeFocusedWindowAtom,
    0n,
    koffi,
  );

  const currentFocusedWindow =
    focused && focused.length > 0 ? BigInt(focused[0]) : 0n;

  const currentIndex = apps.findIndex(
    (app) => app.window === currentFocusedWindow,
  );

  const nextApp = apps[(currentIndex + 1) % apps.length];

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

async function x11gamescopeIsSteamControlled() {
  const { x11, dpy, root, koffi } = await getX11Handle();

  const focusedAppAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPE_FOCUSED_APP",
    x11.True,
  );
  if (focusedAppAtom === 0) {
    return false;
  }

  const { ptrAddress } = getProp(x11, dpy, root, focusedAppAtom, 0n, koffi);

  const isSteamControlled = ptrAddress !== 0n;

  return isSteamControlled;
}

async function x11gamescopeSetMainWindowActive(active) {
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  const handle = mainWindow.getNativeWindowHandle();
  if (!handle || handle.length === 0) return;

  const myWindowId =
    handle.length === 8
      ? handle.readBigUInt64LE(0)
      : BigInt(handle.readUInt32LE(0));

  const { x11, dpy, root, koffi } = await getX11Handle();

  const steamGameAtom = x11.XInternAtom(dpy, "STEAM_GAME", x11.True);
  if (steamGameAtom === 0) {
    return;
  }

  const gamescopeFocusableWindowsAtom = x11.XInternAtom(
    dpy,
    "GAMESCOPE_FOCUSABLE_WINDOWS",
    x11.True,
  );
  if (steamGameAtom === 0) {
    return;
  }

  if (active) {
    // 1. Elevate Tier: Set STEAM_GAME on our window to its own ID (non-zero).
    const myAppData = Buffer.alloc(4);
    myAppData.writeUInt32LE(Number(myWindowId & 0xff_ff_ff_ffn));
    x11.XChangeProperty(
      dpy,
      myWindowId,
      steamGameAtom,
      x11.XA_CARDINAL,
      32,
      x11.PropModeReplace,
      myAppData,
      1,
    );

    // 2. Reset Map Sequence: Unmap then Map.
    x11.XUnmapWindow(dpy, myWindowId);
    x11.XMapWindow(dpy, myWindowId);

    // 3. Demote Others (Strict Mode): Set STEAM_GAME to 0 for every window except ours.
    const { result: rawFocusable } = getProp(
      x11,
      dpy,
      root,
      gamescopeFocusableWindowsAtom,
      0n,
      koffi,
    );
    if (rawFocusable && rawFocusable.length > 0) {
      const zeroAppData = Buffer.alloc(4);
      zeroAppData.writeUInt32LE(0);

      for (let i = 0; i < rawFocusable.length; i += 3) {
        const winId = BigInt(rawFocusable[i]);
        if (winId !== myWindowId) {
          x11.XChangeProperty(
            dpy,
            winId,
            steamGameAtom,
            x11.XA_CARDINAL,
            32,
            x11.PropModeReplace,
            zeroAppData,
            1,
          );
        }
      }
    }

    // Explicitly set focus just in case
    x11.XRaiseWindow(dpy, myWindowId);
    x11.XSetInputFocus(dpy, myWindowId, 1, 0n);
  } else {
    // 1. Drop Tier: Set STEAM_GAME on our window to 0.
    const zeroAppData = Buffer.alloc(4);
    zeroAppData.writeUInt32LE(0);
    x11.XChangeProperty(
      dpy,
      myWindowId,
      steamGameAtom,
      x11.XA_CARDINAL,
      32,
      x11.PropModeReplace,
      zeroAppData,
      1,
    );

    // 2. Lower Window.
    x11.XLowerWindow(dpy, myWindowId);

    // 3. Restore Others: Set their STEAM_GAME back to their own IDs.
    const { result: rawFocusable } = getProp(
      x11,
      dpy,
      root,
      gamescopeFocusableWindowsAtom,
      0n,
      koffi,
    );

    if (rawFocusable && rawFocusable.length > 0) {
      for (let i = 0; i < rawFocusable.length; i += 3) {
        const winId = BigInt(rawFocusable[i]);
        const appId = BigInt(rawFocusable[i + 1]);
        if (winId !== myWindowId && appId !== 0n) {
          const appData = Buffer.alloc(4);
          appData.writeUInt32LE(Number(appId & 0xff_ff_ff_ffn));
          x11.XChangeProperty(
            dpy,
            winId,
            steamGameAtom,
            x11.XA_CARDINAL,
            32,
            x11.PropModeReplace,
            appData,
            1,
          );
        }
      }
    }
  }

  x11.XFlush(dpy);
}

async function x11gamescopeToggleFocus(active) {
  const steamControlled = await x11gamescopeIsSteamControlled();

  logInfo(
    "x11gamescopeToggleFocus, active:",
    active,
    "steamControlled:",
    steamControlled,
  );

  if (steamControlled) {
    await x11gamescopeRotateActiveWindow();
  } else {
    await x11gamescopeSetMainWindowActive(active);
  }
}

module.exports = {
  x11gamescopeRotateActiveWindow,
  x11gamescopeSetMainWindowActive,
  x11gamescopeIsSteamControlled,
  x11gamescopeToggleFocus,
};
