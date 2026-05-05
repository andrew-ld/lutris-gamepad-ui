import React from "react";

const VirtualizedListItems = ({
  itemKey,
  measureRef,
  onItemClick,
  renderItem,
  safeSelectedIndex,
  topSpacerHeight,
  bottomSpacerHeight,
  visibleItems,
  visibleRange,
}) => {
  return (
    <>
      {visibleRange.isVirtualized && (
        <div style={{ height: Math.round(topSpacerHeight), flexShrink: 0 }} />
      )}

      {visibleItems.map(({ item, originalIndex }) => {
        const isSelected = originalIndex === safeSelectedIndex;
        const element = renderItem(
          item,
          isSelected,
          () => onItemClick(originalIndex),
          (node) => measureRef(node, originalIndex),
        );

        if (!element) {
          return null;
        }

        return (
          <React.Fragment key={itemKey(item, originalIndex) ?? originalIndex}>
            {element}
          </React.Fragment>
        );
      })}

      {visibleRange.isVirtualized && (
        <div
          style={{ height: Math.round(bottomSpacerHeight), flexShrink: 0 }}
        />
      )}
    </>
  );
};

export default React.memo(VirtualizedListItems);
