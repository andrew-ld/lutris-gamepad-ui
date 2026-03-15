import { useCallback } from "react";

import { useSettingsState } from "../contexts/SettingsContext";
import { playButtonActionSoundThrottled } from "../utils/sound";

export function usePlayButtonActionSound() {
  const { settings } = useSettingsState();

  return useCallback(() => {
    if (settings.enableUiActionSoundFeedbacks) {
      playButtonActionSoundThrottled();
    }
  }, [settings]);
}
