import { useEffect, useRef } from "react";
import { useInput } from "../contexts/InputContext";

export const useScopedInput = (handler, focusId, isActive = true) => {
  const { lastInput, claimInputFocus, consumeInput } = useInput();
  const inputTokenRef = useRef(null);
  const lastProcessedInput = useRef(null);

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
    if (
      !isActive ||
      !inputTokenRef.current?.isAcquired() ||
      !lastInput ||
      lastInput.timestamp === lastProcessedInput.current ||
      lastInput.isConsumed
    ) {
      return;
    }
    lastProcessedInput.current = lastInput.timestamp;
    consumeInput();
    handler(lastInput);
  }, [lastInput, handler, isActive, consumeInput]);
};
