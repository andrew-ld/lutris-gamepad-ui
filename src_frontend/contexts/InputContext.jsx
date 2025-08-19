import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { logInfo } from "../utils/ipc";

const KEY_MAP = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  a: "A",
  b: "B",
  x: "X",
  y: "Y",
};

const GAMEPAD_SUPER_BUTTON_FALLBACK = [8, 9];

const GAMEPAD_BUTTON_MAP = {
  0: "A",
  1: "B",
  2: "X",
  3: "Y",
  12: "UP",
  13: "DOWN",
  14: "LEFT",
  15: "RIGHT",
  16: "Super",
};

const ANALOG_THRESHOLD = 0.5;

const GAMEPAD_ACTION_TO_BUTTON_MAP = Object.fromEntries(
  Object.entries(GAMEPAD_BUTTON_MAP).map(([key, value]) => [value, key])
);

const applyAnalogStickAsDPad = (axes, buttons, threshold) => {
  const [axisX, axisY] = axes;

  if (Math.abs(axisY) > threshold && Math.abs(axisY) >= Math.abs(axisX)) {
    if (axisY < 0) {
      buttons[GAMEPAD_ACTION_TO_BUTTON_MAP.UP] = true;
    } else {
      buttons[GAMEPAD_ACTION_TO_BUTTON_MAP.DOWN] = true;
    }
  } else if (Math.abs(axisX) > threshold && Math.abs(axisX) > Math.abs(axisY)) {
    if (axisX < 0) {
      buttons[GAMEPAD_ACTION_TO_BUTTON_MAP.LEFT] = true;
    } else {
      buttons[GAMEPAD_ACTION_TO_BUTTON_MAP.RIGHT] = true;
    }
  }
};

const getAggregatedAxes = (gp) => {
  if (!gp || !gp.axes) {
    return [0, 0];
  }

  let dominantX = 0;
  let dominantY = 0;

  const leftX = gp.axes[0] || 0;
  const leftY = gp.axes[1] || 0;
  if (Math.abs(leftX) > Math.abs(dominantX)) dominantX = leftX;
  if (Math.abs(leftY) > Math.abs(dominantY)) dominantY = leftY;

  const rightX = gp.axes[2] || 0;
  const rightY = gp.axes[3] || 0;
  if (Math.abs(rightX) > Math.abs(dominantX)) dominantX = rightX;
  if (Math.abs(rightY) > Math.abs(dominantY)) dominantY = rightY;

  return [dominantX, dominantY];
};

const getGamepadType = (gamepad) => {
  const gamepadId = gamepad?.id?.toLowerCase();

  if (!gamepadId) {
    return null;
  }

  if (
    gamepadId.includes("playstation") ||
    gamepadId.includes("dualsense") ||
    gamepadId.includes("dualshock")
  ) {
    return "playstation";
  }

  if (gamepadId.includes("xbox")) {
    return "xbox";
  }

  return null;
};

const InputContext = createContext(null);
export const useInput = () => useContext(InputContext);

export const InputProvider = ({ children }) => {
  const listeners = useRef(new Set());
  const inputTypeListeners = useRef(new Set());
  const latestInputTypeRef = useRef("keyboard");

  const [focusStack, setFocusStack] = useState([]);
  const [gamepadCount, setGamepadCount] = useState(0);

  const focusIdCounter = useRef(0);
  const focusStackRef = useRef(focusStack);

  const prevButtonState = useRef({});
  const animationFrameId = useRef(null);

  useEffect(() => {
    focusStackRef.current = focusStack;
  }, [focusStack]);

  const subscribe = useCallback((callback) => {
    listeners.current.add(callback);
    return () => listeners.current.delete(callback);
  }, []);

  const subscribeToInputType = useCallback((callback) => {
    inputTypeListeners.current.add(callback);
    return () => inputTypeListeners.current.delete(callback);
  }, []);

  const notifyInputTypeChanged = useCallback(() => {
    for (const listener of inputTypeListeners.current) {
      listener(latestInputTypeRef.current);
    }
  }, []);

  const broadcast = useCallback((input) => {
    const eventObject = { ...input, isConsumed: false };
    [...listeners.current].forEach((cb) => cb(eventObject));
  }, []);

  const processInput = (input, inputType) => {
    if (inputType && inputType !== latestInputTypeRef.current) {
      latestInputTypeRef.current = inputType;
      notifyInputTypeChanged();
    }
    if (document.hasFocus() || !input || input?.name === "Super") {
      broadcast(input);
      return true;
    }
    return false;
  };

  const releaseFocus = useCallback((uniqueId) => {
    setFocusStack((prevStack) => {
      const newStack = prevStack.filter((f) => f.uniqueId !== uniqueId);
      return newStack;
    });
  }, []);

  const claimInputFocus = useCallback(
    (claimantId) => {
      const uniqueId = focusIdCounter.current++;
      const newFocus = { claimantId, uniqueId };

      setFocusStack((prevStack) => {
        const newStack = [...prevStack, newFocus];
        return newStack;
      });

      const token = {
        isAcquired: () => {
          const stack = focusStackRef.current;
          if (stack.length === 0) return false;
          return stack[stack.length - 1].uniqueId === uniqueId;
        },
        release: () => {
          releaseFocus(uniqueId, claimantId);
        },
      };

      return token;
    },
    [releaseFocus]
  );

  const updateGamepadCount = useCallback(() => {
    const count = navigator.getGamepads().filter((g) => g).length;
    setGamepadCount(count);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const actionName = KEY_MAP[event.key] || KEY_MAP[event.key.toLowerCase()];
      if (actionName) {
        processInput(
          {
            type: "key",
            name: actionName,
            timestamp: Date.now(),
          },
          "keyboard"
        );
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const pollGamepads = () => {
      const buttons = {};
      const gamepads = navigator.getGamepads();

      let activeGamepad = null;

      for (const gp of gamepads) {
        if (!gp) {
          continue;
        }

        for (let i = 0; i < gp.buttons.length; i++) {
          if (!activeGamepad && gp.buttons[i].pressed) {
            activeGamepad = gp;
          }
          buttons[i] = buttons[i] || gp.buttons[i].pressed;
        }

        if (!activeGamepad && gp.axes) {
          const hasStickMovement = gp.axes.some(
            (axis) => Math.abs(axis) > ANALOG_THRESHOLD
          );
          if (hasStickMovement) {
            activeGamepad = gp;
          }
        }
      }

      if (activeGamepad) {
        applyAnalogStickAsDPad(
          getAggregatedAxes(activeGamepad),
          buttons,
          ANALOG_THRESHOLD
        );
      }

      const createInput = (actionName) => {
        return {
          type: "gamepad",
          name: actionName,
          timestamp: Date.now(),
        };
      };

      let gamepadType = activeGamepad ? getGamepadType(activeGamepad) : null;

      if (!gamepadType) {
        if (latestInputTypeRef.current !== "keyboard") {
          gamepadType = latestInputTypeRef.current;
        } else {
          gamepadType = "xbox";
        }
      }

      for (const [button, pressed] of Object.entries(buttons)) {
        const prevButtonPressed = prevButtonState.current[button];
        if (pressed && !prevButtonPressed) {
          const actionName = GAMEPAD_BUTTON_MAP[button];
          if (actionName) {
            processInput(createInput(actionName), gamepadType);
            break;
          }
        }
      }

      const superFallbackPressed =
        GAMEPAD_SUPER_BUTTON_FALLBACK.every((i) => buttons[i]) &&
        !GAMEPAD_SUPER_BUTTON_FALLBACK.every((i) => prevButtonState.current[i]);

      if (superFallbackPressed) {
        processInput(createInput("Super"), gamepadType);
      }

      prevButtonState.current = buttons;
      animationFrameId.current = requestAnimationFrame(pollGamepads);
    };

    const handleGamepadConnected = () => {
      updateGamepadCount();
      if (!animationFrameId.current) {
        logInfo("InputProvider: Gamepad polling started.");
        animationFrameId.current = requestAnimationFrame(pollGamepads);
      }
    };

    const handleGamepadDisconnected = () => {
      updateGamepadCount();
      if (navigator.getGamepads().filter((g) => g).length === 0) {
        if (animationFrameId.current) {
          logInfo("InputProvider: Gamepad polling stopped.");
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }
      }
    };

    updateGamepadCount();

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    if (navigator.getGamepads().filter((g) => g).length > 0) {
      if (!animationFrameId.current) {
        logInfo("InputProvider: Gamepad polling started (initial check).");
        animationFrameId.current = requestAnimationFrame(pollGamepads);
      }
    }

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener(
        "gamepaddisconnected",
        handleGamepadDisconnected
      );
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [updateGamepadCount]);

  const value = {
    subscribe,
    claimInputFocus,
    gamepadCount,
    subscribeToInputType,
    getLatestInputType: () => latestInputTypeRef.current,
  };

  return (
    <InputContext.Provider value={value}>{children}</InputContext.Provider>
  );
};
