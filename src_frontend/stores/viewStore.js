import { useEffect } from "react";

import { create } from "zustand";

const noop = () => {};

export const useViewStore = create((set) => ({
  resetSize: noop,
  setResetSize: (resetSize) => {
    set({ resetSize: resetSize || noop });
  },
}));

export const useViewActions = () => ({
  resetSize: useViewStore((state) => state.resetSize),
});

export const ViewStoreBinder = ({ children, onResetSize }) => {
  const setResetSize = useViewStore((state) => state.setResetSize);

  useEffect(() => {
    setResetSize(onResetSize);

    return () => {
      setResetSize(noop);
    };
  }, [setResetSize, onResetSize]);

  return children;
};
