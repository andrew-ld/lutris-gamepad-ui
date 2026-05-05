import { useEffect } from "react";

export const useAsyncEffect = (effect, deps) => {
  useEffect(() => {
    let mounted = true;

    const isMounted = () => mounted;

    void effect(isMounted);

    return () => {
      mounted = false;
    };
    // This hook forwards dependency management to the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps
  }, deps);
};
