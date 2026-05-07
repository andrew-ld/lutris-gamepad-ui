import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export const useUIStore = create((set) => ({
  isSystemMenuOpen: false,
  toggleSystemMenu: () => {
    set((state) => ({ isSystemMenuOpen: !state.isSystemMenuOpen }));
  },
  setSystemMenuOpen: (nextIsSystemMenuOpen) => {
    set((state) => {
      const resolvedIsSystemMenuOpen =
        typeof nextIsSystemMenuOpen === "function"
          ? nextIsSystemMenuOpen(state.isSystemMenuOpen)
          : nextIsSystemMenuOpen;

      return { isSystemMenuOpen: Boolean(resolvedIsSystemMenuOpen) };
    });
  },
}));

export const useUI = () =>
  useUIStore(
    useShallow((state) => ({
      isSystemMenuOpen: Boolean(state.isSystemMenuOpen),
      toggleSystemMenu: state.toggleSystemMenu,
      setSystemMenuOpen: state.setSystemMenuOpen,
    })),
  );
