const SDL3_LIBRARY_NAME = ["libSDL3.so.0", "libSDL3.so"];

function configureKoffiSdl(koffi) {
  koffi.alias("Uint8", "uint8_t");
  koffi.alias("Uint16", "uint16_t");
  koffi.alias("Uint32", "uint32_t");
  koffi.alias("Sint16", "int16_t");
  koffi.alias("SDL_JoystickID", "uint32_t");
  koffi.pointer("SDL_Gamepad", koffi.opaque());
}

/**
 * Binds and returns SDL3 Gamepad functions.
 * @param {object} lib - The loaded Koffi library instance
 * @returns {object} Object containing bound SDL methods and constants
 */
function bindSDL3(lib) {
  const sdl = {
    // eslint-disable-next-line unicorn/numeric-separators-style
    SDL_INIT_GAMEPAD: 0x00002000,
    SDL_GAMEPAD_AXIS_COUNT: 6,
    SDL_GAMEPAD_BUTTON_COUNT: 15,

    SDL_Init: lib.func("bool SDL_Init(Uint32 flags)"),
    SDL_Quit: lib.func("void SDL_Quit(void)"),

    SDL_AddGamepadMapping: lib.func(
      "bool SDL_AddGamepadMapping(const char* mappingString)",
    ),
    SDL_AddGamepadMappingsFromFile: lib.func(
      "int SDL_AddGamepadMappingsFromFile(const char* file)",
    ),

    SDL_GetGamepads: lib.func("SDL_JoystickID* SDL_GetGamepads(int* count)"),
    SDL_free: lib.func("void SDL_free(void* mem)"),

    SDL_IsGamepad: lib.func("bool SDL_IsGamepad(SDL_JoystickID instance_id)"),

    SDL_OpenGamepad: lib.func(
      "SDL_Gamepad* SDL_OpenGamepad(SDL_JoystickID instance_id)",
    ),
    SDL_CloseGamepad: lib.func("void SDL_CloseGamepad(SDL_Gamepad* gamepad)"),
    SDL_GamepadConnected: lib.func(
      "bool SDL_GamepadConnected(SDL_Gamepad* gamepad)",
    ),

    SDL_UpdateGamepads: lib.func("void SDL_UpdateGamepads(void)"),
    SDL_PumpEvents: lib.func("void SDL_PumpEvents(void)"),

    SDL_GetGamepadAxis: lib.func(
      "Sint16 SDL_GetGamepadAxis(SDL_Gamepad* gamepad, int axis)",
    ),
    SDL_GetGamepadButton: lib.func(
      "Uint8 SDL_GetGamepadButton(SDL_Gamepad* gamepad, int button)",
    ),
    SDL_GetGamepadName: lib.func(
      "const char* SDL_GetGamepadName(SDL_Gamepad* gamepad)",
    ),
  };

  return sdl;
}

module.exports = { bindSDL3, SDL3_LIBRARY_NAME, configureKoffiSdl };
