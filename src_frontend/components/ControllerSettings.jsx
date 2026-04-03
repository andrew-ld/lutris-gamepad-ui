import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "../contexts/TranslationContext";
import * as api from "../utils/ipc";

import ControllerTester from "./ControllerTester";
import DialogLayout from "./DialogLayout";
import FocusableRow from "./FocusableRow";
import LoadingIndicator from "./LoadingIndicator";
import RowBasedMenu from "./RowBasedMenu";

import "../styles/ControllerSettings.css";

export const ControllerSettingsFocusId = "ControllerSettings";
const ControllerDetailFocusId = "ControllerDetail";

const INPUT_MODES = ["native", "xinput"];

/* ── Detail view for a single controller ── */

const ControllerDetail = ({ controller, onBack }) => {
  const { t } = useTranslation();
  const [inputMode, setInputMode] = useState("native");
  const [showTester, setShowTester] = useState(false);
  const scrollParentReference = useRef(null);

  useEffect(() => {
    api.getAppConfig().then((cfg) => {
      if (cfg?.controllerInputMode) {
        setInputMode(cfg.controllerInputMode);
      }
    });
  }, []);

  const cycleInputMode = useCallback(() => {
    setInputMode((prev) => {
      const next =
        INPUT_MODES[(INPUT_MODES.indexOf(prev) + 1) % INPUT_MODES.length];
      api.setAppConfig("controllerInputMode", next);
      return next;
    });
  }, []);

  const handleAction = useCallback(
    (actionName, item) => {
      if (actionName === "B") {
        onBack();
        return;
      }
      if (actionName === "A" && item) {
        if (item.id === "input-mode") {
          cycleInputMode();
        } else if (item.id === "test-controller") {
          setShowTester(true);
        }
      }
    },
    [onBack, cycleInputMode],
  );

  const modeLabel = inputMode === "native" ? t("Native") : t("Xinput");

  const menuItems = useMemo(
    () => [
      {
        id: "input-mode",
        label: t("Input Mode"),
        value: modeLabel,
      },
      {
        id: "test-controller",
        label: t("Test Controller"),
      },
    ],
    [modeLabel, t],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => (
      <FocusableRow
        key={item.id}
        isFocused={isFocused}
        onMouseEnter={onMouseEnter}
      >
        <div className="cs-row-content">
          <span className="cs-row-label">{item.label}</span>
          {item.value && <span className="cs-row-value">{item.value}</span>}
        </div>
      </FocusableRow>
    ),
    [],
  );

  const legendItems = useMemo(
    () => [
      { button: "A", label: t("Select") },
      { button: "B", label: t("Back") },
    ],
    [t],
  );

  if (showTester) {
    return (
      <ControllerTester
        controllerIndex={controller.index}
        onClose={() => setShowTester(false)}
      />
    );
  }

  return (
    <DialogLayout
      title={controller.name}
      legendItems={legendItems}
      maxWidth="600px"
      contentRef={scrollParentReference}
    >
      <RowBasedMenu
        items={menuItems}
        renderItem={renderItem}
        onAction={handleAction}
        focusId={ControllerDetailFocusId}
        itemKey={(item) => item.id}
        scrollParentRef={scrollParentReference}
      />
    </DialogLayout>
  );
};

/* ── Controller list (top-level) ── */

const ControllerSettings = ({ onClose }) => {
  const { t } = useTranslation();
  const [controllers, setControllers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedController, setSelectedController] = useState(null);
  const currentMenuItem = useRef(null);
  const scrollParentReference = useRef(null);

  const fetchControllers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.listControllers();
      setControllers(result || []);
    } catch {
      setControllers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchControllers();
  }, [fetchControllers]);

  const handleAction = useCallback(
    (actionName, item) => {
      switch (actionName) {
        case "A": {
          if (item?.controller) {
            setSelectedController(item.controller);
          }
          break;
        }
        case "B": {
          onClose();
          break;
        }
        case "Y": {
          fetchControllers();
          break;
        }
      }
    },
    [onClose, fetchControllers],
  );

  const menuItems = useMemo(
    () =>
      controllers.map((controller) => ({
        id: `controller-${controller.index}`,
        label: controller.name,
        controller,
      })),
    [controllers],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => (
      <FocusableRow
        key={item.id}
        isFocused={isFocused}
        onMouseEnter={onMouseEnter}
      >
        <div className="cs-row-content">
          <span className="cs-row-icon">🎮</span>
          <span className="cs-row-label">{item.label}</span>
        </div>
      </FocusableRow>
    ),
    [],
  );

  const legendItems = useMemo(
    () => [
      { button: "A", label: t("Select") },
      { button: "Y", label: t("Refresh"), onClick: fetchControllers },
      { button: "B", label: t("Close"), onClick: onClose },
    ],
    [onClose, fetchControllers, t],
  );

  if (selectedController) {
    return (
      <ControllerDetail
        controller={selectedController}
        onBack={() => setSelectedController(null)}
      />
    );
  }

  return (
    <DialogLayout
      title={t("Controller Settings")}
      legendItems={legendItems}
      maxWidth="600px"
      contentRef={scrollParentReference}
    >
      {isLoading ? (
        <div className="cs-loading">
          <LoadingIndicator />
        </div>
      ) : (
        <RowBasedMenu
          items={menuItems}
          renderItem={renderItem}
          onAction={handleAction}
          focusId={ControllerSettingsFocusId}
          itemKey={(item) => item.id}
          onFocusChange={(item) => {
            currentMenuItem.current = item;
          }}
          scrollParentRef={scrollParentReference}
          emptyMessage={t("No controllers detected.")}
        />
      )}
    </DialogLayout>
  );
};

export default ControllerSettings;
