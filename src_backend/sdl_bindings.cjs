const SDL2_LIBRARY_NAME = ["libSDL2-2.0.so.0", "libSDL2.so", "libSDL2-2.0.so"];

function configureKoffiSdl(koffi) {
  koffi.alias("Uint8", "uint8_t");
  koffi.alias("Uint16", "uint16_t");
  koffi.alias("Uint32", "uint32_t");
  koffi.alias("Sint16", "int16_t");
  koffi.pointer("SDL_GameController", koffi.opaque());
}

/**
 * Binds and returns SDL2 GameController functions.
 * @param {object} lib - The loaded Koffi library instance
 * @returns {object} Object containing bound SDL methods and constants
 */
function bindSDL2(lib) {
  const sdl = {
    // eslint-disable-next-line unicorn/numeric-separators-style
    SDL_INIT_GAMECONTROLLER: 0x00002000,
    SDL_CONTROLLER_AXIS_MAX: 6,
    SDL_CONTROLLER_BUTTON_MAX: 15,

    SDL_Init: lib.func("int SDL_Init(Uint32 flags)"),
    SDL_Quit: lib.func("void SDL_Quit(void)"),
    SDL_PumpEvents: lib.func("void SDL_PumpEvents(void)"),

    SDL_RWFromFile: lib.func(
      "void* SDL_RWFromFile(const char* file, const char* mode)",
    ),
    SDL_GameControllerAddMapping: lib.func(
      "int SDL_GameControllerAddMapping(const char* mappingString)",
    ),
    SDL_GameControllerAddMappingsFromRW: lib.func(
      "int SDL_GameControllerAddMappingsFromRW(void* rw, int freerw)",
    ),

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
    SDL_GameControllerGetVendor: lib.func(
      "Uint16 SDL_GameControllerGetVendor(SDL_GameController* gamecontroller)",
    ),
    SDL_GameControllerGetProduct: lib.func(
      "Uint16 SDL_GameControllerGetProduct(SDL_GameController* gamecontroller)",
    ),
  };

  try {
    sdl.SDL_GameControllerGetProductVersion = lib.func(
      "Uint16 SDL_GameControllerGetProductVersion(SDL_GameController* gamecontroller)",
    );
  } catch {
    sdl.SDL_GameControllerGetProductVersion = null;
  }

  try {
    sdl.SDL_GameControllerPath = lib.func(
      "const char* SDL_GameControllerPath(SDL_GameController* gamecontroller)",
    );
  } catch {
    sdl.SDL_GameControllerPath = null;
  }

  sdl.SDL_GameControllerAddMappingsFromFile = function (file) {
    const rw = sdl.SDL_RWFromFile(file, "rb");
    if (!rw) {
      return -1;
    }
    return sdl.SDL_GameControllerAddMappingsFromRW(rw, 1);
  };

  return sdl;
}

module.exports = { bindSDL2, SDL2_LIBRARY_NAME, configureKoffiSdl };
