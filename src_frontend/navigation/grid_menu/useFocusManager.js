import { useEffect, useRef, useCallback } from "react";

export const useFocusManager = (
  activeCoords,
  numberColumns,
  isActive,
  scrollParentRef,
) => {
  const containerReference = useRef(null);
  const itemReferences = useRef([]);
  const sectionReferences = useRef([]);
  const previousCoords = useRef(null);

  const setSectionReference = useCallback((element, index) => {
    sectionReferences.current[index] = element;
  }, []);

  const setItemReference = useCallback((element, sectionIndex, itemIndex) => {
    if (!itemReferences.current[sectionIndex]) {
      itemReferences.current[sectionIndex] = [];
    }
    itemReferences.current[sectionIndex][itemIndex] = element;
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const { sectionIndex, itemIndex, preventScroll } = activeCoords;

    const target = itemReferences.current[sectionIndex]?.[itemIndex];
    if (target) {
      if (preventScroll) {
        target.focus({ preventScroll: true });
      } else {
        target.focus();
        target.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }

    if (previousCoords.current?.sectionIndex !== sectionIndex) {
      const targetSection = sectionReferences.current[sectionIndex];
      targetSection?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    const currentRow =
      numberColumns > 0 ? Math.floor(itemIndex / numberColumns) : 0;
    if (sectionIndex === 0 && currentRow === 0) {
      const scrollParent = scrollParentRef?.current;
      if (scrollParent && scrollParent.scrollTop > 0) {
        scrollParent.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    previousCoords.current = activeCoords;
  }, [activeCoords, numberColumns, isActive, scrollParentRef]);

  return {
    containerRef: containerReference,
    itemRefs: itemReferences,
    sectionRefs: sectionReferences,
    setItemRef: setItemReference,
    setSectionRef: setSectionReference,
  };
};
