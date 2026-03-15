import { useState, useEffect, useRef, useCallback } from "react";

export const useGridLayout = (shelfCount) => {
  const [numColumns, setNumColumns] = useState(0);
  const gridRefs = useRef([]);

  const setGridRef = useCallback((el, shelfIndex) => {
    gridRefs.current[shelfIndex] = el;
  }, []);

  useEffect(() => {
    const calculateAndUpdateColumns = () => {
      let maxColumns = 0;

      gridRefs.current.forEach((gridEl) => {
        if (gridEl) {
          const style = window.getComputedStyle(gridEl);
          const columns = style
            .getPropertyValue("grid-template-columns")
            .split(" ").length;
          if (columns > maxColumns) {
            maxColumns = columns;
          }
        }
      });

      setNumColumns((currentNumColumns) => {
        if (maxColumns !== currentNumColumns) {
          return maxColumns;
        }
        return currentNumColumns;
      });
    };

    calculateAndUpdateColumns();

    const observers = [];
    gridRefs.current.forEach((gridEl) => {
      if (!gridEl) return;
      const observer = new ResizeObserver(calculateAndUpdateColumns);
      observer.observe(gridEl);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [shelfCount]);

  return { numColumns, setGridRef, gridRefs };
};
