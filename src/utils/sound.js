import buttonActionSound from "../resources/buttonActionSound.wav";

const ACTION_SOUND_THROTTLE_MS = 50;

const actionSound = new Audio(buttonActionSound);
let lastActionSoundPlayTime = 0;

const playSoundInstance = (audioInstance) => {
  audioInstance.currentTime = 0;
  audioInstance.play().catch((e) => console.warn("Could not play sound", e));
};

export function playActionSound() {
  const now = Date.now();
  if (now - lastActionSoundPlayTime > ACTION_SOUND_THROTTLE_MS) {
    playSoundInstance(actionSound);
    lastActionSoundPlayTime = now;
  }
}
