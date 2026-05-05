import React from "react";

const VirtualizedListScrollbar = ({ scrollBarInfo }) => {
  if (!scrollBarInfo) {
    return null;
  }

  return (
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
  );
};

export default React.memo(VirtualizedListScrollbar);
