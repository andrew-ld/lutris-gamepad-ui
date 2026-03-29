import { pollGamepadsSdl } from "./ipc";

export async function getGamepads() {
  let sdlGamepads;

  try {
    sdlGamepads = await pollGamepadsSdl();
  } catch {
    // SDL polling fails or is unavailable
  }

  if (sdlGamepads && sdlGamepads.length > 0) {
    return sdlGamepads;
  }

  return navigator.getGamepads();
}
