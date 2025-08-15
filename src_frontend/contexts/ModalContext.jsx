import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";

const ModalContext = createContext(null);

export const useModalActions = () => useContext(ModalContext);

export const useModalState = () => {
  const { subscribe } = useModalActions();
  const [modals, setModals] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribe(setModals);
    return unsubscribe;
  }, [subscribe]);

  return {
    modals,
    isModalOpen: modals.length > 0,
    topModal: modals.length > 0 ? modals[modals.length - 1] : null,
  };
};

export const ModalProvider = ({ children }) => {
  const modalsRef = useRef([]);
  const listenersRef = useRef(new Set());
  const modalIdCounter = useRef(0);

  const subscribe = useCallback((callback) => {
    listenersRef.current.add(callback);
    callback(modalsRef.current);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) {
      listener([...modalsRef.current]);
    }
  }, []);

  const showModal = useCallback(
    (renderContent) => {
      const modalId = modalIdCounter.current++;

      const hideThisModal = () => {
        modalsRef.current = modalsRef.current.filter((m) => m.id !== modalId);
        notify();
      };

      const content = renderContent(hideThisModal);
      const newModal = { id: modalId, content };

      modalsRef.current = [...modalsRef.current, newModal];
      notify();
    },
    [notify]
  );

  const hideModal = useCallback(() => {
    if (modalsRef.current.length > 0) {
      modalsRef.current = modalsRef.current.slice(0, -1);
      notify();
    }
  }, [notify]);

  const value = useMemo(
    () => ({
      showModal,
      hideModal,
      subscribe,
    }),
    [showModal, hideModal, subscribe]
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};
