const {
  SDL3_LIBRARY_NAME,
  bindSDL3,
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

      for (const libraryName of SDL3_LIBRARY_NAME) {
        try {
          const lib = koffi.load(libraryName);
          const sdl = bindSDL3(lib);

          if (!sdl.SDL_Init(sdl.SDL_INIT_GAMEPAD)) {
            throw new Error("Failed to initialize SDL3 Gamepad subsystem");
          }

          const mappingPath = localeAppFile(
            "./src_backend/resources/gamecontrollerdb.txt",
          );

          if (sdl.SDL_AddGamepadMappingsFromFile(mappingPath) < 0) {
            logWarn("SDL3 unable to load gamepad mapping", mappingPath);
          }

          logInfo("SDL3 initialized!", libraryName);

          const activeControllers = new Map();

          const cleanup = () => {
            for (const ptr of activeControllers.values()) {
              if (ptr) sdl.SDL_CloseGamepad(ptr);
            }
            activeControllers.clear();
            sdl.SDL_Quit();
          };

          process.on("exit", cleanup);

          resolve({ sdl, activeControllers, koffi });
          return;
        } catch (error) {
          logError("Unable to load", libraryName, error);
        }
      }

      reject(new Error("Unable to load SDL3"));
    } catch (error) {
      logError("Fatal error while load SDL3:", error);
      reject(error);
    }
  });

  return SDL_HANDLE.promise;
}

async function pollGamepads() {
  const { sdl, activeControllers, koffi } = await getSdlHandle();

  sdl.SDL_PumpEvents();
  sdl.SDL_UpdateGamepads();

  const countPtr = new Int32Array(1);
  const gamepadsPtr = sdl.SDL_GetGamepads(countPtr);
  const numGamepads = countPtr[0];
  const currentInstanceIds = new Set();

  if (gamepadsPtr) {
    try {
      const ids = koffi.decode(gamepadsPtr, "SDL_JoystickID", numGamepads);
      for (let i = 0; i < numGamepads; i++) {
        currentInstanceIds.add(ids[i]);
      }
    } finally {
      sdl.SDL_free(gamepadsPtr);
    }
  }

  const gamepads = [];

  for (const [instanceId, ptr] of activeControllers.entries()) {
    if (!currentInstanceIds.has(instanceId) || !sdl.SDL_GamepadConnected(ptr)) {
      sdl.SDL_CloseGamepad(ptr);
      activeControllers.delete(instanceId);
    }
  }

  for (const instanceId of currentInstanceIds) {
    let ptr = activeControllers.get(instanceId);

    if (!ptr && sdl.SDL_IsGamepad(instanceId)) {
      ptr = sdl.SDL_OpenGamepad(instanceId);
      if (ptr) activeControllers.set(instanceId, ptr);
    }

    if (ptr) {
      if (!sdl.SDL_GamepadConnected(ptr)) {
        sdl.SDL_CloseGamepad(ptr);
        activeControllers.delete(instanceId);
        continue;
      }

      const axes = [];
      const buttons = [];

      for (let a = 0; a < sdl.SDL_GAMEPAD_AXIS_COUNT; a++) {
        const rawValue = sdl.SDL_GetGamepadAxis(ptr, a);
        const normalized = Math.max(-1, Math.min(1, rawValue / 32_767));
        axes.push(normalized);
      }

      for (let b = 0; b < sdl.SDL_GAMEPAD_BUTTON_COUNT; b++) {
        const isPressed = sdl.SDL_GetGamepadButton(ptr, b);
        buttons.push(isPressed === 1);
      }

      gamepads.push({
        index: instanceId,
        axes: axes,
        buttons: buttons,
      });
    }
  }

  return gamepads;
}

// Mapping definitions based on SDL3 Gamepad Enums and W3C Standard Gamepad layout.
// SDL3 Buttons: 0:SOUTH, 1:EAST, 2:WEST, 3:NORTH, 4:BACK, 5:GUIDE, 6:START, 7:L3, 8:R3, 9:L1, 10:R1, 11:UP, 12:DOWN, 13:LEFT, 14:RIGHT
// SDL3 Axes: 0:LeftX, 1:LeftY, 2:RightX, 3:RightY, 4:L2, 5:R2
const BUTTON_MAPPING = [
  { type: "button", index: 0 }, // 0: SOUTH (A)
  { type: "button", index: 1 }, // 1: EAST (B)
  { type: "button", index: 2 }, // 2: WEST (X)
  { type: "button", index: 3 }, // 3: NORTH (Y)
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
 * Maps SDL3 gamepad data to the standard Web Gamepad API format.
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

module.exports = { pollGamepads, mapSdlGamepadsToWebApi };
