import { useEffect } from "react";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

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

export const useAudio = () =>
  useAudioStore(
    useShallow((state) => ({
      volume: state.volume,
      isMuted: state.isMuted,
      isLoading: state.isLoading,
      defaultSinkName: state.defaultSinkName,
      availableSinks: state.availableSinks,
      setVolume: state.setVolume,
      increaseVolume: state.increaseVolume,
      decreaseVolume: state.decreaseVolume,
      toggleMute: state.toggleMute,
      setDefaultSink: state.setDefaultSink,
    })),
  );

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
