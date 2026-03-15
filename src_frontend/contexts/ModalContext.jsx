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
    topModal: modals.length > 0 ? modals.at(-1) : null,
  };
};

export const ModalProvider = ({ children }) => {
  const modalsReference = useRef([]);
  const listenersReference = useRef(new Set());
  const modalIdCounter = useRef(0);

  const subscribe = useCallback((callback) => {
    listenersReference.current.add(callback);
    callback(modalsReference.current);
    return () => {
      listenersReference.current.delete(callback);
    };
  }, []);

  const notify = useCallback(() => {
    for (const listener of listenersReference.current) {
      listener([...modalsReference.current]);
    }
  }, []);

  const showModal = useCallback(
    (renderContent) => {
      const modalId = modalIdCounter.current++;

      const hideThisModal = () => {
        modalsReference.current = modalsReference.current.filter(
          (m) => m.id !== modalId,
        );
        notify();
      };

      const content = renderContent(hideThisModal);
      const newModal = { id: modalId, content };

      modalsReference.current = [...modalsReference.current, newModal];
      notify();
    },
    [notify],
  );

  const hideModal = useCallback(() => {
    if (modalsReference.current.length > 0) {
      modalsReference.current = modalsReference.current.slice(0, -1);
      notify();
    }
  }, [notify]);

  const value = useMemo(
    () => ({
      showModal,
      hideModal,
      subscribe,
    }),
    [showModal, hideModal, subscribe],
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};
