import { useEffect, useRef } from "react";
import { useInput } from "../contexts/InputContext";

export const useScopedInput = (handler, focusId, isActive = true) => {
  const { subscribe, claimInputFocus } = useInput();
  const inputTokenRef = useRef(null);
  const latestHandler = useRef(handler);

  useEffect(() => {
    latestHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (isActive) {
      inputTokenRef.current = claimInputFocus(focusId);
      return () => {
        inputTokenRef.current?.release();
        inputTokenRef.current = null;
      };
    }
  }, [claimInputFocus, focusId, isActive]);

  useEffect(() => {
    const handleInput = (input) => {
      if (
        input.isConsumed ||
        !isActive ||
        !inputTokenRef.current?.isAcquired()
      ) {
        return;
      }
      input.isConsumed = true;
      if (latestHandler.current) {
        latestHandler.current(input);
      }
    };

    const unsubscribe = subscribe(handleInput);
    return unsubscribe;
  }, [subscribe, isActive]);
};
