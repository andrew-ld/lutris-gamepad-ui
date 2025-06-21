import { createContext, useContext, useState, useCallback } from "react";

const ModalContext = createContext(null);
export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null);

  const showModal = useCallback((renderContent) => {
    const modalId = Symbol("modalId");

    const hideThisModal = () => {
      setModal((currentModal) => {
        if (currentModal && currentModal.id === modalId) {
          return null;
        }
        return currentModal;
      });
    };

    const content = renderContent(hideThisModal);
    setModal({ id: modalId, content });
  }, []);

  const hideModal = useCallback(() => {
    setModal(null);
  }, []);

  const value = {
    modalContent: modal ? modal.content : null,
    showModal,
    hideModal,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};
