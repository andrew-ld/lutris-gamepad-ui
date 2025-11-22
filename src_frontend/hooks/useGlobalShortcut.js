import { useEffect, useRef } from "react";
import { useInput } from "../contexts/InputContext";

export const useGlobalShortcut = (shortcuts) => {
  const { subscribe } = useInput();
  const latestShortcuts = useRef(shortcuts);

  useEffect(() => {
    latestShortcuts.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const handleInput = (input) => {
      for (const shortcut of latestShortcuts.current) {
        if (shortcut.active && input.name === shortcut.key) {
          input.isConsumed = true;
          shortcut.action();
          return;
        }
      }
    };

    const unsubscribe = subscribe(handleInput);
    return unsubscribe;
  }, [subscribe]);
};
