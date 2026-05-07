import React from "react";

import RowBasedMenuContent from "./RowBasedMenuContent";

const RowBasedMenuSectionPanels = ({
  activeItems,
  activeSectionIndex,
  emptyMessage,
  getSelectedIndex,
  hasSections,
  itemKey,
  onItemClick,
  renderEmpty,
  renderItem,
  sections,
}) => {
  if (!hasSections) {
    return (
      <RowBasedMenuContent
        emptyMessage={emptyMessage}
        getSelectedIndex={getSelectedIndex}
        itemKey={itemKey}
        onItemClick={onItemClick}
        renderEmpty={renderEmpty}
        renderItem={renderItem}
        sectionIndex={activeSectionIndex}
        sectionItems={activeItems}
      />
    );
  }

  return (
    <div className="row-based-menu-section-panels">
      {sections.map((section, index) => {
        const isPanelActive = index === activeSectionIndex;

        return (
          <div
            key={section.id || index}
            className={`row-based-menu-section-panel ${
              isPanelActive ? "active" : ""
            }`}
            aria-hidden={!isPanelActive}
          >
            <RowBasedMenuContent
              emptyMessage={emptyMessage}
              getSelectedIndex={getSelectedIndex}
              itemKey={itemKey}
              onItemClick={onItemClick}
              renderEmpty={renderEmpty}
              renderItem={renderItem}
              sectionIndex={index}
              sectionItems={section.items || []}
            />
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(RowBasedMenuSectionPanels);
