import { create } from "zustand";

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

export const useUI = () => ({
  isSystemMenuOpen: useUIStore((state) => Boolean(state.isSystemMenuOpen)),
  toggleSystemMenu: useUIStore((state) => state.toggleSystemMenu),
  setSystemMenuOpen: useUIStore((state) => state.setSystemMenuOpen),
});
