import { useMemo } from "react";

export const useStaticSettings = () => {
  const staticSettings = useMemo(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const result = {};
    for (const [key, value] of params.entries()) {
      const validKey = key.startsWith("DISABLE_") || key.startsWith("ENABLE_");
      if (validKey) {
        result[key] = value === "1";
      }
    }
    return result;
  }, []);

  return { staticSettings };
};
