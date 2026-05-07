import { create } from "zustand";

const TOAST_TIMEOUT = 5000;
const MAX_TOASTS = 5;

let toastIdCounter = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],
  showToast: (payload) => {
    const id = toastIdCounter++;
    let newToast;

    if (typeof payload === "string") {
      newToast = { id, title: payload, type: "info" };
    } else {
      const { title, description, type = "info" } = payload;
      newToast = { id, title, description, type };
    }

    set((state) => ({
      toasts:
        state.toasts.length >= MAX_TOASTS
          ? [...state.toasts.slice(1), newToast]
          : [...state.toasts, newToast],
    }));

    setTimeout(() => {
      get().hideToast(id);
    }, TOAST_TIMEOUT);
  },
  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));

export const useToastActions = () => ({
  showToast: useToastStore((state) => state.showToast),
  hideToast: useToastStore((state) => state.hideToast),
});

export const useToastState = () => ({
  toasts: useToastStore((state) => state.toasts),
});
