import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as ipc from "../utils/ipc";
import { useIsMounted } from "../hooks/useIsMounted";

const AudioContext = createContext(null);
export const useAudio = () => useContext(AudioContext);

const VOLUME_STEP = 5;

export const AudioProvider = ({ children }) => {
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultSinkName, setDefaultSinkName] = useState(null);
  const [availableSinks, setAvailableSinks] = useState([]);
  const isMounted = useIsMounted();

  const processAudioInfo = (info) => {
    if (!info) {
      setIsLoading(false);
      return;
    }
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
    try {
      const info = await ipc.getAudioInfo();
      if (isMounted()) {
        processAudioInfo(info);
      }
    } catch (err) {
      ipc.logError("Failed to fetch initial audio info:", err);
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    fetchAudioInfo();

    const handleAudioInfoChanged = (info) => {
      processAudioInfo(info);
    };

    const unsubscribe = ipc.onAudioInfoChanged(handleAudioInfoChanged);

    return () => {
      unsubscribe();
    };
  }, [fetchAudioInfo]);

  const updateVolume = useCallback(
    (volumePercent) => {
      const clampedVolume = Math.max(0, Math.min(100, volumePercent));
      ipc.setAudioVolume(clampedVolume);
      if (isMuted && clampedVolume > 0) {
        ipc.setAudioMute(false);
      }
    },
    [isMuted]
  );

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
    ipc.setAudioMute(!isMuted);
  }, [isMuted]);

  const setDefaultSink = useCallback((sinkName) => {
    ipc.setDefaultSink(sinkName);
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
