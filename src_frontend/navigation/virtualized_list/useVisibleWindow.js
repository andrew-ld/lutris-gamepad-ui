import { useMemo } from "react";

import {
  getInnerListStyle,
  getScrollBarInfo,
  getVisibleRange,
  MAX_INITIAL_RENDER_COUNT,
} from "./utils";

export const useVisibleWindow = ({
  baseHeight,
  containerPaddingTop,
  displayedScrollTop,
  getCumulativeHeight,
  isVirtualizing,
  items,
  measuredItemHeights,
  totalContentHeight,
  viewportHeight,
}) => {
  const visibleRange = useMemo(() => {
    if (isVirtualizing) {
      const range = getVisibleRange({
        itemCount: items.length,
        scrollTop: displayedScrollTop,
        viewportHeight,
        heights: measuredItemHeights,
        fallbackHeight: baseHeight,
      });
      return { ...range, isVirtualized: true };
    }

    if (viewportHeight === 0 && items.length > MAX_INITIAL_RENDER_COUNT) {
      return {
        startIndex: 0,
        endIndex: Math.min(items.length, MAX_INITIAL_RENDER_COUNT),
        isVirtualized: true,
      };
    }

    return {
      startIndex: 0,
      endIndex: items.length,
      isVirtualized: false,
    };
  }, [
    baseHeight,
    displayedScrollTop,
    isVirtualizing,
    items.length,
    measuredItemHeights,
    viewportHeight,
  ]);

  const visibleItems = useMemo(
    () =>
      items
        .slice(visibleRange.startIndex, visibleRange.endIndex)
        .map((item, offset) => ({
          item,
          originalIndex: visibleRange.startIndex + offset,
        })),
    [items, visibleRange.endIndex, visibleRange.startIndex],
  );

  const scrollBarInfo = getScrollBarInfo({
    isVisible: visibleRange.isVirtualized,
    viewportHeight,
    totalContentHeight,
    scrollTop: displayedScrollTop,
    containerPaddingTop,
  });

  return {
    bottomSpacerHeight: Math.max(
      0,
      totalContentHeight - getCumulativeHeight(visibleRange.endIndex),
    ),
    innerListStyle: getInnerListStyle(
      visibleRange.isVirtualized,
      displayedScrollTop,
    ),
    scrollBarInfo,
    topSpacerHeight: getCumulativeHeight(visibleRange.startIndex),
    visibleItems,
    visibleRange,
  };
};
