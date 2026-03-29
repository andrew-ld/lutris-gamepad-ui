import { pollGamepadsSdl } from "./ipc";

const SDL_ERROR = { current: false };

export async function getGamepads() {
  let sdlGamepads;

  try {
    if (!SDL_ERROR.current) {
      sdlGamepads = await pollGamepadsSdl();
    }
  } catch {
    SDL_ERROR.current = true;
  }

  if (sdlGamepads && sdlGamepads.length > 0) {
    return sdlGamepads;
  }

  return navigator.getGamepads().filter((g) => g !== null);
}
