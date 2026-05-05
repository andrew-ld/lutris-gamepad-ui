import { useCallback, useEffect, useRef } from "react";

export const useAsyncGuard = () => {
  const isCancelledReference = useRef(false);

  useEffect(() => {
    return () => {
      isCancelledReference.current = true;
    };
  }, []);

  return useCallback(() => isCancelledReference.current, []);
};
