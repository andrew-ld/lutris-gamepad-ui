import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useInput } from "../contexts/InputContext";

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
  const { isMouseActive } = useInput();

  const containerRef = useRef(null);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [containerPaddingTop, setContainerPaddingTop] = useState(0);
  const [itemHeights, setItemHeights] = useState({});
  const [baseHeight, setBaseHeight] = useState(64);

  const [userScrollTop, setUserScrollTop] = useState(0);
  const [isAnimatedScroll, setIsAnimatedScroll] = useState(false);

  const isMouseActiveRef = useRef(isMouseActive);

  useLayoutEffect(() => {
    isMouseActiveRef.current = isMouseActive;
  }, [isMouseActive]);

  const safeSelectedIndex = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return Math.max(0, Math.min(selectedIndex, items.length - 1));
  }, [items, selectedIndex]);

  const [prevSafeIndex, setPrevSafeIndex] = useState(safeSelectedIndex);

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
      const prev = previousHeights[index];
      if (prev !== undefined && Math.abs(prev - totalHeight) < 0.5) {
        return previousHeights;
      }
      return { ...previousHeights, [index]: totalHeight };
    });

    if (index === 0) {
      setBaseHeight((prev) =>
        Math.abs(prev - totalHeight) < 0.5 ? prev : totalHeight,
      );
    }
  }, []);

  const { offsets, totalHeight } = useMemo(() => {
    const newOffsets = new Float64Array(items.length);
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      newOffsets[i] = total;
      total += itemHeights[i] || baseHeight;
    }
    return { offsets: newOffsets, totalHeight: total };
  }, [items.length, itemHeights, baseHeight]);

  const isVirtualizing = viewportHeight > 0 && totalHeight > viewportHeight + 2;
  const maxPossibleScroll = Math.max(0, totalHeight - viewportHeight);
  const clampedScrollTop = Math.max(
    0,
    Math.min(userScrollTop, maxPossibleScroll),
  );

  if (safeSelectedIndex !== prevSafeIndex) {
    setPrevSafeIndex(safeSelectedIndex);

    if (isVirtualizing) {
      const itemTop = offsets[safeSelectedIndex];
      const itemHeight = itemHeights[safeSelectedIndex] || baseHeight;
      const itemBottom = itemTop + itemHeight;

      const topBoundary = userScrollTop + FOCUS_SCROLL_BUFFER;
      const bottomBoundary =
        userScrollTop + viewportHeight - FOCUS_SCROLL_BUFFER;

      let newScroll = userScrollTop;

      if (itemTop < topBoundary) {
        newScroll = itemTop - FOCUS_SCROLL_BUFFER;
      } else if (itemBottom > bottomBoundary) {
        newScroll = itemBottom + FOCUS_SCROLL_BUFFER - viewportHeight;
      }

      const finalScroll = Math.max(0, Math.min(newScroll, maxPossibleScroll));

      if (finalScroll !== userScrollTop) {
        setUserScrollTop(finalScroll);
        setIsAnimatedScroll(true);
      }
    }
  }

  const scrollMetricsRef = useRef({ maxScroll: 0 });
  useEffect(() => {
    scrollMetricsRef.current.maxScroll = maxPossibleScroll;
  }, [maxPossibleScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVirtualizing) return;

    const handleWheel = (e) => {
      if (!isMouseActiveRef.current) return;

      e.preventDefault();
      setIsAnimatedScroll(false);
      setUserScrollTop((prev) => {
        return Math.max(
          0,
          Math.min(prev + e.deltaY, scrollMetricsRef.current.maxScroll),
        );
      });
    };

    let lastY = 0;
    const handleTouchStart = (e) => {
      lastY = e.touches[0].clientY;
      setIsAnimatedScroll(false);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const y = e.touches[0].clientY;
      const deltaY = lastY - y;
      lastY = y;
      setUserScrollTop((prev) => {
        return Math.max(
          0,
          Math.min(prev + deltaY, scrollMetricsRef.current.maxScroll),
        );
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isVirtualizing]);

  let renderStartIndex = 0;
  let renderEndIndex = items.length;
  let isActuallyVirtualizing = false;

  if (isVirtualizing) {
    let low = 0;
    let high = items.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (offsets[mid] <= clampedScrollTop) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const coreStartIndex = Math.max(0, low - 1);

    let coreEndIndex = coreStartIndex;
    while (
      coreEndIndex < items.length &&
      offsets[coreEndIndex] < clampedScrollTop + viewportHeight
    ) {
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
    const thumbHeightRatio = viewportHeight / totalHeight;
    const thumbHeight = Math.max(
      minThumbHeight,
      thumbHeightRatio * viewportHeight,
    );

    const scrollableRange = totalHeight - viewportHeight;
    const thumbScrollableRange = viewportHeight - thumbHeight;

    const scrollPercentage =
      scrollableRange > 0 ? clampedScrollTop / scrollableRange : 0;
    const thumbTopPosition =
      containerPaddingTop + scrollPercentage * thumbScrollableRange;

    return { top: thumbTopPosition, height: thumbHeight };
  })();

  const topSpacerHeight = renderStartIndex > 0 ? offsets[renderStartIndex] : 0;
  const bottomSpacerHeight = Math.max(
    0,
    totalHeight - (offsets[renderEndIndex] || totalHeight),
  );

  const roundedScrollTop = Math.round(clampedScrollTop);
  const roundedTopSpacerHeight = Math.round(topSpacerHeight);
  const roundedBottomSpacerHeight = Math.round(bottomSpacerHeight);

  const innerListStyle = {
    transform: isActuallyVirtualizing
      ? `translate3d(0, ${-roundedScrollTop}px, 0)`
      : "none",
    transition:
      isActuallyVirtualizing && isAnimatedScroll
        ? "transform 0.2s ease-out"
        : "none",
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
        touchAction: "none",
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
