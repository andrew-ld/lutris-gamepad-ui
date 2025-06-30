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
  }, []);

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

  const updateVolume = useCallback((volumePercent) => {
    const clampedVolume = Math.max(0, Math.min(100, volumePercent));
    api.setAudioVolume(clampedVolume);
    setIsMuted((currentMuteState) => {
      if (currentMuteState && clampedVolume > 0) {
        api.setAudioMute(false);
      }
      return currentMuteState;
    });
  }, []);

  const increaseVolume = useCallback(() => {
    setVolume((currentVolume) => {
      updateVolume(currentVolume + VOLUME_STEP);
      return currentVolume;
    });
  }, [updateVolume]);

  const decreaseVolume = useCallback(() => {
    setVolume((currentVolume) => {
      updateVolume(currentVolume - VOLUME_STEP);
      return currentVolume;
    });
  }, [updateVolume]);

  const toggleMute = useCallback(() => {
    setIsMuted((currentMuteState) => {
      api.setAudioMute(!currentMuteState);
      return currentMuteState;
    });
  }, []);

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
