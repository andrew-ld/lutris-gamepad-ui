import { useEffect } from "react";

import { create } from "zustand";

import * as ipc from "../utils/ipc";

const VOLUME_STEP = 5;

const sortSinks = (sinks) =>
  [...(sinks || [])].toSorted((a, b) => {
    const descA = a.description;
    const descB = b.description;
    return descA.localeCompare(descB);
  });

export const useAudioStore = create((set, get) => ({
  volume: 100,
  isMuted: false,
  isLoading: true,
  defaultSinkName: null,
  availableSinks: [],
  processAudioInfo: (info) => {
    if (!info) {
      set({ isLoading: false });
      return;
    }

    set({
      volume: info.volume,
      isMuted: info.isMuted,
      defaultSinkName: info.name,
      availableSinks: sortSinks(info.availableSinks),
      isLoading: false,
    });
  },
  setVolume: (volumePercent) => {
    const clampedVolume = Math.max(0, Math.min(100, volumePercent));
    ipc.setAudioVolume(clampedVolume);

    if (get().isMuted && clampedVolume > 0) {
      ipc.setAudioMute(false);
    }
  },
  increaseVolume: () => {
    get().setVolume(get().volume + VOLUME_STEP);
  },
  decreaseVolume: () => {
    get().setVolume(get().volume - VOLUME_STEP);
  },
  toggleMute: () => {
    ipc.setAudioMute(!get().isMuted);
  },
  setDefaultSink: (sinkName) => {
    ipc.setDefaultSink(sinkName);
  },
}));

export const useAudio = () => ({
  volume: useAudioStore((state) => state.volume),
  isMuted: useAudioStore((state) => state.isMuted),
  isLoading: useAudioStore((state) => state.isLoading),
  defaultSinkName: useAudioStore((state) => state.defaultSinkName),
  availableSinks: useAudioStore((state) => state.availableSinks),
  setVolume: useAudioStore((state) => state.setVolume),
  increaseVolume: useAudioStore((state) => state.increaseVolume),
  decreaseVolume: useAudioStore((state) => state.decreaseVolume),
  toggleMute: useAudioStore((state) => state.toggleMute),
  setDefaultSink: useAudioStore((state) => state.setDefaultSink),
});

export const useInitializeAudioStore = () => {
  const processAudioInfo = useAudioStore((state) => state.processAudioInfo);

  useEffect(() => {
    let isActive = true;

    ipc
      .getAudioInfo()
      .then((info) => {
        if (isActive) {
          processAudioInfo(info);
        }
      })
      .catch((error) => {
        ipc.logError("Failed to fetch initial audio info:", error);
        if (isActive) {
          processAudioInfo(null);
        }
      });

    const unsubscribe = ipc.onAudioInfoChanged(processAudioInfo);

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [processAudioInfo]);
};
