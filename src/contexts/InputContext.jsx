import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

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

const InputContext = createContext(null);
export const useInput = () => useContext(InputContext);

export const InputProvider = ({ children }) => {
  const [lastInput, setLastInput] = useState(null);
  const [focusStack, setFocusStack] = useState([]);
  const [gamepadCount, setGamepadCount] = useState(0);

  const focusIdCounter = useRef(0);
  const focusStackRef = useRef(focusStack);

  const prevButtonState = useRef({});
  const animationFrameId = useRef(null);

  useEffect(() => {
    focusStackRef.current = focusStack;
  }, [focusStack]);

  const setLastInputSafe = (input) => {
    if (document.hasFocus() || !input || input?.name === "Super") {
      setLastInput(input);
      return true;
    }
    return false;
  };

  const releaseFocus = useCallback((uniqueId) => {
    setFocusStack((prevStack) => {
      const newStack = prevStack.filter((f) => f.uniqueId !== uniqueId);
      if (newStack.length !== prevStack.length) {
        setLastInput(null);
      }
      return newStack;
    });
  }, []);

  const claimInputFocus = useCallback(
    (claimantId) => {
      const uniqueId = focusIdCounter.current++;
      const newFocus = { claimantId, uniqueId };

      setLastInput(null);

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
        setLastInputSafe({
          type: "key",
          name: actionName,
          timestamp: Date.now(),
        });
      }
    };
    const handleKeyUp = (_event) => {
      setLastInputSafe(null);
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

      let anyButtonPressed = false;
      const setInput = (actionName) => {
        const res = setLastInputSafe({
          type: "gamepad",
          name: actionName,
          timestamp: Date.now(),
        });
        anyButtonPressed |= res;
        return res;
      };

      for (const [button, pressed] of Object.entries(buttons)) {
        const prevButtonPressed = prevButtonState.current[button];
        if (pressed && !prevButtonPressed) {
          const actionName = GAMEPAD_BUTTON_MAP[button];
          if (actionName && setInput(actionName)) {
            break;
          }
        }
      }

      const superFallbackPressed =
        GAMEPAD_SUPER_BUTTON_FALLBACK.every((i) => buttons[i]) &&
        !GAMEPAD_SUPER_BUTTON_FALLBACK.every((i) => prevButtonState.current[i]);

      if (!anyButtonPressed && superFallbackPressed) {
        setInput("Super");
      }

      if (!anyButtonPressed) {
        setLastInput((prev) => (prev?.type === "gamepad" ? null : prev));
      }

      prevButtonState.current = buttons;
      animationFrameId.current = requestAnimationFrame(pollGamepads);
    };

    const handleGamepadConnected = () => {
      updateGamepadCount();
      if (!animationFrameId.current) {
        console.log("InputProvider: Gamepad polling started.");
        animationFrameId.current = requestAnimationFrame(pollGamepads);
      }
    };

    const handleGamepadDisconnected = () => {
      updateGamepadCount();
      if (navigator.getGamepads().filter((g) => g).length === 0) {
        if (animationFrameId.current) {
          console.log("InputProvider: Gamepad polling stopped.");
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
        console.log("InputProvider: Gamepad polling started (initial check).");
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
    lastInput,
    claimInputFocus,
    gamepadCount,
  };

  return (
    <InputContext.Provider value={value}>{children}</InputContext.Provider>
  );
};
