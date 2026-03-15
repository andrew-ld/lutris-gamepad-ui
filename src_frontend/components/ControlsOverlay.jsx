import React from "react";

import "../styles/ControlsOverlay.css";
import { useTranslation } from "../contexts/TranslationContext";

import LegendaContainer from "./LegendaContainer";

const ControlsOverlay = ({
  children,
  onCloseRunningGame,
  onLaunchGame,
  onClearSearch,
  onShowSearchModal,
  onShowGameSettings,
  onOpenSystemMenu,
  onToggleGamePause,
  onPrevCategory,
  onNextCategory,
  isGamePaused,
}) => {
  const { t } = useTranslation();
  const legendItems = [];

  if (onPrevCategory && onNextCategory) {
    legendItems.push({ button: "L1", label: t("Prev") });
    legendItems.push({ button: "R1", label: t("Next") });
  }

  if (onCloseRunningGame) {
    legendItems.push({ button: "Super", label: t("Toggle Overlay") });

    if (onToggleGamePause) {
      legendItems.push({
        button: "X",
        label: isGamePaused ? t("Resume Game") : t("Pause Game"),
        onClick: onToggleGamePause,
      });
    }

    legendItems.push({
      button: "B",
      label: t("Force close"),
      onClick: onCloseRunningGame,
    });
  }

  if (onLaunchGame) {
    legendItems.push({
      button: "A",
      label: t("Launch Game"),
      onClick: onLaunchGame,
    });
  }

  if (onShowGameSettings) {
    legendItems.push({
      button: "Start",
      label: t("Options"),
      onClick: onShowGameSettings,
    });
  }

  if (onClearSearch) {
    legendItems.push({
      button: "B",
      label: t("Clear Search"),
      onClick: onClearSearch,
    });
  }

  if (onShowSearchModal) {
    legendItems.push({
      button: "X",
      label: t("Search"),
      onClick: onShowSearchModal,
    });
  }

  if (onOpenSystemMenu) {
    legendItems.push({
      button: "Y",
      label: t("Power"),
      onClick: onOpenSystemMenu,
    });
  }

  return (
    <div className="controls-overlay-wrapper">
      <LegendaContainer legendItems={legendItems}>{children}</LegendaContainer>
    </div>
  );
};

export default React.memo(ControlsOverlay);
