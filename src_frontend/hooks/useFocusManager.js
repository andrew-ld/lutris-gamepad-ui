import { useEffect, useRef, useCallback } from "react";

export const useFocusManager = (activeCoords, numColumns, isActive) => {
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const sectionRefs = useRef([]);
  const prevCoords = useRef(null);

  const setSectionRef = useCallback((el, index) => {
    sectionRefs.current[index] = el;
  }, []);

  const setItemRef = useCallback((el, sectionIndex, itemIndex) => {
    if (!itemRefs.current[sectionIndex]) {
      itemRefs.current[sectionIndex] = [];
    }
    itemRefs.current[sectionIndex][itemIndex] = el;
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const { sectionIndex, itemIndex, preventScroll } = activeCoords;

    // Clear previous focus
    itemRefs.current.forEach((section) => {
      section?.forEach((item) => item?.classList.remove("focused"));
    });

    const target = itemRefs.current[sectionIndex]?.[itemIndex];
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
    if (prevCoords.current?.sectionIndex !== sectionIndex) {
      const targetSection = sectionRefs.current[sectionIndex];
      targetSection?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    // Handle top-level scrolling for the first row of the first section
    const currentRow = numColumns > 0 ? Math.floor(itemIndex / numColumns) : 0;
    if (sectionIndex === 0 && currentRow === 0) {
      const scrollParent = containerRef.current?.closest(".legenda-content");
      if (scrollParent && scrollParent.scrollTop > 0) {
        scrollParent.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    prevCoords.current = activeCoords;
  }, [activeCoords, numColumns, isActive]);

  return {
    containerRef,
    setSectionRef,
    setItemRef,
    itemRefs,
    sectionRefs,
  };
};
