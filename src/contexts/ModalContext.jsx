import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

const ModalContext = createContext(null);
export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState([]);
  const modalIdCounter = useRef(0);

  const showModal = useCallback((renderContent) => {
    const modalId = modalIdCounter.current++;

    const hideThisModal = () => {
      setModals((currentModals) =>
        currentModals.filter((m) => m.id !== modalId)
      );
    };

    const content = renderContent(hideThisModal);
    const newModal = { id: modalId, content };

    setModals((currentModals) => [...currentModals, newModal]);
  }, []);

  const hideModal = useCallback(() => {
    setModals((currentModals) => currentModals.slice(0, -1));
  }, []);

  const value = {
    modals,
    isModalOpen: modals.length > 0,
    showModal,
    hideModal,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};
