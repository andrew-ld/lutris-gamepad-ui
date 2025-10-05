import { useState, useEffect, useCallback, useMemo } from "react";
import { useAudio } from "../contexts/AudioContext";
import "../styles/VolumeControl.css";
import LegendaContainer from "./LegendaContainer";
import RowBasedMenu from "./RowBasedMenu";
import FocusableRow from "./FocusableRow";
import { useTranslation } from "../contexts/TranslationContext";
import ToggleButton from "./ToggleButton";

export const VolumeControlFocusID = "VolumeControl";

const CONTROL_TYPES = {
  MUTE: "MUTE",
  VOLUME: "VOLUME",
  OUTPUT_DEVICE: "OUTPUT_DEVICE",
};

const VolumeControl = ({ onClose }) => {
  const { t } = useTranslation();
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

  const [highlightedSinkIndex, setHighlightedSinkIndex] = useState(0);
  const [focusedItem, setFocusedItem] = useState(null);

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

  const menuItems = useMemo(
    () => [
      { type: CONTROL_TYPES.MUTE, label: t("Mute") },
      { type: CONTROL_TYPES.VOLUME, label: t("Volume") },
      { type: CONTROL_TYPES.OUTPUT_DEVICE, label: t("Select Output") },
    ],
    [t]
  );

  const handleAction = useCallback(
    (actionName, item) => {
      if (actionName === "B") {
        onClose();
        return;
      }

      switch (item.type) {
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
      }
    },
    [
      toggleMute,
      decreaseVolume,
      increaseVolume,
      availableSinks,
      highlightedSinkIndex,
      setDefaultSink,
      onClose,
    ]
  );

  const handleFocusChange = useCallback((item) => {
    setFocusedItem(item);
  }, []);

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => {
      return (
        <FocusableRow
          key={item.type}
          isFocused={isFocused}
          onMouseEnter={onMouseEnter}
          onClick={item.type === CONTROL_TYPES.MUTE ? toggleMute : undefined}
        >
          <span className="volume-control-label">{item.label}</span>
          {item.type === CONTROL_TYPES.MUTE && (
            <ToggleButton
              isToggledOn={isMuted}
              labelOn={t("Unmute")}
              labelOff={t("Mute")}
              onClick={toggleMute}
            />
          )}
          {item.type === CONTROL_TYPES.VOLUME && (
            <div className="volume-bar-display">
              <div className="volume-bar-container">
                <div
                  className="volume-bar-fill"
                  style={{ width: `${isMuted ? 0 : volume}%` }}
                ></div>
              </div>
              <span className="volume-control-value">{`${volume}%`}</span>
            </div>
          )}
          {item.type === CONTROL_TYPES.OUTPUT_DEVICE && (
            <div className="output-device-selector">
              {availableSinks?.length > 0 ? (
                <>
                  <span
                    className="output-device-name"
                    title={availableSinks[highlightedSinkIndex]?.description}
                  >
                    {availableSinks[highlightedSinkIndex]?.description}
                  </span>
                  <span className="output-device-count">
                    ({highlightedSinkIndex + 1}/{availableSinks.length})
                  </span>
                </>
              ) : (
                <span className="output-device-name">
                  {t("No devices found")}
                </span>
              )}
            </div>
          )}
        </FocusableRow>
      );
    },
    [volume, isMuted, toggleMute, availableSinks, highlightedSinkIndex, t]
  );

  const legendItems = useMemo(() => {
    const items = [];
    if (!focusedItem)
      return [{ button: "B", label: t("Close"), onClick: onClose }];

    switch (focusedItem.type) {
      case CONTROL_TYPES.MUTE:
        items.push({
          button: "A",
          label: isMuted ? t("Unmute") : t("Mute"),
          onClick: toggleMute,
        });
        break;
      case CONTROL_TYPES.VOLUME:
        items.push({
          button: "LEFT",
          label: t("Decrease"),
          onClick: decreaseVolume,
        });
        items.push({
          button: "RIGHT",
          label: t("Increase"),
          onClick: increaseVolume,
        });
        break;
      case CONTROL_TYPES.OUTPUT_DEVICE:
        if (availableSinks?.length > 1) {
          items.push({ button: "LEFT", label: t("Prev") });
          items.push({ button: "RIGHT", label: t("Next") });
        }
        if (availableSinks?.length > 0) {
          items.push({ button: "A", label: t("Set Device") });
        }
        break;
    }
    items.push({ button: "B", label: t("Close"), onClick: onClose });
    return items;
  }, [
    focusedItem,
    isMuted,
    toggleMute,
    decreaseVolume,
    increaseVolume,
    availableSinks,
    onClose,
    t,
  ]);

  const currentDefaultSinkObject =
    defaultSinkName && availableSinks?.find((s) => s.name === defaultSinkName);

  if (isAudioLoading && (!availableSinks || availableSinks.length === 0)) {
    return (
      <div className="volume-control-container">
        <LegendaContainer
          legendItems={[{ button: "B", label: t("Close"), onClick: onClose }]}
        >
          <div style={{ padding: "24px 0", margin: 0 }}>
            <p className="volume-control-title">
              {t("Loading Audio Settings...")}
            </p>
          </div>
        </LegendaContainer>
      </div>
    );
  }

  return (
    <div className="volume-control-container">
      <LegendaContainer legendItems={legendItems}>
        <div>
          <h2 className="volume-control-title">{t("Audio Settings")}</h2>
          {currentDefaultSinkObject && (
            <div className="volume-control-current-sink-display">
              <span className="volume-control-label">
                {t("Current Output:")}
              </span>
              <span
                className="current-sink-name"
                title={currentDefaultSinkObject.description}
              >
                {currentDefaultSinkObject.description}
              </span>
            </div>
          )}
          <RowBasedMenu
            items={menuItems}
            renderItem={renderItem}
            onAction={handleAction}
            focusId={VolumeControlFocusID}
            onFocusChange={handleFocusChange}
          />
        </div>
      </LegendaContainer>
    </div>
  );
};

export default VolumeControl;
