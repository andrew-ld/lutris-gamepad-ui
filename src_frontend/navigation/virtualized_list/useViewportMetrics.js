import { useLayoutEffect, useState } from "react";

export const useViewportMetrics = (containerRef) => {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [containerPaddingTop, setContainerPaddingTop] = useState(0);

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

    const animationFrameId = requestAnimationFrame(measureContainer);
    const resizeObserver = new ResizeObserver(measureContainer);
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return {
    containerPaddingTop,
    viewportHeight,
  };
};
