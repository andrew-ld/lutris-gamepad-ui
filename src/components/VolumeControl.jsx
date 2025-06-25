import { useState, useEffect, useRef, useCallback } from "react";
import { useAudio } from "../contexts/AudioContext";
import { useInput } from "../contexts/InputContext";
import ButtonIcon from "./ButtonIcon";
import "../styles/VolumeControl.css";
import { playActionSound } from "../utils/sound";

export const VolumeControlFocusID = "VolumeControl";

const VolumeControl = ({ onClose }) => {
  const {
    volume,
    isMuted,
    increaseVolume,
    decreaseVolume,
    toggleMute,
    isLoaded: isLoading,
  } = useAudio();
  const { lastInput, claimInputFocus, releaseInputFocus, isFocused } =
    useInput();

  const [selectedControlIndex, setSelectedControlIndex] = useState(0);
  const lastProcessedInput = useRef(null);
  const controls = ["Mute", "Volume"];

  useEffect(() => {
    claimInputFocus(VolumeControlFocusID);
    return () => releaseInputFocus(VolumeControlFocusID);
  }, [claimInputFocus, releaseInputFocus]);

  const handleAction = useCallback(() => {
    if (selectedControlIndex === 0) {
      toggleMute();
    }
  }, [selectedControlIndex, toggleMute]);

  useEffect(() => {
    if (
      !isFocused(VolumeControlFocusID) ||
      !lastInput ||
      lastInput.timestamp === lastProcessedInput.current ||
      isLoading
    ) {
      return;
    }
    lastProcessedInput.current = lastInput.timestamp;

    playActionSound();

    switch (lastInput.name) {
      case "UP":
        setSelectedControlIndex((prev) => {
          const next = Math.max(0, prev - 1);
          return next;
        });
        break;
      case "DOWN":
        setSelectedControlIndex((prev) => {
          const next = Math.min(controls.length - 1, prev + 1);
          return next;
        });
        break;
      case "LEFT":
        if (selectedControlIndex === 1) {
          decreaseVolume();
        }
        break;
      case "RIGHT":
        if (selectedControlIndex === 1) {
          increaseVolume();
        }
        break;
      case "A":
        handleAction();
        break;
      case "B":
        onClose();
        break;
      default:
        break;
    }
  }, [
    lastInput,
    isFocused,
    selectedControlIndex,
    decreaseVolume,
    increaseVolume,
    handleAction,
    onClose,
    controls.length,
    isLoading,
  ]);

  if (isLoading) {
    return (
      <div className="volume-control-container">
        <p className="volume-control-title">Loading Audio Settings...</p>
      </div>
    );
  }

  return (
    <div className="volume-control-container">
      <h2 className="volume-control-title">Audio Settings</h2>

      <div
        className={`volume-control-item ${
          selectedControlIndex === 0 ? "focused" : ""
        }`}
      >
        <span className="volume-control-label">Mute</span>
        <button className="mute-button" onClick={toggleMute}>
          {isMuted ? "Unmute" : "Mute"}
        </button>
      </div>

      <div
        className={`volume-control-item ${
          selectedControlIndex === 1 ? "focused" : ""
        }`}
      >
        <span className="volume-control-label">Volume (D-Pad L/R)</span>{" "}
        <div className="volume-bar-display">
          <div className="volume-bar-container">
            <div
              className="volume-bar-fill"
              style={{ width: `${isMuted ? 0 : volume}%` }}
            ></div>
          </div>
          <span className="volume-control-value">{`${volume}%`}</span>
        </div>
      </div>

      <div className="volume-control-footer">
        {selectedControlIndex === 0 && (
          <ButtonIcon
            button="A"
            label={isMuted ? "Unmute" : "Mute"}
            size="small"
            onClick={handleAction}
          />
        )}
        <ButtonIcon button="B" label="Close" size="small" onClick={onClose} />
      </div>
    </div>
  );
};

export default VolumeControl;
