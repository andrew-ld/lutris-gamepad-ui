import { createContext, useContext, useCallback, useRef, useMemo } from "react";

const ToastActionsContext = createContext(null);
const ToastStateContext = createContext(null);

export const useToastActions = () => useContext(ToastActionsContext);
export const useToastState = () => useContext(ToastStateContext);

const TOAST_TIMEOUT = 5000;
const MAX_TOASTS = 5;

export const ToastProvider = ({ children }) => {
  const toastsRef = useRef([]);
  const listenersRef = useRef(new Set());
  const toastIdCounter = useRef(0);

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) {
      listener([...toastsRef.current]);
    }
  }, []);

  const hideToast = useCallback(
    (id) => {
      toastsRef.current = toastsRef.current.filter((toast) => toast.id !== id);
      notify();
    },
    [notify]
  );

  const showToast = useCallback(
    (payload) => {
      const id = toastIdCounter.current++;
      let newToast;

      if (typeof payload === "string") {
        newToast = { id, title: payload, type: "info" };
      } else {
        const { title, description, type = "info" } = payload;
        newToast = { id, title, description, type };
      }

      const currentToasts = toastsRef.current;
      if (currentToasts.length >= MAX_TOASTS) {
        toastsRef.current = [...currentToasts.slice(1), newToast];
      } else {
        toastsRef.current = [...currentToasts, newToast];
      }

      notify();

      setTimeout(() => {
        hideToast(id);
      }, TOAST_TIMEOUT);
    },
    [hideToast, notify]
  );

  const actionsValue = useMemo(
    () => ({ showToast, hideToast }),
    [showToast, hideToast]
  );

  const subscribe = useCallback((callback) => {
    listenersRef.current.add(callback);
    callback(toastsRef.current);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const stateValue = useMemo(() => ({ subscribe }), [subscribe]);

  return (
    <ToastStateContext.Provider value={stateValue}>
      <ToastActionsContext.Provider value={actionsValue}>
        {children}
      </ToastActionsContext.Provider>
    </ToastStateContext.Provider>
  );
};
