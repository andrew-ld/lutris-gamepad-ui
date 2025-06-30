import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as api from "../utils/ipc";

const AudioContext = createContext(null);
export const useAudio = () => useContext(AudioContext);

const VOLUME_STEP = 5;

export const AudioProvider = ({ children }) => {
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultSinkName, setDefaultSinkName] = useState(null);
  const [availableSinks, setAvailableSinks] = useState([]);

  const processAudioInfo = (info) => {
    setVolume(info.volume);
    setIsMuted(info.isMuted);
    setDefaultSinkName(info.name);

    const sortedSinks = (info.availableSinks || []).slice().sort((a, b) => {
      const descA = a.description;
      const descB = b.description;
      return descA.localeCompare(descB);
    });

    setAvailableSinks(sortedSinks);
    setIsLoading(false);
  };

  const fetchAudioInfo = useCallback(async () => {
    const info = await api.getAudioInfo();
    if (!info) {
      return;
    }
    console.log("[AudioContext] Fetched audio info:", info);
    processAudioInfo(info);
  }, [
    setIsLoading,
    setVolume,
    setIsMuted,
    setDefaultSinkName,
    setAvailableSinks,
  ]);

  useEffect(() => {
    fetchAudioInfo();

    const handleAudioInfoChanged = (info) => {
      console.log("[IPC] Received audio-info-changed", info);
      processAudioInfo(info);
    };

    window.electronAPI.onAudioInfoChanged(handleAudioInfoChanged);

    return () => {
      window.electronAPI.removeAllListeners("audio-info-changed");
    };
  }, [fetchAudioInfo]);

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

  const setDefaultSink = useCallback((sinkName) => {
    api.setDefaultSink(sinkName);
  }, []);

  const value = {
    volume,
    isMuted,
    isLoading,
    defaultSinkName,
    availableSinks,
    setVolume: updateVolume,
    increaseVolume,
    decreaseVolume,
    toggleMute,
    setDefaultSink,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
};
