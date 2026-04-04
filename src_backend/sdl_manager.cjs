const { getAppConfig } = require("./config_manager.cjs");
const { resolveControllerIdentity } = require("./controller_family_db.cjs");
const { getVirtualDevice } = require("./controller_mode_manager.cjs");
const {
  SDL2_LIBRARY_NAME,
  bindSDL2,
  configureKoffiSdl,
} = require("./sdl_bindings.cjs");
const { logError, logInfo, localeAppFile, logWarn } = require("./utils.cjs");

const SDL_HANDLE = { promise: null };

function getSdlHandle() {
  if (SDL_HANDLE.promise) return SDL_HANDLE.promise;

  SDL_HANDLE.promise = new Promise((resolve, reject) => {
    try {
      const koffi = require("koffi");
      configureKoffiSdl(koffi);

      for (const libraryName of SDL2_LIBRARY_NAME) {
        try {
          const lib = koffi.load(libraryName);
          const sdl = bindSDL2(lib);

          if (sdl.SDL_Init(sdl.SDL_INIT_GAMECONTROLLER) !== 0) {
            throw new Error(
              "Failed to initialize SDL2 GameController subsystem",
            );
          }

          const mappingPath = localeAppFile(
            "./src_backend/resources/gamecontrollerdb.txt",
          );

          if (sdl.SDL_GameControllerAddMappingsFromFile(mappingPath) < 0) {
            logWarn("SDL2 unable to load gamepad mapping", mappingPath);
          }

          logInfo("SDL2 initialized!", libraryName);

          const activeControllers = new Map();

          const cleanup = () => {
            for (const ptr of activeControllers.values()) {
              if (ptr) sdl.SDL_GameControllerClose(ptr);
            }
            activeControllers.clear();
            sdl.SDL_Quit();
          };

          process.on("exit", cleanup);

          resolve({ sdl, activeControllers });
          return;
        } catch (error) {
          logError("Unable to load", libraryName, error);
        }
      }

      reject(new Error("Unable to load sdl"));
    } catch (error) {
      logError("Fatal error while load sdl2:", error);
      reject(error);
    }
  });

  return SDL_HANDLE.promise;
}

async function pollGamepads() {
  const { sdl, activeControllers } = await getSdlHandle();

  sdl.SDL_GameControllerUpdate();

  const numJoysticks = sdl.SDL_NumJoysticks();
  const gamepads = [];

  for (const [i, ptr] of activeControllers.entries()) {
    if (i >= numJoysticks || sdl.SDL_GameControllerGetAttached(ptr) === 0) {
      sdl.SDL_GameControllerClose(ptr);
      activeControllers.delete(i);
    }
  }

  for (let i = 0; i < numJoysticks; i++) {
    if (sdl.SDL_IsGameController(i) === 0) continue;

    let ptr = activeControllers.get(i);

    if (!ptr) {
      ptr = sdl.SDL_GameControllerOpen(i);
      if (ptr) activeControllers.set(i, ptr);
    }

    if (ptr) {
      if (sdl.SDL_GameControllerGetAttached(ptr) === 0) {
        sdl.SDL_GameControllerClose(ptr);
        activeControllers.delete(i);
        continue;
      }

      const axes = [];
      const buttons = [];

      for (let a = 0; a < sdl.SDL_CONTROLLER_AXIS_MAX; a++) {
        const rawValue = sdl.SDL_GameControllerGetAxis(ptr, a);
        axes.push(rawValue / 32_767);
      }

      for (let b = 0; b < sdl.SDL_CONTROLLER_BUTTON_MAX; b++) {
        const isPressed = sdl.SDL_GameControllerGetButton(ptr, b);
        buttons.push(isPressed === 1);
      }

      gamepads.push({
        index: i,
        axes: axes,
        buttons: buttons,
      });
    }
  }

  return gamepads;
}

// Mapping definitions based on SDL2 Controller Enums and W3C Standard Gamepad layout.
// SDL2 Buttons: 0:A, 1:B, 2:X, 3:Y, 4:BACK, 5:GUIDE, 6:START, 7:L3, 8:R3, 9:L1, 10:R1, 11:UP, 12:DOWN, 13:LEFT, 14:RIGHT
// SDL2 Axes: 0:LeftX, 1:LeftY, 2:RightX, 3:RightY, 4:L2, 5:R2
const BUTTON_MAPPING = [
  { type: "button", index: 0 }, // 0: A
  { type: "button", index: 1 }, // 1: B
  { type: "button", index: 2 }, // 2: X
  { type: "button", index: 3 }, // 3: Y
  { type: "button", index: 9 }, // 4: L1
  { type: "button", index: 10 }, // 5: R1
  { type: "axis", index: 4 }, // 6: L2 (Trigger)
  { type: "axis", index: 5 }, // 7: R2 (Trigger)
  { type: "button", index: 4 }, // 8: Select/Back
  { type: "button", index: 6 }, // 9: Start/Forward
  { type: "button", index: 7 }, // 10: L3 (Left stick click)
  { type: "button", index: 8 }, // 11: R3 (Right stick click)
  { type: "button", index: 11 }, // 12: D-pad Up
  { type: "button", index: 12 }, // 13: D-pad Down
  { type: "button", index: 13 }, // 14: D-pad Left
  { type: "button", index: 14 }, // 15: D-pad Right
  { type: "button", index: 5 }, // 16: Guide/Home
];

const AXIS_MAPPING = [
  0, // Left stick X
  1, // Left stick Y
  2, // Right stick X
  3, // Right stick Y
];

/**
 * Maps SDL2 gamepad data to the standard Web Gamepad API format.
 * @param {Array} gamepads - The raw gamepads from pollGamepads()
 * @returns {Array} Gamepads in Web API format
 */
function mapSdlGamepadsToWebApi(gamepads) {
  return gamepads.map((gp) => ({
    index: gp.index,
    mapping: "standard",
    buttons: BUTTON_MAPPING.map((map) => {
      if (map.type === "button") {
        const pressed = gp.buttons[map.index] || false;
        return { pressed, value: pressed ? 1 : 0 };
      } else {
        const value = Math.max(0, gp.axes[map.index] || 0);
        return { pressed: value > 0.1, value };
      }
    }),
    axes: AXIS_MAPPING.map((idx) => gp.axes[idx] || 0),
  }));
}

function isAppGeneratedXinputController(controller, virtualDevice) {
  if (!virtualDevice) return false;

  // Best signal: exact event node path match.
  if (virtualDevice.eventPath && controller.path) {
    return virtualDevice.eventPath === controller.path;
  }

  // Fallback: strict signature match.
  if (!virtualDevice.name || !virtualDevice.vendorId || !virtualDevice.productId) {
    return false;
  }

  if (controller.rawName !== virtualDevice.name) {
    return false;
  }

  if (controller.vendorId !== virtualDevice.vendorId || controller.productId !== virtualDevice.productId) {
    return false;
  }

  if (virtualDevice.version && controller.version) {
    return controller.version === virtualDevice.version;
  }

  return true;
}

async function listControllers() {
  const { sdl, activeControllers } = await getSdlHandle();

  sdl.SDL_PumpEvents();
  sdl.SDL_GameControllerUpdate();

  const numJoysticks = sdl.SDL_NumJoysticks();
  const controllers = [];
  const appConfig = getAppConfig();
  const virtualDevice =
    appConfig?.controllerInputMode === "xinput" ? getVirtualDevice() : null;

  for (let i = 0; i < numJoysticks; i++) {
    if (sdl.SDL_IsGameController(i) === 0) continue;

    let ptr = activeControllers.get(i);
    if (!ptr) {
      ptr = sdl.SDL_GameControllerOpen(i);
      if (ptr) activeControllers.set(i, ptr);
    }

    if (!ptr || sdl.SDL_GameControllerGetAttached(ptr) === 0) continue;

    const rawName = sdl.SDL_GameControllerName(ptr) || `Controller ${i + 1}`;
    const vendorId = sdl.SDL_GameControllerGetVendor(ptr)
      .toString(16)
      .padStart(4, "0");
    const productId = sdl.SDL_GameControllerGetProduct(ptr)
      .toString(16)
      .padStart(4, "0");
    const version = sdl.SDL_GameControllerGetProductVersion
      ? sdl.SDL_GameControllerGetProductVersion(ptr).toString(16).padStart(4, "0")
      : null;
    const path = sdl.SDL_GameControllerPath
      ? sdl.SDL_GameControllerPath(ptr)
      : null;
    const identity = resolveControllerIdentity(vendorId, productId, rawName);

    const controller = {
      index: i,
      name: identity.standardizedName,
      rawName,
      vendorId,
      productId,
      version,
      path,
      databaseKey: identity.databaseKey,
      isRecognized: identity.isRecognized,
      family: identity.family,
    };

    if (isAppGeneratedXinputController(controller, virtualDevice)) {
      continue;
    }

    controllers.push(controller);
  }

  return controllers;
}

module.exports = { pollGamepads, mapSdlGamepadsToWebApi, listControllers };
