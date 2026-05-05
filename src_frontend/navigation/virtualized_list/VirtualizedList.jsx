import React from "react";

import { useVirtualizedListModel } from "./useVirtualizedListModel";
import VirtualizedListItems from "./VirtualizedListItems";
import VirtualizedListScrollbar from "./VirtualizedListScrollbar";

const defaultItemKey = (_item, index) => index;

const VirtualizedList = ({
  items,
  selectedIndex,
  renderItem,
  onItemClick,
  itemKey = defaultItemKey,
  className = "",
}) => {
  const {
    bottomSpacerHeight,
    containerRef,
    handleWheel,
    innerListStyle,
    measureRef,
    safeSelectedIndex,
    scrollBarInfo,
    topSpacerHeight,
    visibleItems,
    visibleRange,
  } = useVirtualizedListModel({
    items,
    selectedIndex,
    itemKey,
  });

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
        <VirtualizedListItems
          itemKey={itemKey}
          measureRef={measureRef}
          onItemClick={onItemClick}
          renderItem={renderItem}
          safeSelectedIndex={safeSelectedIndex}
          topSpacerHeight={topSpacerHeight}
          bottomSpacerHeight={bottomSpacerHeight}
          visibleItems={visibleItems}
          visibleRange={visibleRange}
        />
      </div>
      <VirtualizedListScrollbar scrollBarInfo={scrollBarInfo} />
    </div>
  );
};

export default React.memo(VirtualizedList);
