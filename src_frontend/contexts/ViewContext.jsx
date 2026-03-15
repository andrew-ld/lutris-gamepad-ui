import { createContext, useContext, useMemo } from "react";

const ViewContext = createContext({ resetSize: () => {} });

export const useViewActions = () => useContext(ViewContext);

export const ViewProvider = ({ children, onResetSize }) => {
  const value = useMemo(() => ({ resetSize: onResetSize }), [onResetSize]);
  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
};
