import { useCallback } from "react";

import { useSettingsState } from "../stores/settingsStore";
import { pollGamepadsSdl } from "../utils/ipc";

import { useStaticSettings } from "./useStaticSettings";

const getBrowserGamepads = () =>
  navigator.getGamepads().filter((g) => g !== null);

export const useGamepadInputCompat = () => {
  const { staticSettings } = useStaticSettings();
  const { settings } = useSettingsState();

  const sdlInputEnabled =
    staticSettings.ENABLE_SDL_INPUT || settings.enableSdlInput;

  const pollGamepads = useCallback(() => {
    if (sdlInputEnabled) {
      const sdlGamepads = pollGamepadsSdl();
      if (sdlGamepads?.length > 0) {
        return sdlGamepads;
      }
    }

    return getBrowserGamepads();
  }, [sdlInputEnabled]);

  return { pollGamepads };
};
