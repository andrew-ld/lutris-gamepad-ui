import { useEffect, useRef } from "react";

import * as ipc from "../utils/ipc";

import { useIsMounted } from "./useIsMounted";

export const useAsyncEffect = (effect, deps) => {
  const isMounted = useIsMounted();
  const effectGeneration = useRef(0);

  useEffect(() => {
    const generation = effectGeneration.current + 1;
    effectGeneration.current = generation;

    const isCurrentEffect = () =>
      isMounted() && effectGeneration.current === generation;

    try {
      const result = effect(isCurrentEffect);
      if (result && typeof result.catch === "function") {
        void result.catch((error) => {
          ipc.logError("Unhandled async effect error:", error);
        });
      }
    } catch (error) {
      ipc.logError("Unhandled async effect error:", error);
    }

    return () => {
      effectGeneration.current += 1;
    };
    // This hook forwards dependency management to the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps
  }, deps);
};
