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

      return { isSystemMenuOpen: resolvedIsSystemMenuOpen };
    });
  },
}));

export const useUI = () =>
  useUIStore(
    useShallow((state) => ({
      isSystemMenuOpen: state.isSystemMenuOpen,
      toggleSystemMenu: state.toggleSystemMenu,
      setSystemMenuOpen: state.setSystemMenuOpen,
    })),
  );
