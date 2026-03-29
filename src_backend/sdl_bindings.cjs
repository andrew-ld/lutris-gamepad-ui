const SDL2_LIBRARY_NAME = [
  "libSDL2-2.0.so.0",
  "libSDL2.so",
  "libSDL2-2.0.so",

  "/usr/local/lib/libSDL2-2.0.so.0",
  "/usr/local/lib/libSDL2.so",

  "/usr/lib/x86_64-linux-gnu/libSDL2-2.0.so.0",
  "/usr/lib/aarch64-linux-gnu/libSDL2-2.0.so.0",
  "/usr/lib/arm-linux-gnueabihf/libSDL2-2.0.so.0",
  "/usr/lib/i386-linux-gnu/libSDL2-2.0.so.0",
  "/usr/lib64/libSDL2-2.0.so.0",
  "/usr/lib/libSDL2-2.0.so.0",
  "/app/lib/libSDL2-2.0.so.0",
];

/**
 * Binds and returns SDL2 GameController functions.
 * @param {object} lib - The loaded Koffi library instance
 * @param {object} koffi - The Koffi module
 * @returns {object} Object containing bound SDL methods and constants
 */
function bindSDL2(lib, koffi) {
  koffi.alias("Uint8", "uint8_t");
  koffi.alias("Uint16", "uint16_t");
  koffi.alias("Uint32", "uint32_t");
  koffi.alias("Sint16", "int16_t");

  koffi.pointer("SDL_GameController", koffi.opaque());

  return {
    // eslint-disable-next-line unicorn/numeric-separators-style
    SDL_INIT_GAMECONTROLLER: 0x00002000,
    SDL_CONTROLLER_AXIS_MAX: 6,
    SDL_CONTROLLER_BUTTON_MAX: 15,

    SDL_Init: lib.func("int SDL_Init(Uint32 flags)"),
    SDL_Quit: lib.func("void SDL_Quit(void)"),

    SDL_NumJoysticks: lib.func("int SDL_NumJoysticks(void)"),
    SDL_IsGameController: lib.func(
      "int SDL_IsGameController(int joystick_index)",
    ),

    SDL_GameControllerOpen: lib.func(
      "SDL_GameController* SDL_GameControllerOpen(int joystick_index)",
    ),
    SDL_GameControllerClose: lib.func(
      "void SDL_GameControllerClose(SDL_GameController* gamecontroller)",
    ),
    SDL_GameControllerGetAttached: lib.func(
      "int SDL_GameControllerGetAttached(SDL_GameController* gamecontroller)",
    ),

    SDL_GameControllerUpdate: lib.func("void SDL_GameControllerUpdate(void)"),

    SDL_GameControllerGetAxis: lib.func(
      "Sint16 SDL_GameControllerGetAxis(SDL_GameController* gamecontroller, int axis)",
    ),
    SDL_GameControllerGetButton: lib.func(
      "Uint8 SDL_GameControllerGetButton(SDL_GameController* gamecontroller, int button)",
    ),
    SDL_GameControllerName: lib.func(
      "const char* SDL_GameControllerName(SDL_GameController* gamecontroller)",
    ),
  };
}

module.exports = { bindSDL2, SDL2_LIBRARY_NAME };
