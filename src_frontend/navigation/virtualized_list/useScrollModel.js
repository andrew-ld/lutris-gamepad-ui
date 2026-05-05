import { useCallback, useMemo, useState } from "react";

import {
  alignScrollTopToSelection,
  calculateCumulativeHeight,
  clamp,
  getWheelDelta,
  haveSameItemKeys,
} from "./utils";

export const useScrollModel = ({
  baseHeight,
  containerRef,
  itemKey,
  items,
  measuredItemHeights,
  selectedIndex,
  viewportHeight,
}) => {
  const [scrollState, setScrollState] = useState(() => ({
    items,
    selectedIndex,
    scrollTop: 0,
    shouldAlignSelectedItem: true,
  }));

  const safeSelectedIndex = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return Math.max(0, Math.min(selectedIndex, items.length - 1));
  }, [items, selectedIndex]);

  const scrollItemsMatch = useMemo(
    () => haveSameItemKeys(scrollState.items, items, itemKey),
    [scrollState.items, items, itemKey],
  );
  const itemsChanged = !scrollItemsMatch;

  const getCumulativeHeight = useCallback(
    (targetIndex) => {
      return calculateCumulativeHeight(
        measuredItemHeights,
        baseHeight,
        targetIndex,
      );
    },
    [measuredItemHeights, baseHeight],
  );

  const totalContentHeight = useMemo(
    () => getCumulativeHeight(items.length),
    [items, getCumulativeHeight],
  );

  const isVirtualizing =
    viewportHeight > 0 && totalContentHeight > viewportHeight + 2;

  const maxScrollTop = useMemo(
    () =>
      isVirtualizing ? Math.max(0, totalContentHeight - viewportHeight) : 0,
    [isVirtualizing, totalContentHeight, viewportHeight],
  );

  const selectionChanged = scrollState.selectedIndex !== safeSelectedIndex;
  const shouldAlignSelectedItem =
    itemsChanged || selectionChanged || scrollState.shouldAlignSelectedItem;
  const scrollStateTop = itemsChanged ? 0 : scrollState.scrollTop;
  const clampedScrollTop = isVirtualizing
    ? clamp(scrollStateTop, 0, maxScrollTop)
    : 0;

  const displayedScrollTop =
    isVirtualizing && shouldAlignSelectedItem
      ? alignScrollTopToSelection({
          selectedIndex: safeSelectedIndex,
          scrollTop: clampedScrollTop,
          viewportHeight,
          maxScrollTop,
          heights: measuredItemHeights,
          fallbackHeight: baseHeight,
        })
      : clampedScrollTop;

  const handleWheel = useCallback(
    (event) => {
      if (!isVirtualizing || maxScrollTop <= 0) {
        return;
      }

      const pageHeight = viewportHeight || containerRef.current?.clientHeight;
      const delta = getWheelDelta(event, baseHeight, pageHeight || baseHeight);

      if (Math.abs(delta) < 0.5) {
        return;
      }

      event.preventDefault();

      setScrollState({
        items,
        selectedIndex: safeSelectedIndex,
        scrollTop: clamp(displayedScrollTop + delta, 0, maxScrollTop),
        shouldAlignSelectedItem: false,
      });
    },
    [
      baseHeight,
      containerRef,
      displayedScrollTop,
      isVirtualizing,
      items,
      maxScrollTop,
      safeSelectedIndex,
      viewportHeight,
    ],
  );

  return {
    displayedScrollTop,
    getCumulativeHeight,
    handleWheel,
    isVirtualizing,
    safeSelectedIndex,
    totalContentHeight,
  };
};
