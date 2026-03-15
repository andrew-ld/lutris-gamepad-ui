import { useEffect, useRef } from "react";

import { useInput } from "../contexts/InputContext";

export const useScopedInput = (handler, focusId, isActive = true) => {
  const { subscribe, claimInputFocus } = useInput();
  const inputTokenReference = useRef(null);
  const latestHandler = useRef(handler);

  useEffect(() => {
    latestHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (isActive) {
      inputTokenReference.current = claimInputFocus(focusId);
      return () => {
        inputTokenReference.current?.release();
        inputTokenReference.current = null;
      };
    }
  }, [claimInputFocus, focusId, isActive]);

  useEffect(() => {
    const handleInput = (input) => {
      if (
        input.isConsumed ||
        !isActive ||
        !inputTokenReference.current?.isAcquired()
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
