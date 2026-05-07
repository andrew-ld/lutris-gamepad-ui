import React from "react";

import { useTranslation } from "../../stores/translationStore";
import VirtualizedList from "../virtualized_list/VirtualizedList";

const RowBasedMenuContent = ({
  emptyMessage,
  getSelectedIndex,
  itemKey,
  onItemClick,
  renderEmpty,
  renderItem,
  sectionIndex,
  sectionItems,
}) => {
  const { t } = useTranslation();

  if (sectionItems.length === 0) {
    if (renderEmpty) {
      return renderEmpty();
    }

    return (
      <div className="row-based-menu-empty">
        <p>{emptyMessage || t("No items available.")}</p>
      </div>
    );
  }

  return (
    <VirtualizedList
      items={sectionItems}
      selectedIndex={getSelectedIndex(sectionItems, sectionIndex)}
      renderItem={renderItem}
      onItemClick={(index) => onItemClick(sectionIndex, sectionItems, index)}
      itemKey={itemKey}
      className="row-based-menu-list"
    />
  );
};

export default React.memo(RowBasedMenuContent);
