import { useRef } from "react";

import { useItemMeasurements } from "./useItemMeasurements";
import { useScrollModel } from "./useScrollModel";
import { useViewportMetrics } from "./useViewportMetrics";
import { useVisibleWindow } from "./useVisibleWindow";

export const useVirtualizedListModel = ({
  items,
  selectedIndex,
  itemKey,
}) => {
  const containerRef = useRef(null);
  const { containerPaddingTop, viewportHeight } =
    useViewportMetrics(containerRef);
  const { baseHeight, measureRef, measuredItemHeights } =
    useItemMeasurements({
      items,
      itemKey,
    });
  const {
    displayedScrollTop,
    getCumulativeHeight,
    handleWheel,
    isVirtualizing,
    safeSelectedIndex,
    totalContentHeight,
  } = useScrollModel({
    baseHeight,
    containerRef,
    itemKey,
    items,
    measuredItemHeights,
    selectedIndex,
    viewportHeight,
  });
  const visibleWindow = useVisibleWindow({
    baseHeight,
    containerPaddingTop,
    displayedScrollTop,
    getCumulativeHeight,
    isVirtualizing,
    items,
    measuredItemHeights,
    totalContentHeight,
    viewportHeight,
  });

  return {
    containerRef,
    handleWheel,
    measureRef,
    safeSelectedIndex,
    ...visibleWindow,
  };
};
