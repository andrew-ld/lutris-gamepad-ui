import { useEffect, useRef, useCallback } from "react";

export const useFocusManager = (activeCoords, numberColumns, isActive) => {
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

    // Clear previous focus
    for (const section of itemReferences.current) {
      if (section)
        for (const item of section) item?.classList.remove("focused");
    }

    const target = itemReferences.current[sectionIndex]?.[itemIndex];
    if (target) {
      target.classList.add("focused");
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

    // Scroll section into view if changed
    if (previousCoords.current?.sectionIndex !== sectionIndex) {
      const targetSection = sectionReferences.current[sectionIndex];
      targetSection?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    // Handle top-level scrolling for the first row of the first section
    const currentRow =
      numberColumns > 0 ? Math.floor(itemIndex / numberColumns) : 0;
    if (sectionIndex === 0 && currentRow === 0) {
      const scrollParent =
        containerReference.current?.closest(".legenda-content");
      if (scrollParent && scrollParent.scrollTop > 0) {
        scrollParent.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    previousCoords.current = activeCoords;
  }, [activeCoords, numberColumns, isActive]);

  return {
    containerRef: containerReference,
    setSectionRef: setSectionReference,
    setItemRef: setItemReference,
    itemRefs: itemReferences,
    sectionRefs: sectionReferences,
  };
};
