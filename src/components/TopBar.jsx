import { useState, useEffect } from "react";
import { useInput } from "../contexts/InputContext";
import { useAudio } from "../contexts/AudioContext";
import "../styles/TopBar.css";

const TopBar = () => {
  const { gamepadCount } = useInput();
  const { volume, isMuted, isLoading: audioIsLoading } = useAudio();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    updateClock();
    const timerId = setInterval(updateClock, 1000);

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      clearInterval(timerId);
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [setIsOnline, setCurrentTime]);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return "🔇";
    if (volume < 33) return "🔈";
    if (volume < 66) return "🔉";
    return "🔊";
  };

  const getNetworkIndicator = () => {
    return isOnline ? "📶" : "❌ Offline";
  };

  return (
    <div className="top-bar">
      <div className="top-bar-content">
        <span className="top-bar-item top-bar-time">{currentTime}</span>
        <span className="top-bar-item top-bar-separator">|</span>
        <span className="top-bar-item top-bar-gamepads">
          🎮 {gamepadCount > 0 ? gamepadCount : "N/A"}
        </span>
        {!audioIsLoading && (
          <>
            <span className="top-bar-item top-bar-separator">|</span>
            <span className="top-bar-item top-bar-volume">
              {getVolumeIcon()} {isMuted ? "Muted" : `${volume}%`}
            </span>
          </>
        )}
        <span className="top-bar-item top-bar-separator">|</span>
        <span className="top-bar-item">{getNetworkIndicator()}</span>
      </div>
    </div>
  );
};

export default TopBar;
