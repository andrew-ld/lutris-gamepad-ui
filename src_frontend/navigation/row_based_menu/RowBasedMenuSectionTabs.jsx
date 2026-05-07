import React from "react";

const RowBasedMenuSectionTabs = ({
  activeSectionIndex,
  onSectionClick,
  sections,
}) => {
  if (!sections?.length) {
    return null;
  }

  return (
    <div className="row-based-menu-sections">
      {sections.map((section, index) => (
        <div
          key={section.id || index}
          className={`row-based-menu-section ${
            index === activeSectionIndex ? "active" : ""
          }`}
          onClick={() => onSectionClick(index)}
        >
          {section.label}
        </div>
      ))}
    </div>
  );
};

export default React.memo(RowBasedMenuSectionTabs);
