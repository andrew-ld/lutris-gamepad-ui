import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const FOCUS_SCROLL_BUFFER = 15;
const OVERSCAN_COUNT = 2;
const MAX_INITIAL_RENDER_COUNT = 30;
const EMPTY_ITEM_HEIGHTS = {};
const defaultItemKey = (_item, index) => index;

const getWheelDelta = (event, lineHeight, pageHeight) => {
  if (event.deltaMode === 1) {
    return event.deltaY * lineHeight;
  }

  if (event.deltaMode === 2) {
    return event.deltaY * pageHeight;
  }

  return event.deltaY;
};

const VirtualizedList = ({
  items,
  selectedIndex,
  renderItem,
  onItemClick,
  itemKey = defaultItemKey,
  className = "",
}) => {
  const containerRef = useRef(null);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [containerPaddingTop, setContainerPaddingTop] = useState(0);
  const [itemHeights, setItemHeights] = useState({});
  const [baseHeight, setBaseHeight] = useState(64);
  const [currentScrollTop, setCurrentScrollTop] = useState(0);
  const [scrollAnchor, setScrollAnchor] = useState(() => ({
    items,
    selectedIndex,
    shouldAlignSelectedItem: true,
  }));

  const safeSelectedIndex = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return Math.max(0, Math.min(selectedIndex, items.length - 1));
  }, [items, selectedIndex]);

  const itemsChanged = scrollAnchor.items !== items;

  if (itemsChanged && Object.keys(itemHeights).length > 0) {
    setItemHeights(EMPTY_ITEM_HEIGHTS);
  }

  const measuredItemHeights = itemsChanged ? EMPTY_ITEM_HEIGHTS : itemHeights;

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const measureContainer = () => {
      const container = containerRef.current;
      if (!container) return;

      const style = globalThis.getComputedStyle(container);
      const paddingTop = Number.parseFloat(style.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;

      setContainerPaddingTop(paddingTop);

      const availableHeight =
        container.clientHeight - paddingTop - paddingBottom;
      if (availableHeight > 0) {
        setViewportHeight(availableHeight);
      }
    };

    measureContainer();

    const resizeObserver = new ResizeObserver(measureContainer);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const measureRef = useCallback((node, index) => {
    if (!node) return;

    const style = globalThis.getComputedStyle(node);
    const margin = Number.parseFloat(style.marginBottom) || 0;

    const rect = node.getBoundingClientRect();
    const totalHeight = rect.height + margin;

    setItemHeights((previousHeights) => {
      if (previousHeights[index] === totalHeight) return previousHeights;
      return { ...previousHeights, [index]: totalHeight };
    });

    if (index === 0) {
      setBaseHeight((prev) => (prev === totalHeight ? prev : totalHeight));
    }
  }, []);

  const getCumulativeHeight = useCallback(
    (targetIndex) => {
      let total = 0;
      for (let i = 0; i < targetIndex; i++) {
        total += measuredItemHeights[i] || baseHeight;
      }
      return total;
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

  const scrollStateTop = itemsChanged ? 0 : currentScrollTop;
  const clampedScrollTop = isVirtualizing
    ? Math.max(0, Math.min(scrollStateTop, maxScrollTop))
    : 0;

  let targetScrollTop = clampedScrollTop;
  let nextScrollAnchor = scrollAnchor;

  if (isVirtualizing) {
    const selectionChanged = scrollAnchor.selectedIndex !== safeSelectedIndex;
    const shouldAlignSelectedItem =
      itemsChanged || selectionChanged || scrollAnchor.shouldAlignSelectedItem;

    if (shouldAlignSelectedItem) {
      const itemTop = getCumulativeHeight(safeSelectedIndex);
      const itemHeight = measuredItemHeights[safeSelectedIndex] || baseHeight;
      const itemBottom = itemTop + itemHeight;

      const topBoundary = clampedScrollTop + FOCUS_SCROLL_BUFFER;
      const bottomBoundary =
        clampedScrollTop + viewportHeight - FOCUS_SCROLL_BUFFER;

      if (itemTop < topBoundary) {
        targetScrollTop = itemTop - FOCUS_SCROLL_BUFFER;
      } else if (itemBottom > bottomBoundary) {
        targetScrollTop = itemBottom + FOCUS_SCROLL_BUFFER - viewportHeight;
      }

      targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
    }
    if (shouldAlignSelectedItem) {
      nextScrollAnchor = {
        items,
        selectedIndex: safeSelectedIndex,
        shouldAlignSelectedItem: false,
      };
    }
  } else if (
    itemsChanged ||
    scrollAnchor.selectedIndex !== safeSelectedIndex ||
    !scrollAnchor.shouldAlignSelectedItem
  ) {
    nextScrollAnchor = {
      items,
      selectedIndex: safeSelectedIndex,
      shouldAlignSelectedItem: true,
    };
  }

  if (nextScrollAnchor !== scrollAnchor) {
    setScrollAnchor(nextScrollAnchor);
  }

  if (Math.abs(targetScrollTop - currentScrollTop) > 0.5) {
    setCurrentScrollTop(targetScrollTop);
  }

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
      setCurrentScrollTop((previousScrollTop) =>
        Math.max(0, Math.min(previousScrollTop + delta, maxScrollTop)),
      );
    },
    [baseHeight, isVirtualizing, maxScrollTop, viewportHeight],
  );

  let renderStartIndex = 0;
  let renderEndIndex = items.length;
  let isActuallyVirtualizing = false;

  if (isVirtualizing) {
    let accumulatedHeight = 0;
    let coreStartIndex = 0;

    while (coreStartIndex < items.length) {
      const currentItemHeight =
        measuredItemHeights[coreStartIndex] || baseHeight;
      if (accumulatedHeight + currentItemHeight > targetScrollTop) {
        break;
      }
      accumulatedHeight += currentItemHeight;
      coreStartIndex++;
    }

    let endAccumulatedHeight = accumulatedHeight;
    let coreEndIndex = coreStartIndex;

    while (
      coreEndIndex < items.length &&
      endAccumulatedHeight < targetScrollTop + viewportHeight
    ) {
      endAccumulatedHeight += measuredItemHeights[coreEndIndex] || baseHeight;
      coreEndIndex++;
    }

    isActuallyVirtualizing = coreStartIndex > 0 || coreEndIndex < items.length;

    renderStartIndex = Math.max(0, coreStartIndex - OVERSCAN_COUNT);
    renderEndIndex = Math.min(items.length, coreEndIndex + OVERSCAN_COUNT);
  } else if (viewportHeight === 0 && items.length > MAX_INITIAL_RENDER_COUNT) {
    renderEndIndex = Math.min(items.length, MAX_INITIAL_RENDER_COUNT);
    isActuallyVirtualizing = true;
  }

  const visibleItems = items
    .slice(renderStartIndex, renderEndIndex)
    .map((item, offset) => ({
      item,
      originalIndex: renderStartIndex + offset,
    }));

  const scrollBarInfo = (() => {
    if (!isActuallyVirtualizing) return null;

    const minThumbHeight = 20;
    const thumbHeightRatio = viewportHeight / totalContentHeight;
    const thumbHeight = Math.max(
      minThumbHeight,
      thumbHeightRatio * viewportHeight,
    );

    const scrollableRange = totalContentHeight - viewportHeight;
    const thumbScrollableRange = viewportHeight - thumbHeight;

    const scrollPercentage =
      scrollableRange > 0 ? targetScrollTop / scrollableRange : 0;
    const thumbTopPosition =
      containerPaddingTop + scrollPercentage * thumbScrollableRange;

    return { top: thumbTopPosition, height: thumbHeight };
  })();

  const topSpacerHeight = getCumulativeHeight(renderStartIndex);
  const bottomSpacerHeight = Math.max(
    0,
    totalContentHeight - getCumulativeHeight(renderEndIndex),
  );

  const roundedScrollTop = Math.round(targetScrollTop);
  const roundedTopSpacerHeight = Math.round(topSpacerHeight);
  const roundedBottomSpacerHeight = Math.round(bottomSpacerHeight);

  const innerListStyle = {
    transform: isActuallyVirtualizing
      ? `translate3d(0, ${-roundedScrollTop}px, 0)`
      : "none",
    transition: isActuallyVirtualizing ? "transform 0.2s ease-out" : "none",
    willChange: isActuallyVirtualizing ? "transform" : "auto",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  };

  return (
    <div
      ref={containerRef}
      className={className}
      onWheel={handleWheel}
      style={{
        overflow: "hidden",
        position: "relative",
        flex: "1 1 auto",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="virtualized-list-inner" style={innerListStyle}>
        {isActuallyVirtualizing && (
          <div style={{ height: roundedTopSpacerHeight, flexShrink: 0 }} />
        )}

        {visibleItems.map(({ item, originalIndex }) => {
          const isSelected = originalIndex === safeSelectedIndex;
          const element = renderItem(item, isSelected, () =>
            onItemClick(originalIndex),
          );

          if (!element) return null;

          return React.cloneElement(element, {
            key: itemKey(item, originalIndex) ?? originalIndex,
            ref: (node) => measureRef(node, originalIndex),
          });
        })}

        {isActuallyVirtualizing && (
          <div style={{ height: roundedBottomSpacerHeight, flexShrink: 0 }} />
        )}
      </div>

      {scrollBarInfo && (
        <div
          className="virtualized-list-scrollbar"
          style={{
            position: "absolute",
            right: "0.25rem",
            top: `${scrollBarInfo.top}px`,
            width: "0.25rem",
            height: `${scrollBarInfo.height}px`,
            backgroundColor: "var(--accent-color)",
            borderRadius: "999rem",
            opacity: 0.6,
            transition: "top 0.2s ease-out",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

export default React.memo(VirtualizedList);
