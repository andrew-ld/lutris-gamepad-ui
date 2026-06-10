import { useCallback, useEffect, useRef } from "react";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { useGamepadInputCompat } from "../hooks/useGamepadInputCompat";
import { getMappedInput } from "../utils/gamepad_mapping";

import { useSettingsStore } from "./settingsStore";

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

const inputSubscribers = new Set();
const inputTypeSubscribers = new Set();
const focusSubscribers = new Set();

let focusStack = [];
let lastDetectedInputSource = "keyboard";

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

const subscribeToInputEvents = (callback) => {
  inputSubscribers.add(callback);
  return () => inputSubscribers.delete(callback);
};

const subscribeToInputType = (callback) => {
  inputTypeSubscribers.add(callback);
  return () => inputTypeSubscribers.delete(callback);
};

const subscribeToFocusChanges = (callback) => {
  focusSubscribers.add(callback);
  return () => focusSubscribers.delete(callback);
};

const broadcastFocusChange = () => {
  for (const callback of focusSubscribers) {
    callback();
  }
};

const broadcastInputTypeChange = () => {
  for (const listener of inputTypeSubscribers) {
    listener(lastDetectedInputSource);
  }
};

const broadcastInputEvent = (inputEvent) => {
  const eventObject = { ...inputEvent, isConsumed: false };
  for (const callback of inputSubscribers) callback(eventObject);
};

const popFocus = (uniqueId) => {
  focusStack = focusStack.filter((focus) => focus.uniqueId !== uniqueId);
  broadcastFocusChange();
};

const getFocusSnapshot = () => focusStack.at(-1)?.uniqueId ?? null;

const pushFocus = (claimantId, uniqueId) => {
  const newFocus = { claimantId, uniqueId };
  focusStack = [...focusStack, newFocus];
  broadcastFocusChange();
};

const getLatestInputType = () => lastDetectedInputSource;

export const useInputStore = create((set, get) => ({
  gamepadCount: 0,
  isMouseActive: false,
  subscribe: subscribeToInputEvents,
  pushFocus,
  popFocus,
  subscribeToInputType,
  getLatestInputType,
  subscribeToFocusChanges,
  getFocusSnapshot,
  setGamepadCount: (gamepadCount) => {
    if (get().gamepadCount !== gamepadCount) {
      set({ gamepadCount });
    }
  },
  setMouseActive: (isMouseActive) => {
    if (get().isMouseActive !== isMouseActive) {
      set({ isMouseActive });
    }
  },
}));

export const useInput = () =>
  useInputStore(
    useShallow((state) => ({
      subscribe: state.subscribe,
      pushFocus: state.pushFocus,
      popFocus: state.popFocus,
      gamepadCount: state.gamepadCount,
      subscribeToInputType: state.subscribeToInputType,
      getLatestInputType: state.getLatestInputType,
      subscribeToFocusChanges: state.subscribeToFocusChanges,
      getFocusSnapshot: state.getFocusSnapshot,
      isMouseActive: state.isMouseActive,
    })),
  );

export const useInitializeInputStore = () => {
  const setGamepadCount = useInputStore((state) => state.setGamepadCount);
  const setMouseActive = useInputStore((state) => state.setMouseActive);
  const gamepadAutorepeatMsSetting = useSettingsStore(
    (state) => state.settings.gamepadAutorepeatMs,
  );

  const mouseTimeoutReference = useRef(null);
  const gamepadPollingRafId = useRef(null);
  const gamepadPollingIntervalId = useRef(null);
  const isGamepadPollingActive = useRef(false);
  const gamepadPollingGeneration = useRef(0);
  const gamepadAutorepeatMs = useRef(gamepadAutorepeatMsSetting);
  const gamepadAutorepeatState = useRef({});
  const mouseLastXRef = useRef(null);
  const mouseLastYRef = useRef(null);

  const { pollGamepads } = useGamepadInputCompat();

  useEffect(() => {
    gamepadAutorepeatMs.current = gamepadAutorepeatMsSetting;
  }, [gamepadAutorepeatMsSetting]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!document.hasFocus()) {
        return;
      }

      const { clientX, clientY } = event;

      if (mouseLastXRef.current === null || mouseLastYRef.current === null) {
        mouseLastXRef.current = clientX;
        mouseLastYRef.current = clientY;
        return;
      }

      if (
        mouseLastXRef.current === clientX &&
        mouseLastYRef.current === clientY
      ) {
        return;
      }

      mouseLastXRef.current = clientX;
      mouseLastYRef.current = clientY;

      setMouseActive(true);

      clearTimeout(mouseTimeoutReference.current);

      mouseTimeoutReference.current = setTimeout(() => {
        setMouseActive(false);
      }, 500);
    };

    const handleBlur = () => {
      setMouseActive(false);
      clearTimeout(mouseTimeoutReference.current);
      mouseLastXRef.current = null;
      mouseLastYRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("blur", handleBlur);
      clearTimeout(mouseTimeoutReference.current);
    };
  }, [setMouseActive]);

  const dispatchInputEvent = useCallback(
    (inputEvent, inputSource) => {
      if (inputSource && inputSource !== lastDetectedInputSource) {
        lastDetectedInputSource = inputSource;
        broadcastInputTypeChange();

        if (inputSource !== "mouse") {
          setMouseActive(false);
          clearTimeout(mouseTimeoutReference.current);
        }
      }
      if (document.hasFocus() || !inputEvent || inputEvent?.name === "Super") {
        broadcastInputEvent(inputEvent);
        return true;
      }
      return false;
    },
    [setMouseActive],
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
    const executeGamepadPoll = async (shouldContinuePolling) => {
      const currentTimestamp = performance.now();
      const activeActionsSet = new Set();
      const rawPressedIndices = new Set();
      const gamepads = await pollGamepads();

      if (!shouldContinuePolling()) return;

      setGamepadCount(gamepads.length);

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
          lastDetectedInputSource === "keyboard"
            ? "xbox"
            : lastDetectedInputSource;
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
      gamepadPollingGeneration.current += 1;
      isGamepadPollingActive.current = false;

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
      const loopGeneration = gamepadPollingGeneration.current;

      const shouldContinuePolling = () =>
        isGamepadPollingActive.current &&
        gamepadPollingGeneration.current === loopGeneration;

      const loop = async () => {
        if (!shouldContinuePolling()) return;

        await executeGamepadPoll(shouldContinuePolling);

        if (!shouldContinuePolling()) return;

        if (document.hasFocus()) {
          gamepadPollingRafId.current = requestAnimationFrame(loop);
        } else {
          gamepadPollingIntervalId.current = setTimeout(loop, 16);
        }
      };

      void loop();
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
  }, [dispatchInputEvent, pollGamepads, setGamepadCount]);
};
