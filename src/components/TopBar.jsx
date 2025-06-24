import { useState, useEffect } from "react";
import { useInput } from "../contexts/InputContext";
import "../styles/TopBar.css";

const TopBar = () => {
  const [currentTime, setCurrentTime] = useState("");
  const { gamepadCount } = useInput();

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateClock();
    const timerId = setInterval(updateClock, 1000);

    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="top-bar">
      <div className="top-bar-content">
        <span className="top-bar-item top-bar-time">{currentTime}</span>
        <span className="top-bar-item top-bar-separator">|</span>
        <span className="top-bar-item top-bar-gamepads">
          🎮 {gamepadCount !== undefined ? gamepadCount : "N/A"}
        </span>
      </div>
    </div>
  );
};

export default TopBar;
