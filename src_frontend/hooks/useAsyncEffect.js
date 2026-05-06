import { useEffect } from "react";

import * as ipc from "../utils/ipc";

export const useAsyncEffect = (effect, deps) => {
  useEffect(() => {
    let mounted = true;

    const isMounted = () => mounted;

    try {
      const result = effect(isMounted);
      if (result && typeof result.catch === "function") {
        void result.catch((error) => {
          ipc.logError("Unhandled async effect error:", error);
        });
      }
    } catch (error) {
      ipc.logError("Unhandled async effect error:", error);
    }

    return () => {
      mounted = false;
    };
    // This hook forwards dependency management to the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps
  }, deps);
};
