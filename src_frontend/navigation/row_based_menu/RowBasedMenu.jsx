import React from "react";

import RowBasedMenuSectionPanels from "./RowBasedMenuSectionPanels";
import RowBasedMenuSectionTabs from "./RowBasedMenuSectionTabs";
import {
  defaultRowBasedMenuItemKey,
  useRowBasedMenuModel,
} from "./useRowBasedMenuModel";
import "../../styles/RowBasedMenu.css";

const RowBasedMenu = ({
  items: baseItems,
  sections,
  renderItem,
  onAction,
  focusId,
  isActive = true,
  onFocusChange,
  onFocusLost,
  itemKey = defaultRowBasedMenuItemKey,
  renderEmpty,
  initialSectionIndex = 0,
  initialSelectedIndex = 0,
  onStateChange,
  emptyMessage,
}) => {
  const {
    activeItems,
    activeSectionIndex,
    getSelectedIndex,
    handleItemClick,
    handleSectionClick,
    hasSections,
  } = useRowBasedMenuModel({
    baseItems,
    focusId,
    initialSectionIndex,
    initialSelectedIndex,
    isActive,
    itemKey,
    onAction,
    onFocusChange,
    onFocusLost,
    onStateChange,
    sections,
  });

  return (
    <div className="row-based-menu-container">
      <RowBasedMenuSectionTabs
        activeSectionIndex={activeSectionIndex}
        onSectionClick={handleSectionClick}
        sections={sections}
      />
      <RowBasedMenuSectionPanels
        activeItems={activeItems}
        activeSectionIndex={activeSectionIndex}
        emptyMessage={emptyMessage}
        getSelectedIndex={getSelectedIndex}
        hasSections={hasSections}
        itemKey={itemKey}
        onItemClick={handleItemClick}
        renderEmpty={renderEmpty}
        renderItem={renderItem}
        sections={sections}
      />
    </div>
  );
};

export default React.memo(RowBasedMenu);
