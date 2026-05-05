export const MAX_INITIAL_RENDER_COUNT = 30;
export const EMPTY_ITEM_HEIGHTS = {};
const FOCUS_SCROLL_BUFFER = 15;
const OVERSCAN_COUNT = 2;

export const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(value, maximum));

export const getWheelDelta = (event, lineHeight, pageHeight) => {
  if (event.deltaMode === 1) {
    return event.deltaY * lineHeight;
  }

  if (event.deltaMode === 2) {
    return event.deltaY * pageHeight;
  }

  return event.deltaY;
};

export const haveSameItemKeys = (previousItems, nextItems, itemKey) => {
  if (previousItems === nextItems) {
    return true;
  }

  if (previousItems.length !== nextItems.length) {
    return false;
  }

  for (const [index, item] of nextItems.entries()) {
    if (
      (itemKey(previousItems[index], index) ?? index) !==
      (itemKey(item, index) ?? index)
    ) {
      return false;
    }
  }

  return true;
};

const getItemHeight = (heights, index, fallbackHeight) =>
  heights[index] || fallbackHeight;

export const getElementTotalHeight = (element) => {
  const style = globalThis.getComputedStyle(element);
  const marginBottom = Number.parseFloat(style.marginBottom) || 0;
  const { height } = element.getBoundingClientRect();
  return height + marginBottom;
};

export const calculateCumulativeHeight = (
  heights,
  fallbackHeight,
  targetIndex,
) => {
  let totalHeight = 0;
  let index = 0;

  while (index < targetIndex) {
    totalHeight += getItemHeight(heights, index, fallbackHeight);
    index += 1;
  }

  return totalHeight;
};

export const alignScrollTopToSelection = ({
  selectedIndex,
  scrollTop,
  viewportHeight,
  maxScrollTop,
  heights,
  fallbackHeight,
}) => {
  const itemTop = calculateCumulativeHeight(
    heights,
    fallbackHeight,
    selectedIndex,
  );
  const itemHeight = getItemHeight(heights, selectedIndex, fallbackHeight);
  const itemBottom = itemTop + itemHeight;
  const topBoundary = scrollTop + FOCUS_SCROLL_BUFFER;
  const bottomBoundary = scrollTop + viewportHeight - FOCUS_SCROLL_BUFFER;

  if (itemTop < topBoundary) {
    return clamp(itemTop - FOCUS_SCROLL_BUFFER, 0, maxScrollTop);
  }

  if (itemBottom > bottomBoundary) {
    return clamp(
      itemBottom + FOCUS_SCROLL_BUFFER - viewportHeight,
      0,
      maxScrollTop,
    );
  }

  return scrollTop;
};

export const getVisibleRange = ({
  itemCount,
  scrollTop,
  viewportHeight,
  heights,
  fallbackHeight,
}) => {
  let startIndex = 0;
  let accumulatedHeight = 0;

  while (startIndex < itemCount) {
    const currentItemHeight = getItemHeight(
      heights,
      startIndex,
      fallbackHeight,
    );
    if (accumulatedHeight + currentItemHeight > scrollTop) {
      break;
    }
    accumulatedHeight += currentItemHeight;
    startIndex += 1;
  }

  let endIndex = startIndex;
  let endAccumulatedHeight = accumulatedHeight;

  while (
    endIndex < itemCount &&
    endAccumulatedHeight < scrollTop + viewportHeight
  ) {
    endAccumulatedHeight += getItemHeight(heights, endIndex, fallbackHeight);
    endIndex += 1;
  }

  return {
    startIndex: Math.max(0, startIndex - OVERSCAN_COUNT),
    endIndex: Math.min(itemCount, endIndex + OVERSCAN_COUNT),
    isVirtualized: startIndex > 0 || endIndex < itemCount,
  };
};

export const getScrollBarInfo = ({
  isVisible,
  viewportHeight,
  totalContentHeight,
  scrollTop,
  containerPaddingTop,
}) => {
  if (!isVisible) {
    return null;
  }

  const minimumThumbHeight = 20;
  const thumbHeightRatio = viewportHeight / totalContentHeight;
  const thumbHeight = Math.max(
    minimumThumbHeight,
    thumbHeightRatio * viewportHeight,
  );
  const scrollableRange = totalContentHeight - viewportHeight;
  const thumbScrollableRange = viewportHeight - thumbHeight;
  const scrollPercentage =
    scrollableRange > 0 ? scrollTop / scrollableRange : 0;

  return {
    top: containerPaddingTop + scrollPercentage * thumbScrollableRange,
    height: thumbHeight,
  };
};

export const getInnerListStyle = (isVirtualized, scrollTop) => ({
  transform: isVirtualized
    ? `translate3d(0, ${-Math.round(scrollTop)}px, 0)`
    : "none",
  transition: isVirtualized ? "transform 0.2s ease-out" : "none",
  willChange: isVirtualized ? "transform" : "auto",
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
});
