import { useEffect } from "react";

export const useAsyncEffect = (effect, deps) => {
  useEffect(() => {
    let cancelled = false;

    const isCancelled = () => cancelled;

    void effect(isCancelled);

    return () => {
      cancelled = true;
    };
    // This hook forwards dependency management to the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps
  }, deps);
};
