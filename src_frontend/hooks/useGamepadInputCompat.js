import { useCallback, useState } from "react";

import { pollGamepadsSdl } from "../utils/ipc";

import { useStaticSettings } from "./useStaticSettings";

export const useGamepadInputCompat = () => {
  const { staticSettings } = useStaticSettings();
  const [sdlWorking, setSdlWorking] = useState(true);

  const pollGamepads = useCallback(async () => {
    if (sdlWorking && staticSettings.ENABLE_SDL_INPUT) {
      try {
        const gamepads = await pollGamepadsSdl();
        if (gamepads && gamepads.length > 0) return gamepads;
      } catch {
        setSdlWorking(false);
      }
    }

    return navigator.getGamepads().filter((g) => g !== null);
  }, [staticSettings.ENABLE_SDL_INPUT, sdlWorking]);

  return { pollGamepads };
};
