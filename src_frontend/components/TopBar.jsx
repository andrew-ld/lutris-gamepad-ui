import { useState, useEffect } from "react";

import packageJson from "../../package.json";
import { useAudio } from "../contexts/AudioContext";
import { useInput } from "../contexts/InputContext";
import { useTranslation } from "../contexts/TranslationContext";
import "../styles/TopBar.css";
import { useStaticSettings } from "../hooks/useStaticSettings";

const AudioIndicator = () => {
  const { t } = useTranslation();
  const { volume, isMuted, isLoading: audioIsLoading } = useAudio();

  if (audioIsLoading) return null;

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return "🔇";
    if (volume < 33) return "🔈";
    if (volume < 66) return "🔉";
    return "🔊";
  };

  return (
    <>
      <span className="top-bar-item top-bar-separator">|</span>
      <span className="top-bar-item top-bar-volume">
        {getVolumeIcon()} {isMuted ? t("Muted") : `${volume}%`}
      </span>
    </>
  );
};

const TopBar = () => {
  const { t } = useTranslation();
  const { gamepadCount } = useInput();
  const { staticSettings } = useStaticSettings();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [time, setTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    const timerId = setInterval(updateClock, 1000);

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    globalThis.addEventListener("online", updateOnlineStatus);
    globalThis.addEventListener("offline", updateOnlineStatus);

    return () => {
      clearInterval(timerId);
      globalThis.removeEventListener("online", updateOnlineStatus);
      globalThis.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const getNetworkIndicator = () => {
    return isOnline ? "📶" : `❌ ${t("Offline")}`;
  };

  const isAudioDisabled = staticSettings.DISABLE_AUDIO_SETTINGS;

  return (
    <div className="top-bar">
      <div className="top-bar-content">
        <span className="top-bar-item top-bar-time">{time}</span>
        <span className="top-bar-item top-bar-separator">|</span>
        <span className="top-bar-item top-bar-gamepads">
          🎮 {gamepadCount > 0 ? gamepadCount : "N/A"}
        </span>

        {!isAudioDisabled && <AudioIndicator />}

        <span className="top-bar-item top-bar-separator">|</span>
        <span className="top-bar-item">{getNetworkIndicator()}</span>
        <span className="top-bar-item top-bar-separator">|</span>
        <span className="top-bar-item">v{packageJson.version}</span>
      </div>
    </div>
  );
};

export default TopBar;
