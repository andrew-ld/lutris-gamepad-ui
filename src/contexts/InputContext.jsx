import { createContext, useContext, useState, useEffect, useRef } from "react";

const KEY_MAP = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  x: "X",
  b: "B",
  y: "Y",
  a: "A",
};

const GAMEPAD_BUTTON_MAP = {
  0: "A",
  1: "B",
  2: "X",
  3: "Y",
  12: "UP",
  13: "DOWN",
  14: "LEFT",
  15: "RIGHT",
};

const InputContext = createContext(null);
export const useInput = () => useContext(InputContext);

export const InputProvider = ({ children }) => {
  const [lastInput, setLastInput] = useState(null);

  const setLastInputSafe = (input) => {
    if (document.hasFocus() || !input) {
      setLastInput(input);
    }
  };

  const prevButtonState = useRef({});
  const animationFrameId = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const actionName = KEY_MAP[event.key];
      if (actionName) {
        event.preventDefault();
        setLastInputSafe({
          type: "key",
          name: actionName,
          timestamp: Date.now(),
        });
      }
    };
    const handleKeyUp = (_event) => {
      setLastInputSafe();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const pollGamepads = () => {
      const buttons = {};

      for (const gp of navigator.getGamepads()) {
        if (!gp) {
          continue;
        }

        for (let i = 0; i < gp.buttons.length; i++) {
          buttons[i] = buttons[i] || gp.buttons[i].pressed;
        }
      }

      for (const [button, pressed] of Object.entries(buttons)) {
        const prevButtonPressed = prevButtonState.current[button];

        if (pressed && !prevButtonPressed) {
          const actionName = GAMEPAD_BUTTON_MAP[button];
          if (actionName) {
            setLastInputSafe({
              type: "gamepad",
              name: actionName,
              timestamp: Date.now(),
            });
            break;
          }
        }
      }

      prevButtonState.current = buttons;
      animationFrameId.current = requestAnimationFrame(pollGamepads);
    };

    const handleGamepadConnected = () => {
      if (!animationFrameId.current) {
        console.log("InputProvider: Gamepad polling started.");
        animationFrameId.current = requestAnimationFrame(pollGamepads);
      }
    };

    const handleGamepadDisconnected = () => {
      if (navigator.getGamepads().filter((g) => g).length === 0) {
        console.log("InputProvider: Gamepad polling stopped.");
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
    if (navigator.getGamepads().filter((g) => g).length > 0) {
      handleGamepadConnected();
    }

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener(
        "gamepaddisconnected",
        handleGamepadDisconnected
      );
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <InputContext.Provider value={lastInput}>{children}</InputContext.Provider>
  );
};
