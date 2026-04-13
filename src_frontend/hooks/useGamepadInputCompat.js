import { useCallback, useState } from "react";

import { useSettingsState } from "../contexts/SettingsContext";
import { pollGamepadsSdl } from "../utils/ipc";

import { useStaticSettings } from "./useStaticSettings";

export const useGamepadInputCompat = () => {
  const { staticSettings } = useStaticSettings();
  const { settings } = useSettingsState();
  const [sdlWorking, setSdlWorking] = useState(true);

  const pollGamepads = useCallback(async () => {
    const useSdlInput =
      sdlWorking &&
      (staticSettings.ENABLE_SDL_INPUT || settings.enableSdlInput);

    if (useSdlInput) {
      try {
        const gamepads = await pollGamepadsSdl();
        if (gamepads && gamepads.length > 0) return gamepads;
      } catch {
        setSdlWorking(false);
      }
    }

    return navigator.getGamepads().filter((g) => g !== null);
  }, [staticSettings.ENABLE_SDL_INPUT, sdlWorking, settings.enableSdlInput]);

  return { pollGamepads };
};
