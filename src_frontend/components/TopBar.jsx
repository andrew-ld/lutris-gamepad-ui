import { useState, useEffect, useRef } from "react";

import packageJson from "../../package.json";
import { useAudio } from "../contexts/AudioContext";
import { useInput } from "../contexts/InputContext";
import { useTranslation } from "../contexts/TranslationContext";

import "../styles/TopBar.css";

const TopBar = () => {
  const { t } = useTranslation();
  const { gamepadCount } = useInput();
  const { volume, isMuted, isLoading: audioIsLoading } = useAudio();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const timeReference = useRef(null);

  useEffect(() => {
    const updateClock = () => {
      if (timeReference.current) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        timeReference.current.textContent = `${hours}:${minutes}:${seconds}`;
      }
    };

    updateClock();
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

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return "🔇";
    if (volume < 33) return "🔈";
    if (volume < 66) return "🔉";
    return "🔊";
  };

  const getNetworkIndicator = () => {
    return isOnline ? "📶" : `❌ ${t("Offline")}`;
  };

  return (
    <div className="top-bar">
      <div className="top-bar-content">
        <span className="top-bar-item top-bar-time" ref={timeReference}></span>
        <span className="top-bar-item top-bar-separator">|</span>
        <span className="top-bar-item top-bar-gamepads">
          🎮 {gamepadCount > 0 ? gamepadCount : "N/A"}
        </span>
        {!audioIsLoading && (
          <>
            <span className="top-bar-item top-bar-separator">|</span>
            <span className="top-bar-item top-bar-volume">
              {getVolumeIcon()} {isMuted ? t("Muted") : `${volume}%`}
            </span>
          </>
        )}
        <span className="top-bar-item top-bar-separator">|</span>
        <span className="top-bar-item">{getNetworkIndicator()}</span>
        <span className="top-bar-item top-bar-separator">|</span>
        <span className="top-bar-item">v{packageJson.version}</span>
      </div>
    </div>
  );
};

export default TopBar;
