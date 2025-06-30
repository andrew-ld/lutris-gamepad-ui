import { useEffect, useRef } from "react";
import { useInput } from "../contexts/InputContext";

export const useGlobalShortcut = (shortcuts) => {
  const { lastInput, consumeInput } = useInput();
  const lastProcessedInput = useRef(null);

  useEffect(() => {
    if (
      !lastInput ||
      lastInput.timestamp === lastProcessedInput.current ||
      lastInput.isConsumed
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      if (shortcut.active && lastInput.name === shortcut.key) {
        lastProcessedInput.current = lastInput.timestamp;
        consumeInput();
        shortcut.action();
        break;
      }
    }
  }, [lastInput, shortcuts, consumeInput]);
};
