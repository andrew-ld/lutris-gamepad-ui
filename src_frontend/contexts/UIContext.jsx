import { createContext, useContext, useState, useCallback } from "react";

const UIContext = createContext(null);

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);

  const toggleSystemMenu = useCallback(() => {
    setIsSystemMenuOpen((prev) => !prev);
  }, []);

  const setSystemMenuOpen = useCallback((open) => {
    setIsSystemMenuOpen(open);
  }, []);

  const value = {
    isSystemMenuOpen,
    toggleSystemMenu,
    setSystemMenuOpen,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
