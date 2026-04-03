import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "../contexts/TranslationContext";
import { useScopedInput } from "../hooks/useScopedInput";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";

import "../styles/ControllerTester.css";

const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  HOME: 16,
};

function getButtonValue(state, index) {
  return state?.buttons?.[index]?.value ?? 0;
}

function isPressed(state, index) {
  return state?.buttons?.[index]?.pressed ?? false;
}

function getAxis(state, index) {
  return state?.axes?.[index] ?? 0;
}

const AnalogStick = ({ x, y, pressed, label }) => {
  const knobX = 50 + x * 36;
  const knobY = 50 + y * 36;
  return (
    <div className="ct-stick-wrapper">
      <div className={`ct-stick-area${pressed ? " pressed" : ""}`}>
        <div className="ct-stick-crosshair-h" />
        <div className="ct-stick-crosshair-v" />
        <div
          className={`ct-stick-knob${pressed ? " pressed" : ""}`}
          style={{ left: `${knobX}%`, top: `${knobY}%` }}
        />
      </div>
      <span className="ct-label">{label}</span>
    </div>
  );
};

const TriggerBar = ({ value, label, side }) => (
  <div className={`ct-trigger-wrapper ct-trigger-${side}`}>
    <span className="ct-label">{label}</span>
    <div className="ct-trigger-track">
      <div className="ct-trigger-fill" style={{ width: `${value * 100}%` }} />
    </div>
    <span className="ct-trigger-pct">{Math.round(value * 100)}%</span>
  </div>
);

const ShoulderButton = ({ pressed, label }) => (
  <div className={`ct-shoulder${pressed ? " pressed" : ""}`}>{label}</div>
);

const FaceButton = ({ pressed, label, color }) => (
  <div
    className={`ct-face-btn${pressed ? " pressed" : ""}`}
    style={
      pressed
        ? { background: color, borderColor: color }
        : { borderColor: `${color}88` }
    }
  >
    <span style={{ color: pressed ? "#fff" : color }}>{label}</span>
  </div>
);

const DPad = ({ up, down, left, right }) => (
  <div className="ct-dpad">
    <div className={`ct-dpad-cell${up ? " pressed" : ""}`} />
    <div className="ct-dpad-row">
      <div className={`ct-dpad-cell${left ? " pressed" : ""}`} />
      <div className="ct-dpad-center" />
      <div className={`ct-dpad-cell${right ? " pressed" : ""}`} />
    </div>
    <div className={`ct-dpad-cell${down ? " pressed" : ""}`} />
  </div>
);

const CenterButton = ({ pressed, label }) => (
  <div className={`ct-center-btn${pressed ? " pressed" : ""}`}>{label}</div>
);

export const ControllerTesterFocusId = "ControllerTester";

const ControllerTester = ({ onClose, controllerIndex }) => {
  const { t } = useTranslation();
  const [gamepadState, setGamepadState] = useState(null);
  const rafRef = useRef(null);

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
        const gp = gamepads.find((g) => g.index === controllerIndex) ?? gamepads[0] ?? null;
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [controllerIndex]);

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
      {!s ? (
        <div className="ct-no-data">{t("Waiting for controller input...")}</div>
      ) : (
        <div className="ct-layout">
          <div className="ct-shoulders">
            <ShoulderButton pressed={isPressed(s, BTN.LB)} label="LB" />
            <ShoulderButton pressed={isPressed(s, BTN.RB)} label="RB" />
          </div>

          <div className="ct-triggers">
            <TriggerBar value={getButtonValue(s, BTN.LT)} label="LT" side="left" />
            <TriggerBar value={getButtonValue(s, BTN.RT)} label="RT" side="right" />
          </div>

          <div className="ct-main">
            <div className="ct-left-side">
              <AnalogStick
                x={getAxis(s, 0)}
                y={getAxis(s, 1)}
                pressed={isPressed(s, BTN.L3)}
                label="L"
              />
              <DPad
                up={isPressed(s, BTN.DPAD_UP)}
                down={isPressed(s, BTN.DPAD_DOWN)}
                left={isPressed(s, BTN.DPAD_LEFT)}
                right={isPressed(s, BTN.DPAD_RIGHT)}
              />
            </div>

            <div className="ct-center">
              <CenterButton pressed={isPressed(s, BTN.SELECT)} label="Select" />
              <CenterButton pressed={isPressed(s, BTN.HOME)} label="Home" />
              <CenterButton pressed={isPressed(s, BTN.START)} label="Start" />
            </div>

            <div className="ct-right-side">
              <div className="ct-face-buttons">
                <div className="ct-face-row">
                  <FaceButton pressed={isPressed(s, BTN.Y)} label="Y" color="#ffc107" />
                </div>
                <div className="ct-face-row">
                  <FaceButton pressed={isPressed(s, BTN.X)} label="X" color="#2196f3" />
                  <FaceButton pressed={isPressed(s, BTN.B)} label="B" color="#f44336" />
                </div>
                <div className="ct-face-row">
                  <FaceButton pressed={isPressed(s, BTN.A)} label="A" color="#4caf50" />
                </div>
              </div>
              <AnalogStick
                x={getAxis(s, 2)}
                y={getAxis(s, 3)}
                pressed={isPressed(s, BTN.R3)}
                label="R"
              />
            </div>
          </div>
        </div>
      )}
    </DialogLayout>
  );
};

export default ControllerTester;
