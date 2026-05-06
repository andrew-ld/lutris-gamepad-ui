import { useEffect, useRef, useCallback } from "react";

const FOCUSED_ITEM_SCROLL_MARGIN_PX = 64;

const scrollTargetIntoView = (scrollParent, target) => {
  if (!scrollParent) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    return;
  }

  const scrollParentRect = scrollParent.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const scrollMargin = Math.min(
    FOCUSED_ITEM_SCROLL_MARGIN_PX,
    scrollParentRect.height / 4,
  );

  const topOverflow = targetRect.top - scrollParentRect.top - scrollMargin;
  const bottomOverflow =
    targetRect.bottom - scrollParentRect.bottom + scrollMargin;

  if (topOverflow < 0) {
    scrollParent.scrollBy({ top: topOverflow, behavior: "smooth" });
  } else if (bottomOverflow > 0) {
    scrollParent.scrollBy({ top: bottomOverflow, behavior: "smooth" });
  }
};

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

    const { sectionIndex, itemIndex, preventScroll, sectionJump } =
      activeCoords;
    const previousSectionIndex = previousCoords.current?.sectionIndex;
    const shouldScrollSection =
      previousSectionIndex !== sectionIndex && sectionJump;
    const scrollParent = scrollParentRef?.current;

    const target = itemReferences.current[sectionIndex]?.[itemIndex];
    if (target) {
      target.focus({ preventScroll: true });

      if (!preventScroll && !shouldScrollSection) {
        scrollTargetIntoView(scrollParent, target);
      }
    }

    const currentRow =
      numberColumns > 0 ? Math.floor(itemIndex / numberColumns) : 0;
    const isFirstRowOfFirstSection = sectionIndex === 0 && currentRow === 0;

    if (preventScroll) {
      previousCoords.current = activeCoords;
      return;
    }

    if (shouldScrollSection) {
      if (isFirstRowOfFirstSection && scrollParent) {
        scrollParent.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const targetSection = sectionReferences.current[sectionIndex];
        targetSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    } else if (
      isFirstRowOfFirstSection &&
      scrollParent &&
      scrollParent.scrollTop > 0
    ) {
      scrollParent.scrollTo({ top: 0, behavior: "smooth" });
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
