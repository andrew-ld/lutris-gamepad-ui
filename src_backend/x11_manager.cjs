const { getMainWindow } = require("./state.cjs");
const { logError, logInfo } = require("./utils.cjs");
const {
  X11_LIBRARY_NAME,
  bindX11,
  configureKoffiX11,
} = require("./x11_bindings.cjs");

const X11_HANDLE = { promise: null, atom_cache: {} };

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

function getAtom(x11, dpy, name, onlyIfExists) {
  if (!X11_HANDLE.atom_cache[name]) {
    X11_HANDLE.atom_cache[name] = x11.XInternAtom(dpy, name, onlyIfExists);
  }
  return X11_HANDLE.atom_cache[name];
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

  const gamescopeFocusableWindowsAtom = getAtom(
    x11,
    dpy,
    "GAMESCOPE_FOCUSABLE_WINDOWS",
    x11.True,
  );
  if (gamescopeFocusableWindowsAtom === 0) {
    return;
  }

  const gamescopeFocusedWindowAtom = getAtom(
    x11,
    dpy,
    "GAMESCOPE_FOCUSED_WINDOW",
    x11.True,
  );
  if (gamescopeFocusedWindowAtom === 0) {
    return;
  }

  const gamescopeCtrlWindowAtom = getAtom(
    x11,
    dpy,
    "GAMESCOPECTRL_BASELAYER_WINDOW",
    x11.True,
  );
  if (gamescopeCtrlWindowAtom === 0) {
    return;
  }

  const gamescopeCtrlAppIDAtom = getAtom(
    x11,
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

  const focusedAppAtom = getAtom(x11, dpy, "GAMESCOPE_FOCUSED_APP", x11.True);
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

  const steamGameAtom = getAtom(x11, dpy, "STEAM_GAME", x11.False);
  if (steamGameAtom === 0) {
    return;
  }

  const gamescopeFocusableWindowsAtom = getAtom(
    x11,
    dpy,
    "GAMESCOPE_FOCUSABLE_WINDOWS",
    x11.True,
  );
  if (gamescopeFocusableWindowsAtom === 0) {
    return;
  }

  const zeroAppData = Buffer.alloc(8);
  zeroAppData.writeBigUInt64LE(0n);

  if (active) {
    // 1. Demote Others FIRST: This ensures our window is the only Tier 1 window
    // when Gamescope re-evaluates focus during the mapping process.
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

    let foundMyWindow = false;

    for (let i = 0; i < rawFocusable.length; i += 3) {
      const winId = BigInt(rawFocusable[i]);
      foundMyWindow = winId === myWindowId;
      if (foundMyWindow) {
        break;
      }
    }

    if (!foundMyWindow) {
      return;
    }

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

    // 2. Elevate Tier: Set STEAM_GAME on our window to its own ID (Tier 1).
    const myAppData = Buffer.alloc(8);
    myAppData.writeBigUInt64LE(myWindowId);
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

    // XSync ensures the Tier changes are processed by the X server (and thus Gamescope)
    // BEFORE we trigger the MapSequence reset.
    x11.XSync(dpy, x11.False);

    // 3. Reset Map Sequence: Unmap then Map.
    // This makes us the "newest" window in the high-priority stack.
    x11.XUnmapWindow(dpy, myWindowId);
    x11.XMapWindow(dpy, myWindowId);

    // 4. Force damage/exposure to win the "Damage Rule" tie-breaker.
    x11.XClearArea(dpy, myWindowId, 0, 0, 0, 0, x11.True);

    // 5. Final Raise and Input Focus
    x11.XRaiseWindow(dpy, myWindowId);
    x11.XSetInputFocus(dpy, myWindowId, 1, 0n);
  } else {
    // 1. Drop Tier: Set STEAM_GAME on our window to 0 (Tier 2).
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

    // 2. Restore Others: In non-steam mode, appID == Window ID.
    // We restore everyone else to Tier 1 so they can resume normal focus.
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
        if (winId !== myWindowId) {
          const appData = Buffer.alloc(8);
          appData.writeBigUInt64LE(winId);
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

    // 3. Lower Window.
    x11.XLowerWindow(dpy, myWindowId);
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
