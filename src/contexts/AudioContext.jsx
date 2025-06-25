import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as api from "../utils/ipc";
const { ipcRenderer } = window.require("electron");

const AudioContext = createContext(null);
export const useAudio = () => useContext(AudioContext);

const VOLUME_STEP = 5;

export const AudioProvider = ({ children }) => {
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(null);

  const fetchAudioInfo = useCallback(async () => {
    setIsLoading(true);

    try {
      const info = await api.getAudioInfo();
      setVolume(info.volume);
      setIsMuted(info.isMuted);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setVolume, setIsMuted]);

  useEffect(() => {
    fetchAudioInfo();

    const handleAudioInfoChanged = (_sender, info) => {
      console.log("[IPC] Received audio-info-changed", info);
      setVolume(info.volume);
      setIsMuted(info.isMuted);
      setIsLoading(false);
    };

    ipcRenderer.on("audio-info-changed", handleAudioInfoChanged);
    return () => {
      ipcRenderer.removeListener("audio-info-changed", handleAudioInfoChanged);
    };
  }, [fetchAudioInfo, setVolume, setIsMuted, setIsLoading]);

  const updateVolume = useCallback(
    (newVolume) => {
      const clampedVolume = Math.max(0, Math.min(100, newVolume));
      api.setAudioVolume(clampedVolume);
      if (isMuted && clampedVolume > 0) {
        api.setAudioMute(false);
      }
    },
    [isMuted]
  );

  const increaseVolume = useCallback(() => {
    updateVolume(volume + VOLUME_STEP);
  }, [volume, updateVolume]);

  const decreaseVolume = useCallback(() => {
    updateVolume(volume - VOLUME_STEP);
  }, [volume, updateVolume]);

  const toggleMute = useCallback(() => {
    api.setAudioMute(!isMuted);
  }, [isMuted]);

  const value = {
    volume,
    isMuted,
    isLoading,
    setVolume: updateVolume,
    increaseVolume,
    decreaseVolume,
    toggleMute,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
};
