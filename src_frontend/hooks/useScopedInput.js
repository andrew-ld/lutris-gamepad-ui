import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useId,
} from "react";

import { useInput } from "../contexts/InputContext";

export const useScopedInput = (handler, focusId, isActive = true) => {
  const {
    subscribe,
    subscribeToFocusChanges,
    getFocusSnapshot,
    pushFocus,
    popFocus,
  } = useInput();

  const uniqueId = useId();
  const latestHandler = useRef(handler);

  const topUniqueId = useSyncExternalStore(
    subscribeToFocusChanges,
    getFocusSnapshot,
  );

  const isFocused = isActive && topUniqueId === uniqueId;

  const [wasAcquired, setWasAcquired] = useState(false);
  if (isFocused && !wasAcquired) {
    setWasAcquired(true);
  }

  const [prevIsActive, setPrevIsActive] = useState(isActive);
  if (isActive !== prevIsActive) {
    setPrevIsActive(isActive);
    if (!isActive) {
      setWasAcquired(false);
    }
  }

  useEffect(() => {
    latestHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (isActive) {
      pushFocus(focusId, uniqueId);
      return () => {
        popFocus(uniqueId);
      };
    }
  }, [pushFocus, popFocus, focusId, uniqueId, isActive]);

  useEffect(() => {
    const handleInput = (input) => {
      if (input.isConsumed || !isFocused) {
        return;
      }
      input.isConsumed = true;
      if (latestHandler.current) {
        latestHandler.current(input);
      }
    };

    const unsubscribe = subscribe(handleInput);
    return unsubscribe;
  }, [subscribe, isFocused]);

  return { isFocused, wasAcquired };
};
