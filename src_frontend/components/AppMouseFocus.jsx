import { useEffect } from "react";

import { useInput } from "../contexts/InputContext";

const AppMouseFocus = () => {
  const { subscribe } = useInput();

  useEffect(() => {
    let timeoutId;

    const handleMouseMove = () => {
      document.body.classList.add("mouse-active");
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        document.body.classList.remove("mouse-active");
      }, 500);
    };

    const handleGameInput = () => {
      if (document.body.classList.contains("mouse-active")) {
        clearTimeout(timeoutId);
        document.body.classList.remove("mouse-active");
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    const unsubscribe = subscribe(handleGameInput);

    document.body.classList.remove("mouse-active");

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [subscribe]);

  return null;
};

export default AppMouseFocus;
