import { createContext, useContext, useState, useCallback } from "react";

const ModalContext = createContext(null);
export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modalContent, setModalContent] = useState(null);

  const showModal = useCallback((content) => {
    setModalContent(content);
  }, []);

  const hideModal = useCallback(() => {
    setModalContent(null);
  }, []);

  const value = {
    modalContent,
    showModal,
    hideModal,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};
