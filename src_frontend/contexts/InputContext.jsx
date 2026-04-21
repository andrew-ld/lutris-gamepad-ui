import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

import { useGamepadInputCompat } from "../hooks/useGamepadInputCompat";
import { getMappedInput } from "../utils/gamepad_mapping";

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
  3: "Select",
  4: "Start",
};

const GAMEPAD_SUPER_BUTTON_INDICES = [8, 9];

const GAMEPAD_BUTTON_INDEX_TO_ACTION_MAP = {
  0: "A",
  1: "B",
  2: "X",
  3: "Y",
  4: "L1",
  5: "R1",
  8: "Select",
  9: "Start",
  12: "UP",
  13: "DOWN",
  14: "LEFT",
  15: "RIGHT",
  16: "Super",
};

const GAMEPAD_ANALOG_THRESHOLD = 0.5;

const mapGamepadAnalogToDPad = (axes, activeActionsSet, threshold) => {
  const [axisX, axisY] = axes;
  let hasInput = false;

  if (Math.abs(axisY) > threshold && Math.abs(axisY) >= Math.abs(axisX)) {
    if (axisY < 0) {
      activeActionsSet.add("UP");
    } else {
      activeActionsSet.add("DOWN");
    }
    hasInput = true;
  } else if (Math.abs(axisX) > threshold && Math.abs(axisX) > Math.abs(axisY)) {
    if (axisX < 0) {
      activeActionsSet.add("LEFT");
    } else {
      activeActionsSet.add("RIGHT");
    }
    hasInput = true;
  }

  return hasInput;
};

const resolveGamepadAxes = (axes) => {
  let dominantX = 0;
  let dominantY = 0;

  const leftStickX = axes[0] || 0;
  const leftStickY = axes[1] || 0;
  if (Math.abs(leftStickX) > Math.abs(dominantX)) dominantX = leftStickX;
  if (Math.abs(leftStickY) > Math.abs(dominantY)) dominantY = leftStickY;

  const rightStickX = axes[2] || 0;
  const rightStickY = axes[3] || 0;
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
  const lastDetectedInputSourceReference = useRef("keyboard");

  const [, setFocusIteration] = useState(0);
  const [connectedGamepadCount, setConnectedGamepadCount] = useState(0);
  const [isMouseActive, setIsMouseActive] = useState(false);
  const mouseTimeoutReference = useRef(null);

  const focusStackReference = useRef([]);

  const gamepadPollingRafId = useRef(null);
  const gamepadPollingIntervalId = useRef(null);
  const isGamepadPollingActive = useRef(false);

  const gamepadAutorepeatMs = useRef();
  const gamepadAutorepeatState = useRef({});

  const { settings } = useSettingsState();

  const { pollGamepads } = useGamepadInputCompat();

  useEffect(() => {
    const handleMouseMove = () => {
      if (!document.hasFocus()) {
        return;
      }

      setIsMouseActive(true);
      clearTimeout(mouseTimeoutReference.current);

      mouseTimeoutReference.current = setTimeout(() => {
        setIsMouseActive(false);
      }, 500);
    };

    const handleBlur = () => {
      setIsMouseActive(false);
      clearTimeout(mouseTimeoutReference.current);
    };

    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("blur", handleBlur);
      clearTimeout(mouseTimeoutReference.current);
    };
  }, []);

  useEffect(() => {
    gamepadAutorepeatMs.current = settings.gamepadAutorepeatMs;
  }, [settings]);

  const focusSubscribers = useRef(new Set());

  const subscribeToFocusChanges = useCallback((callback) => {
    focusSubscribers.current.add(callback);
    return () => focusSubscribers.current.delete(callback);
  }, []);

  const broadcastFocusChange = useCallback(() => {
    for (const callback of focusSubscribers.current) {
      callback();
    }
  }, []);

  const triggerFocusUpdate = useCallback(() => {
    setFocusIteration((i) => i + 1);
    broadcastFocusChange();
  }, [broadcastFocusChange]);

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
      listener(lastDetectedInputSourceReference.current);
    }
  }, []);

  const broadcastInputEvent = useCallback((inputEvent) => {
    const eventObject = { ...inputEvent, isConsumed: false };
    for (const callback of inputSubscribers.current) callback(eventObject);
  }, []);

  const dispatchInputEvent = useCallback(
    (inputEvent, inputSource) => {
      if (
        inputSource &&
        inputSource !== lastDetectedInputSourceReference.current
      ) {
        lastDetectedInputSourceReference.current = inputSource;
        broadcastInputTypeChange();

        if (inputSource !== "mouse") {
          setIsMouseActive(false);
          clearTimeout(mouseTimeoutReference.current);
        }
      }
      if (document.hasFocus() || !inputEvent || inputEvent?.name === "Super") {
        broadcastInputEvent(inputEvent);
        return true;
      }
      return false;
    },
    [broadcastInputTypeChange, broadcastInputEvent],
  );

  const popFocus = useCallback(
    (uniqueId) => {
      focusStackReference.current = focusStackReference.current.filter(
        (f) => f.uniqueId !== uniqueId,
      );
      triggerFocusUpdate();
    },
    [triggerFocusUpdate],
  );

  const getFocusSnapshot = useCallback(() => {
    return focusStackReference.current.at(-1)?.uniqueId ?? null;
  }, []);

  const pushFocus = useCallback(
    (claimantId, uniqueId) => {
      const newFocus = { claimantId, uniqueId };
      focusStackReference.current = [...focusStackReference.current, newFocus];
      triggerFocusUpdate();
    },
    [triggerFocusUpdate],
  );

  useEffect(() => {
    const handleKeyboardKeyDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (event.repeat) {
        return;
      }
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
  }, [dispatchInputEvent]);

  useEffect(() => {
    const executeGamepadPoll = async () => {
      const currentTimestamp = performance.now();
      const activeActionsSet = new Set();
      const rawPressedIndices = new Set();
      const gamepads = await pollGamepads();

      setConnectedGamepadCount((prevCount) => {
        if (prevCount !== gamepads.length) {
          return gamepads.length;
        }
        return prevCount;
      });

      let activeGamepad = null;

      for (const gp of gamepads) {
        if (!gp) {
          continue;
        }

        let buttons = gp.buttons;
        let axes = gp.axes;

        if (gp.mapping === "") {
          const mappedInput = getMappedInput(gp);
          if (mappedInput) {
            buttons = mappedInput.buttons;
            axes = mappedInput.axes;
          }
        }

        let hasInput = false;

        for (const [index, button] of buttons.entries()) {
          if (button.pressed) {
            hasInput = true;
            rawPressedIndices.add(index);
            const actionName = GAMEPAD_BUTTON_INDEX_TO_ACTION_MAP[index];
            if (actionName) {
              activeActionsSet.add(actionName);
            }
          }
        }

        if (axes) {
          const analogInputAdded = mapGamepadAnalogToDPad(
            resolveGamepadAxes(axes),
            activeActionsSet,
            GAMEPAD_ANALOG_THRESHOLD,
          );
          if (analogInputAdded) {
            hasInput = true;
          }
        }

        if (!activeGamepad && hasInput) {
          activeGamepad = gp;
        }
      }

      const isSuperPressed = GAMEPAD_SUPER_BUTTON_INDICES.every((index) =>
        rawPressedIndices.has(index),
      );

      if (isSuperPressed) {
        activeActionsSet.add("Super");
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
        gamepadType =
          lastDetectedInputSourceReference.current === "keyboard"
            ? "xbox"
            : lastDetectedInputSourceReference.current;
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
        clearTimeout(gamepadPollingIntervalId.current);
        gamepadPollingIntervalId.current = null;
      }
    };

    const startGamepadLoop = () => {
      stopGamepadLoop();
      isGamepadPollingActive.current = true;

      const loop = async () => {
        if (!isGamepadPollingActive.current) return;

        await executeGamepadPoll();

        if (document.hasFocus()) {
          gamepadPollingRafId.current = requestAnimationFrame(loop);
        } else {
          gamepadPollingIntervalId.current = setTimeout(loop, 16);
        }
      };

      loop();
    };

    const handleWindowFocusChange = () => {
      if (isGamepadPollingActive.current) {
        startGamepadLoop();
      }
    };

    startGamepadLoop();

    window.addEventListener("focus", handleWindowFocusChange);
    window.addEventListener("blur", handleWindowFocusChange);

    return () => {
      stopGamepadLoop();
      window.removeEventListener("focus", handleWindowFocusChange);
      window.removeEventListener("blur", handleWindowFocusChange);
    };
  }, [dispatchInputEvent, pollGamepads]);

  const value = {
    subscribe: subscribeToInputEvents,
    pushFocus,
    popFocus,
    gamepadCount: connectedGamepadCount,
    subscribeToInputType,
    getLatestInputType: () => lastDetectedInputSourceReference.current,
    subscribeToFocusChanges,
    getFocusSnapshot,
    isMouseActive,
  };

  return (
    <InputContext.Provider value={value}>{children}</InputContext.Provider>
  );
};
