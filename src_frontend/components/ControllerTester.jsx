import { useEffect, useMemo, useRef, useState } from "react";

import {
  MODEL_COMPONENTS,
  resolveControllerModel,
} from "../assets/controller-models/index.js";
import { useTranslation } from "../contexts/TranslationContext";
import { useScopedInput } from "../hooks/useScopedInput";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";

import "../styles/ControllerTester.css";

export const ControllerTesterFocusId = "ControllerTester";

const ControllerTester = ({ onClose, controller }) => {
  const { t } = useTranslation();
  const [gamepadState, setGamepadState] = useState(null);
  const rafRef = useRef(null);

  const modelId = useMemo(
    () => resolveControllerModel(controller),
    [controller],
  );
  const ModelComponent = MODEL_COMPONENTS[modelId] || MODEL_COMPONENTS.xbox;

  useScopedInput(
    (event) => {
      if (event.name === "B") {
        onClose();
        event.isConsumed = true;
      }
    },
    ControllerTesterFocusId,
  );

  useEffect(() => {
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const gamepads = await api.pollGamepadsSdl();
        if (!active) return;
        const gp = gamepads.find((g) => g.index === controller?.index) ?? gamepads[0] ?? null;
        setGamepadState(gp);
      } catch {
        // SDL not available — skip
      }
      if (active) {
        rafRef.current = requestAnimationFrame(poll);
      }
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => {
      active = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [controller]);

  const legendItems = useMemo(
    () => [{ button: "B", label: t("Close"), onClick: onClose }],
    [onClose, t],
  );

  const s = gamepadState;

  return (
    <DialogLayout
      title={t("Controller Test")}
      legendItems={legendItems}
      maxWidth="700px"
    >
      {s ? (
        <div className="ct-layout">
          <ModelComponent s={s} />
        </div>
      ) : (
        <div className="ct-no-data">{t("Waiting for controller input...")}</div>
      )}
    </DialogLayout>
  );
};

export default ControllerTester;
