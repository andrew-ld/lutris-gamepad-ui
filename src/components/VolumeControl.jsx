import { useState, useEffect, useCallback, useMemo } from "react";
import { useAudio } from "../contexts/AudioContext";
import { useScopedInput } from "../hooks/useScopedInput";
import "../styles/VolumeControl.css";
import { playActionSound } from "../utils/sound";
import LegendaContainer from "./LegendaContainer";

export const VolumeControlFocusID = "VolumeControl";

const CONTROL_TYPES = {
  MUTE: "MUTE",
  VOLUME: "VOLUME",
  OUTPUT_DEVICE: "OUTPUT_DEVICE",
};

const CONTROL_ORDER = [
  CONTROL_TYPES.MUTE,
  CONTROL_TYPES.VOLUME,
  CONTROL_TYPES.OUTPUT_DEVICE,
];

const VolumeControl = ({ onClose }) => {
  const {
    volume,
    isMuted,
    increaseVolume,
    decreaseVolume,
    toggleMute,
    isLoading: isAudioLoading,
    defaultSinkName,
    availableSinks,
    setDefaultSink,
  } = useAudio();

  const [focusedControlType, setFocusedControlType] = useState(
    CONTROL_ORDER[0]
  );
  const [highlightedSinkIndex, setHighlightedSinkIndex] = useState(0);

  useEffect(() => {
    if (availableSinks && availableSinks.length > 0) {
      const currentDefaultIndex = defaultSinkName
        ? availableSinks.findIndex((sink) => sink.name === defaultSinkName)
        : -1;
      setHighlightedSinkIndex(
        currentDefaultIndex !== -1 ? currentDefaultIndex : 0
      );
    } else {
      setHighlightedSinkIndex(0);
    }
  }, [availableSinks, defaultSinkName]);

  const handleNavigation = useCallback(
    (direction) => {
      const currentIndex = CONTROL_ORDER.indexOf(focusedControlType);
      let nextIndex;
      if (direction === "UP") {
        nextIndex = Math.max(0, currentIndex - 1);
      } else {
        nextIndex = Math.min(CONTROL_ORDER.length - 1, currentIndex + 1);
      }
      if (currentIndex !== nextIndex) {
        setFocusedControlType(CONTROL_ORDER[nextIndex]);
      }
    },
    [focusedControlType]
  );

  const handleAction = useCallback(
    (actionName) => {
      switch (focusedControlType) {
        case CONTROL_TYPES.MUTE:
          if (actionName === "A") toggleMute();
          break;
        case CONTROL_TYPES.VOLUME:
          if (actionName === "LEFT") decreaseVolume();
          else if (actionName === "RIGHT") increaseVolume();
          break;
        case CONTROL_TYPES.OUTPUT_DEVICE:
          if (availableSinks && availableSinks.length > 0) {
            if (actionName === "LEFT") {
              setHighlightedSinkIndex((prev) => Math.max(0, prev - 1));
            } else if (actionName === "RIGHT") {
              setHighlightedSinkIndex((prev) =>
                Math.min(availableSinks.length - 1, prev + 1)
              );
            } else if (actionName === "A") {
              const selectedSink = availableSinks[highlightedSinkIndex];
              if (selectedSink) setDefaultSink(selectedSink.name);
            }
          }
          break;
        default:
          break;
      }
    },
    [
      focusedControlType,
      toggleMute,
      decreaseVolume,
      increaseVolume,
      availableSinks,
      highlightedSinkIndex,
      setDefaultSink,
    ]
  );

  const inputHandler = useCallback(
    (input) => {
      if (isAudioLoading) {
        if (input.name === "B") {
          playActionSound();
          onClose();
        }
        return;
      }

      playActionSound();

      switch (input.name) {
        case "UP":
        case "DOWN":
          handleNavigation(input.name);
          break;
        case "LEFT":
        case "RIGHT":
        case "A":
          handleAction(input.name);
          break;
        case "B":
          onClose();
          break;
        default:
          break;
      }
    },
    [isAudioLoading, handleNavigation, handleAction, onClose]
  );

  useScopedInput(inputHandler, VolumeControlFocusID);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const currentHighlightedSink =
    availableSinks?.length > 0 && highlightedSinkIndex < availableSinks.length
      ? availableSinks[highlightedSinkIndex]
      : null;

  const currentDefaultSinkObject =
    defaultSinkName && availableSinks?.find((s) => s.name === defaultSinkName);

  const handleSetDeviceClick = useCallback(() => {
    if (currentHighlightedSink) {
      setDefaultSink(currentHighlightedSink.name);
    }
  }, [currentHighlightedSink, setDefaultSink]);

  const handlePrevSink = useCallback(() => {
    setHighlightedSinkIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextSink = useCallback(() => {
    if (availableSinks && availableSinks.length > 0) {
      setHighlightedSinkIndex((prev) =>
        Math.min(availableSinks.length - 1, prev + 1)
      );
    }
  }, [availableSinks]);

  const legendItems = useMemo(() => {
    const items = [];
    if (focusedControlType === CONTROL_TYPES.MUTE) {
      items.push({
        button: "A",
        label: isMuted ? "Unmute" : "Mute",
        onClick: toggleMute,
      });
    } else if (focusedControlType === CONTROL_TYPES.VOLUME) {
      items.push({
        button: "LEFT",
        label: "Decrease",
        onClick: decreaseVolume,
      });
      items.push({
        button: "RIGHT",
        label: "Increase",
        onClick: increaseVolume,
      });
    } else if (
      focusedControlType === CONTROL_TYPES.OUTPUT_DEVICE &&
      availableSinks?.length > 0
    ) {
      items.push({
        button: "LEFT",
        label: "Prev",
        onClick: handlePrevSink,
      });
      items.push({
        button: "RIGHT",
        label: "Next",
        onClick: handleNextSink,
      });
      if (currentHighlightedSink) {
        items.push({
          button: "A",
          label: "Set Device",
          onClick: handleSetDeviceClick,
        });
      }
    }
    items.push({ button: "B", label: "Close", onClick: handleClose });
    return items;
  }, [
    focusedControlType,
    isMuted,
    toggleMute,
    decreaseVolume,
    increaseVolume,
    availableSinks,
    currentHighlightedSink,
    handlePrevSink,
    handleNextSink,
    handleSetDeviceClick,
    handleClose,
  ]);

  if (isAudioLoading && (!availableSinks || availableSinks.length === 0)) {
    const loadingLegendItems = [
      { button: "B", label: "Close", onClick: handleClose },
    ];
    return (
      <div className="volume-control-container">
        <LegendaContainer legendItems={loadingLegendItems}>
          <div style={{ padding: "24px 0", margin: 0 }}>
            <p className="volume-control-title">Loading Audio Settings...</p>
          </div>
        </LegendaContainer>
      </div>
    );
  }

  return (
    <div className="volume-control-container">
      <LegendaContainer legendItems={legendItems}>
        <div>
          <h2 className="volume-control-title">Audio Settings</h2>

          <div
            className={`volume-control-item ${
              focusedControlType === CONTROL_TYPES.MUTE ? "focused" : ""
            }`}
          >
            <span className="volume-control-label">Mute</span>
            <button className="mute-button" onClick={toggleMute}>
              {isMuted ? "Unmute" : "Mute"}
            </button>
          </div>

          <div
            className={`volume-control-item ${
              focusedControlType === CONTROL_TYPES.VOLUME ? "focused" : ""
            }`}
          >
            <span className="volume-control-label">Volume</span>
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

          {currentDefaultSinkObject && (
            <div className="volume-control-current-sink-display">
              <span className="volume-control-label">Current Output:</span>
              <span
                className="current-sink-name"
                title={currentDefaultSinkObject.description}
              >
                {currentDefaultSinkObject.description}
              </span>
            </div>
          )}

          <div
            className={`volume-control-item ${
              focusedControlType === CONTROL_TYPES.OUTPUT_DEVICE
                ? "focused"
                : ""
            }`}
          >
            <span className="volume-control-label">Select Output</span>
            <div className="output-device-selector">
              {currentHighlightedSink ? (
                <>
                  <span
                    className="output-device-name"
                    title={currentHighlightedSink.description}
                  >
                    {currentHighlightedSink.description}
                  </span>
                  <span className="output-device-count">
                    ({highlightedSinkIndex + 1}/{availableSinks.length})
                  </span>
                </>
              ) : (
                <span className="output-device-name">No devices found</span>
              )}
            </div>
          </div>
        </div>
      </LegendaContainer>
    </div>
  );
};

export default VolumeControl;
