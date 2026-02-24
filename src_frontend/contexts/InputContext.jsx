import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { logInfo } from "../utils/ipc";
import { useSettingsState } from "./SettingsContext";

const KEYBOARD_ACTION_MAP = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  a: "A",
  b: "B",
  x: "X",
  y: "Y",
  1: "L1",
  2: "R1",
};

const GAMEPAD_SUPER_BUTTON_INDICES = [8, 9];

const GAMEPAD_BUTTON_INDEX_TO_ACTION_MAP = {
  0: "A",
  1: "B",
  2: "X",
  3: "Y",
  4: "L1",
  5: "R1",
  12: "UP",
  13: "DOWN",
  14: "LEFT",
  15: "RIGHT",
  16: "Super",
};

const GAMEPAD_ANALOG_THRESHOLD = 0.5;

const GAMEPAD_ACTION_TO_BUTTON_INDEX_MAP = Object.fromEntries(
  Object.entries(GAMEPAD_BUTTON_INDEX_TO_ACTION_MAP).map(([key, value]) => [
    value,
    key,
  ]),
);

const mapGamepadAnalogToDPad = (axes, buttons, threshold) => {
  const [axisX, axisY] = axes;

  if (Math.abs(axisY) > threshold && Math.abs(axisY) >= Math.abs(axisX)) {
    if (axisY < 0) {
      buttons[GAMEPAD_ACTION_TO_BUTTON_INDEX_MAP.UP] = true;
    } else {
      buttons[GAMEPAD_ACTION_TO_BUTTON_INDEX_MAP.DOWN] = true;
    }
  } else if (Math.abs(axisX) > threshold && Math.abs(axisX) > Math.abs(axisY)) {
    if (axisX < 0) {
      buttons[GAMEPAD_ACTION_TO_BUTTON_INDEX_MAP.LEFT] = true;
    } else {
      buttons[GAMEPAD_ACTION_TO_BUTTON_INDEX_MAP.RIGHT] = true;
    }
  }
};

const resolveGamepadAxes = (gamepad) => {
  if (!gamepad || !gamepad.axes) {
    return [0, 0];
  }

  let dominantX = 0;
  let dominantY = 0;

  const leftStickX = gamepad.axes[0] || 0;
  const leftStickY = gamepad.axes[1] || 0;
  if (Math.abs(leftStickX) > Math.abs(dominantX)) dominantX = leftStickX;
  if (Math.abs(leftStickY) > Math.abs(dominantY)) dominantY = leftStickY;

  const rightStickX = gamepad.axes[2] || 0;
  const rightStickY = gamepad.axes[3] || 0;
  if (Math.abs(rightStickX) > Math.abs(dominantX)) dominantX = rightStickX;
  if (Math.abs(rightStickY) > Math.abs(dominantY)) dominantY = rightStickY;

  return [dominantX, dominantY];
};

const determineGamepadType = (gamepad) => {
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
  const inputSubscribers = useRef(new Set());
  const inputTypeSubscribers = useRef(new Set());
  const lastDetectedInputSourceRef = useRef("keyboard");

  const [focusStack, setFocusStack] = useState([]);
  const [connectedGamepadCount, setConnectedGamepadCount] = useState(0);

  const focusIdCounter = useRef(0);
  const focusStackRef = useRef(focusStack);

  const gamepadPollingRafId = useRef(null);
  const gamepadPollingIntervalId = useRef(null);
  const isGamepadPollingActive = useRef(false);

  const gamepadAutorepeatMs = useRef();
  const gamepadAutorepeatState = useRef({});

  const { settings } = useSettingsState();

  useEffect(() => {
    gamepadAutorepeatMs.current = settings.gamepadAutorepeatMs;
  }, [settings]);

  useEffect(() => {
    focusStackRef.current = focusStack;
  }, [focusStack]);

  const subscribeToInputEvents = useCallback((callback) => {
    inputSubscribers.current.add(callback);
    return () => inputSubscribers.current.delete(callback);
  }, []);

  const subscribeToInputType = useCallback((callback) => {
    inputTypeSubscribers.current.add(callback);
    return () => inputTypeSubscribers.current.delete(callback);
  }, []);

  const broadcastInputTypeChange = useCallback(() => {
    for (const listener of inputTypeSubscribers.current) {
      listener(lastDetectedInputSourceRef.current);
    }
  }, []);

  const broadcastInputEvent = useCallback((inputEvent) => {
    const eventObject = { ...inputEvent, isConsumed: false };
    [...inputSubscribers.current].forEach((cb) => cb(eventObject));
  }, []);

  const dispatchInputEvent = (inputEvent, inputSource) => {
    if (inputSource && inputSource !== lastDetectedInputSourceRef.current) {
      lastDetectedInputSourceRef.current = inputSource;
      broadcastInputTypeChange();
    }
    if (document.hasFocus() || !inputEvent || inputEvent?.name === "Super") {
      broadcastInputEvent(inputEvent);
      return true;
    }
    return false;
  };

  const releaseInputFocus = useCallback((uniqueId) => {
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
          releaseInputFocus(uniqueId, claimantId);
        },
      };

      return token;
    },
    [releaseInputFocus],
  );

  const refreshGamepadCount = useCallback(() => {
    const count = navigator.getGamepads().filter((g) => g).length;
    setConnectedGamepadCount(count);
    return count;
  }, []);

  useEffect(() => {
    const handleKeyboardKeyDown = (event) => {
      if (event.repeat) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const actionName =
        KEYBOARD_ACTION_MAP[event.key] ||
        KEYBOARD_ACTION_MAP[event.key.toLowerCase()];
      if (actionName) {
        dispatchInputEvent(
          {
            type: "key",
            name: actionName,
            timestamp: performance.now(),
          },
          "keyboard",
        );
      }
    };
    document.addEventListener("keydown", handleKeyboardKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyboardKeyDown);
    };
  }, []);

  useEffect(() => {
    const executeGamepadPoll = () => {
      const currentTimestamp = performance.now();
      const pressedButtons = {};
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
          pressedButtons[i] = pressedButtons[i] || gp.buttons[i].pressed;
        }

        if (!activeGamepad && gp.axes) {
          const hasStickMovement = gp.axes.some(
            (axis) => Math.abs(axis) > GAMEPAD_ANALOG_THRESHOLD,
          );
          if (hasStickMovement) {
            activeGamepad = gp;
          }
        }
      }

      if (activeGamepad) {
        mapGamepadAnalogToDPad(
          resolveGamepadAxes(activeGamepad),
          pressedButtons,
          GAMEPAD_ANALOG_THRESHOLD,
        );
      }

      const createGamepadEvent = (actionName) => {
        return {
          type: "gamepad",
          name: actionName,
          timestamp: currentTimestamp,
        };
      };

      let gamepadType = activeGamepad
        ? determineGamepadType(activeGamepad)
        : null;

      if (!gamepadType) {
        if (lastDetectedInputSourceRef.current !== "keyboard") {
          gamepadType = lastDetectedInputSourceRef.current;
        } else {
          gamepadType = "xbox";
        }
      }

      const activeActionsSet = new Set();

      for (const [buttonIndex, pressed] of Object.entries(pressedButtons)) {
        if (pressed) {
          const actionName = GAMEPAD_BUTTON_INDEX_TO_ACTION_MAP[buttonIndex];
          if (actionName) {
            activeActionsSet.add(actionName);
          }
        }
      }

      const isSuperPressed = GAMEPAD_SUPER_BUTTON_INDICES.every(
        (i) => pressedButtons[i],
      );

      if (isSuperPressed) {
        activeActionsSet.add("Super");
      }

      for (const actionName of Object.keys(gamepadAutorepeatState.current)) {
        if (!activeActionsSet.has(actionName)) {
          delete gamepadAutorepeatState.current[actionName];
        }
      }

      for (const actionName of activeActionsSet) {
        const nextTriggerTime = gamepadAutorepeatState.current[actionName];

        if (!nextTriggerTime || currentTimestamp >= nextTriggerTime) {
          dispatchInputEvent(createGamepadEvent(actionName), gamepadType);
          gamepadAutorepeatState.current[actionName] =
            currentTimestamp + gamepadAutorepeatMs.current;
        }
      }
    };

    const stopGamepadLoop = () => {
      if (gamepadPollingRafId.current) {
        cancelAnimationFrame(gamepadPollingRafId.current);
        gamepadPollingRafId.current = null;
      }
      if (gamepadPollingIntervalId.current) {
        clearInterval(gamepadPollingIntervalId.current);
        gamepadPollingIntervalId.current = null;
      }
    };

    const startGamepadLoop = () => {
      stopGamepadLoop();

      const count = navigator.getGamepads().filter((g) => g).length;
      if (count === 0) {
        isGamepadPollingActive.current = false;
        logInfo("InputProvider: No gamepads detected. Polling stopped.");
        return;
      }

      isGamepadPollingActive.current = true;

      if (document.hasFocus()) {
        logInfo("InputProvider: Starting RAF polling (Focused).");
        const loop = () => {
          executeGamepadPoll();
          gamepadPollingRafId.current = requestAnimationFrame(loop);
        };
        loop();
      } else {
        logInfo(
          "InputProvider: Starting Interval polling (Blurred/Background).",
        );
        gamepadPollingIntervalId.current = setInterval(executeGamepadPoll, 16);
      }
    };

    const handleGamepadConnected = () => {
      refreshGamepadCount();
      startGamepadLoop();
    };

    const handleGamepadDisconnected = () => {
      const count = refreshGamepadCount();
      if (count === 0) {
        stopGamepadLoop();
        isGamepadPollingActive.current = false;
      }
    };

    const handleWindowFocusChange = () => {
      if (isGamepadPollingActive.current) {
        startGamepadLoop();
      }
    };

    refreshGamepadCount();

    if (navigator.getGamepads().filter((g) => g).length > 0) {
      startGamepadLoop();
    }

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
    window.addEventListener("focus", handleWindowFocusChange);
    window.addEventListener("blur", handleWindowFocusChange);

    return () => {
      stopGamepadLoop();
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener(
        "gamepaddisconnected",
        handleGamepadDisconnected,
      );
      window.removeEventListener("focus", handleWindowFocusChange);
      window.removeEventListener("blur", handleWindowFocusChange);
    };
  }, [refreshGamepadCount]);

  const value = {
    subscribe: subscribeToInputEvents,
    claimInputFocus,
    gamepadCount: connectedGamepadCount,
    subscribeToInputType,
    getLatestInputType: () => lastDetectedInputSourceRef.current,
  };

  return (
    <InputContext.Provider value={value}>{children}</InputContext.Provider>
  );
};
