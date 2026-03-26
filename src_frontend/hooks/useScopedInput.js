import { useEffect, useRef, useState } from "react";

import { useInput } from "../contexts/InputContext";

export const useScopedInput = (handler, focusId, isActive = true) => {
  const { subscribe, claimInputFocus, subscribeToFocusChanges } = useInput();
  const inputTokenReference = useRef(null);
  const latestHandler = useRef(handler);
  const [isFocused, setIsFocused] = useState(false);
  const wasAcquiredReference = useRef(false);

  useEffect(() => {
    latestHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const handleFocusChange = () => {
      const acquired = inputTokenReference.current?.isAcquired() ?? false;
      if (acquired) {
        wasAcquiredReference.current = true;
      }
      setIsFocused(acquired);
    };

    const unsubscribe = subscribeToFocusChanges(handleFocusChange);
    return unsubscribe;
  }, [subscribeToFocusChanges]);

  useEffect(() => {
    if (isActive) {
      inputTokenReference.current = claimInputFocus(focusId);
      const acquired = inputTokenReference.current.isAcquired();
      if (acquired) {
        wasAcquiredReference.current = true;
      }
      setIsFocused(acquired);

      return () => {
        inputTokenReference.current?.release();
        inputTokenReference.current = null;
        setIsFocused(false);
        wasAcquiredReference.current = false;
      };
    } else {
      setIsFocused(false);
      wasAcquiredReference.current = false;
    }
  }, [claimInputFocus, focusId, isActive]);

  useEffect(() => {
    const handleInput = (input) => {
      const acquired = inputTokenReference.current?.isAcquired() ?? false;
      if (input.isConsumed || !isActive || !acquired) {
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

  return { isFocused, wasAcquired: wasAcquiredReference.current };
};
