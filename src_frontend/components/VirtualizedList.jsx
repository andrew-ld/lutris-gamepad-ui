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

const VirtualizedList = ({
  items,
  selectedIndex,
  renderItem,
  onItemClick,
  className = "",
}) => {
  const containerRef = useRef(null);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [containerPaddingTop, setContainerPaddingTop] = useState(0);
  const [itemHeights, setItemHeights] = useState({});
  const [baseHeight, setBaseHeight] = useState(64);
  const [currentScrollTop, setCurrentScrollTop] = useState(0);

  const safeSelectedIndex = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return Math.max(0, Math.min(selectedIndex, items.length - 1));
  }, [items, selectedIndex]);

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
        total += itemHeights[i] || baseHeight;
      }
      return total;
    },
    [itemHeights, baseHeight],
  );

  const totalContentHeight = useMemo(
    () => getCumulativeHeight(items.length),
    [items, getCumulativeHeight],
  );

  const isVirtualizing =
    viewportHeight > 0 && totalContentHeight > viewportHeight + 2;

  let targetScrollTop = currentScrollTop;

  if (isVirtualizing) {
    const itemTop = getCumulativeHeight(safeSelectedIndex);
    const itemHeight = itemHeights[safeSelectedIndex] || baseHeight;
    const itemBottom = itemTop + itemHeight;

    const topBoundary = targetScrollTop + FOCUS_SCROLL_BUFFER;
    const bottomBoundary =
      targetScrollTop + viewportHeight - FOCUS_SCROLL_BUFFER;

    if (itemTop < topBoundary) {
      targetScrollTop = itemTop - FOCUS_SCROLL_BUFFER;
    } else if (itemBottom > bottomBoundary) {
      targetScrollTop = itemBottom + FOCUS_SCROLL_BUFFER - viewportHeight;
    }

    const maxPossibleScroll = Math.max(0, totalContentHeight - viewportHeight);
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxPossibleScroll));
  } else {
    targetScrollTop = 0;
  }

  if (Math.abs(targetScrollTop - currentScrollTop) > 0.5) {
    setCurrentScrollTop(targetScrollTop);
  }

  let renderStartIndex = 0;
  let renderEndIndex = items.length;
  let isActuallyVirtualizing = false;

  if (isVirtualizing) {
    let accumulatedHeight = 0;
    let coreStartIndex = 0;

    while (coreStartIndex < items.length) {
      const currentItemHeight = itemHeights[coreStartIndex] || baseHeight;
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
      endAccumulatedHeight += itemHeights[coreEndIndex] || baseHeight;
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
            key: originalIndex,
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
            right: "4px",
            top: `${scrollBarInfo.top}px`,
            width: "4px",
            height: `${scrollBarInfo.height}px`,
            backgroundColor: "var(--accent-color)",
            borderRadius: "2px",
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
