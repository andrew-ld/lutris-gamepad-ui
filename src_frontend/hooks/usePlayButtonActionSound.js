import { useCallback } from "react";

import { useSettingsState } from "../stores/settingsStore";
import { playButtonActionSoundThrottled } from "../utils/sound";

export function usePlayButtonActionSound() {
  const { settings } = useSettingsState();

  return useCallback(() => {
    if (settings.enableUiActionSoundFeedbacks) {
      playButtonActionSoundThrottled();
    }
  }, [settings]);
}
