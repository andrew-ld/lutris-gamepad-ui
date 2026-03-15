import buttonActionSound from "../resources/buttonActionSound.wav";

import { logError } from "./ipc";

const ACTION_SOUND_THROTTLE_MS = 50;

const buttonActionSoundInstance = new Audio(buttonActionSound);
const lastButtonActionSoundPlaytime = { current: 0 };

export function playButtonActionSound(currentTime) {
  lastButtonActionSoundPlaytime.current = currentTime || new Date();

  buttonActionSoundInstance.currentTime = 0;

  buttonActionSoundInstance
    .play()
    .catch((e) => logError("Could not play sound", e));
}

export function playButtonActionSoundThrottled() {
  const now = Date.now();
  if (now - lastButtonActionSoundPlaytime.current > ACTION_SOUND_THROTTLE_MS) {
    playButtonActionSound(now);
  }
}
