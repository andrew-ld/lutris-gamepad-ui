const { getMainWindow } = require("./state.cjs");
const { logError, logInfo } = require("./utils.cjs");
const {
  X11_LIBRARY_NAME,
  bindX11,
  configureKoffiX11,
} = require("./x11_bindings.cjs");

const X11_HANDLE = {
  promise: null,
  atom_cache: {},
  long_size: null,
};

function getX11Handle() {
  if (X11_HANDLE.promise) return X11_HANDLE.promise;

  X11_HANDLE.promise = new Promise((resolve, reject) => {
    const koffi = require("koffi");

    X11_HANDLE.long_size = koffi.sizeof("long");

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
  if (atom == 0) return null;

  const { long_size } = X11_HANDLE;

  const actualType = Buffer.alloc(long_size);
  const actualFormat = Buffer.alloc(4);
  const nitems = Buffer.alloc(long_size);
  const bytesAfter = Buffer.alloc(long_size);
  const propPtr = Buffer.alloc(long_size);

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

  const n =
    long_size === 8
      ? nitems.readBigUInt64LE(0)
      : BigInt(nitems.readUInt32LE(0));

  const ptrAddress =
    long_size === 8
      ? propPtr.readBigUInt64LE(0)
      : BigInt(propPtr.readUInt32LE(0));

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

  try {
    if (format === 32) {
      const rawResult = koffi.decode(realPtr, "unsigned long", Number(n));
      result = rawResult.map(BigInt);
    } else if (format === 8) {
      result = koffi.decode(realPtr, "unsigned char", Number(n));
    }
  } finally {
    x11.XFree(realPtr);
  }

  return { status, ptrAddress, n, result };
}

function createPropData(bigIntValue) {
  const { long_size } = X11_HANDLE;
  const buf = Buffer.alloc(long_size);

  if (long_size === 8) {
    buf.writeBigUInt64LE(BigInt(bigIntValue), 0);
  } else {
    buf.writeUInt32LE(Number(BigInt(bigIntValue) & 0xff_ff_ff_ffn), 0);
  }

  return buf;
}

async function x11gamescopeRotateActiveWindow() {
  const { x11, dpy, root, koffi } = await getX11Handle();

  const gamescopeFocusableWindowsAtom = getAtom(
    x11,
    dpy,
    "GAMESCOPE_FOCUSABLE_WINDOWS",
    x11.True,
  );
  if (gamescopeFocusableWindowsAtom == 0) {
    logError(
      "x11gamescopeRotateActiveWindow: GAMESCOPE_FOCUSABLE_WINDOWS atom not found",
    );
    return;
  }

  const gamescopeFocusedWindowAtom = getAtom(
    x11,
    dpy,
    "GAMESCOPE_FOCUSED_WINDOW",
    x11.True,
  );
  if (gamescopeFocusedWindowAtom == 0) {
    logError(
      "x11gamescopeRotateActiveWindow: GAMESCOPE_FOCUSED_WINDOW atom not found",
    );
    return;
  }

  const gamescopeCtrlWindowAtom = getAtom(
    x11,
    dpy,
    "GAMESCOPECTRL_BASELAYER_WINDOW",
    x11.True,
  );
  if (gamescopeCtrlWindowAtom == 0) {
    logError(
      "x11gamescopeRotateActiveWindow: GAMESCOPECTRL_BASELAYER_WINDOW atom not found",
    );
    return;
  }

  const gamescopeCtrlAppIDAtom = getAtom(
    x11,
    dpy,
    "GAMESCOPECTRL_BASELAYER_APPID",
    x11.True,
  );
  if (gamescopeCtrlAppIDAtom == 0) {
    logError(
      "x11gamescopeRotateActiveWindow: GAMESCOPECTRL_BASELAYER_APPID atom not found",
    );
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
    logInfo(
      "x11gamescopeRotateActiveWindow: No focusable windows found (rawFocusable is empty or null)",
    );
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

  if (apps.length < 2) {
    logInfo(
      "x11gamescopeRotateActiveWindow: Less than 2 apps are focusable, skipping rotation",
    );
    return;
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

  let currentIndex = apps.findIndex(
    (app) => app.window === currentFocusedWindow,
  );

  if (currentIndex === -1) {
    currentIndex = 0;
  }

  const nextApp = apps[(currentIndex + 1) % apps.length];

  x11.XChangeProperty(
    dpy,
    root,
    gamescopeCtrlWindowAtom,
    x11.XA_CARDINAL,
    32,
    x11.PropModeReplace,
    createPropData(nextApp.window),
    1,
  );
  x11.XChangeProperty(
    dpy,
    root,
    gamescopeCtrlAppIDAtom,
    x11.XA_CARDINAL,
    32,
    x11.PropModeReplace,
    createPropData(nextApp.appID),
    1,
  );

  x11.XFlush(dpy);
  logInfo(
    "x11gamescopeRotateActiveWindow: Rotated to window ID",
    nextApp.window,
  );
}

async function x11gamescopeIsSteamControlled() {
  const { x11, dpy, root, koffi } = await getX11Handle();

  const focusedAppAtom = getAtom(x11, dpy, "GAMESCOPE_FOCUSED_APP", x11.True);
  if (focusedAppAtom == 0) {
    logError(
      "x11gamescopeIsSteamControlled: GAMESCOPE_FOCUSED_APP atom not found",
    );
    return false;
  }

  const { ptrAddress } = getProp(x11, dpy, root, focusedAppAtom, 0n, koffi);

  const isSteamControlled = ptrAddress !== 0n;

  return isSteamControlled;
}

async function x11gamescopeSetMainWindowActive(active) {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    logError(
      "x11gamescopeSetMainWindowActive: mainWindow is null or undefined",
    );
    return;
  }

  const handle = mainWindow.getNativeWindowHandle();
  if (!handle || handle.length === 0) {
    logError(
      "x11gamescopeSetMainWindowActive: Failed to get native window handle",
    );
    return;
  }

  const myWindowId =
    handle.length === 8
      ? handle.readBigUInt64LE(0)
      : BigInt(handle.readUInt32LE(0));

  const { x11, dpy, root, koffi } = await getX11Handle();

  const steamGameAtom = getAtom(x11, dpy, "STEAM_GAME", x11.False);
  if (steamGameAtom == 0) {
    logError("x11gamescopeSetMainWindowActive: STEAM_GAME atom not found");
    return;
  }

  const gamescopeFocusableWindowsAtom = getAtom(
    x11,
    dpy,
    "GAMESCOPE_FOCUSABLE_WINDOWS",
    x11.True,
  );
  if (gamescopeFocusableWindowsAtom == 0) {
    logError(
      "x11gamescopeSetMainWindowActive: GAMESCOPE_FOCUSABLE_WINDOWS atom not found",
    );
    return;
  }

  const zeroAppData = createPropData(0n);

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
      logError(
        "x11gamescopeSetMainWindowActive (active=true): No focusable windows found (rawFocusable is empty)",
      );
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
      logError(
        `x11gamescopeSetMainWindowActive (active=true): My window ID ${myWindowId} not found in GAMESCOPE_FOCUSABLE_WINDOWS array`,
      );
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
    x11.XChangeProperty(
      dpy,
      myWindowId,
      steamGameAtom,
      x11.XA_CARDINAL,
      32,
      x11.PropModeReplace,
      createPropData(myWindowId),
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

    logInfo(
      `x11gamescopeSetMainWindowActive (active=true): Successfully set window ID ${myWindowId} active`,
    );
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
          x11.XChangeProperty(
            dpy,
            winId,
            steamGameAtom,
            x11.XA_CARDINAL,
            32,
            x11.PropModeReplace,
            createPropData(winId),
            1,
          );
        }
      }
    } else {
      logInfo(
        "x11gamescopeSetMainWindowActive (active=false): Warning - no focusable windows found to restore. XLowerWindow will still run.",
      );
    }

    // 3. Lower Window.
    x11.XLowerWindow(dpy, myWindowId);
    logInfo(
      `x11gamescopeSetMainWindowActive (active=false): Successfully lowered window ID ${myWindowId}`,
    );
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
