import React, { useCallback, useMemo, useEffect } from "react";
import { useScopedInput } from "../hooks/useScopedInput";
import { usePlayButtonActionSound } from "../hooks/usePlayButtonActionSound";
import { useGridLayout } from "../hooks/useGridLayout";
import { useSpatialNavigation } from "../hooks/useSpatialNavigation";
import { useFocusManager } from "../hooks/useFocusManager";
import "../styles/GridMenu.css";

const GridMenu = ({
  sections,
  renderItem,
  renderHeader,
  renderEmpty,
  onAction,
  onFocusChange,
  focusId,
  isActive = true,
}) => {
  const playActionSound = usePlayButtonActionSound();

  const { numColumns, setGridRef } = useGridLayout(sections.length);

  const { coords, setCoords, move, moveSection } = useSpatialNavigation(
    sections,
    numColumns,
    { onMove: playActionSound },
  );

  const { containerRef, setSectionRef, setItemRef } = useFocusManager(
    coords,
    numColumns,
    isActive,
  );

  useEffect(() => {
    if (onFocusChange) {
      const currentItem =
        sections[coords.sectionIndex]?.items[coords.itemIndex];
      onFocusChange(currentItem || null);
    }
  }, [coords, sections, onFocusChange]);

  const inputHandler = useCallback(
    (input) => {
      const currentItem =
        sections[coords.sectionIndex]?.items[coords.itemIndex];

      switch (input.name) {
        case "UP":
        case "DOWN":
        case "LEFT":
        case "RIGHT":
          move(input.name);
          break;
        case "L1":
          moveSection(-1);
          break;
        case "R1":
          moveSection(1);
          break;
        default:
          if (onAction) {
            onAction(input.name, currentItem);
          }
          break;
      }
    },
    [sections, coords, move, moveSection, onAction],
  );

  useScopedInput(inputHandler, focusId, isActive);

  const handleItemFocus = useCallback(
    (sectionIndex, itemIndex) => {
      setCoords({ sectionIndex, itemIndex, preventScroll: true });
    },
    [setCoords],
  );

  const hasContent = useMemo(
    () => sections.some((s) => s.items?.length > 0),
    [sections],
  );

  if (!hasContent && renderEmpty) {
    return renderEmpty();
  }

  return (
    <main ref={containerRef} className="grid-menu">
      {renderHeader && renderHeader()}
      {sections.map((section, sectionIndex) => (
        <section
          key={section.id || section.title || sectionIndex}
          ref={(el) => setSectionRef(el, sectionIndex)}
          className="grid-menu-section"
        >
          {section.title && (
            <h2 className="grid-menu-section-title">{section.title}</h2>
          )}
          <div
            ref={(el) => setGridRef(el, sectionIndex)}
            className="grid-menu-grid"
          >
            {section.items.map((item, itemIndex) =>
              renderItem(
                item,
                {
                  sectionIndex,
                  itemIndex,
                  isFocused:
                    coords.sectionIndex === sectionIndex &&
                    coords.itemIndex === itemIndex,
                },
                {
                  onFocus: () => handleItemFocus(sectionIndex, itemIndex),
                  onClick: () => onAction("A", item),
                  ref: (el) => setItemRef(el, sectionIndex, itemIndex),
                },
              ),
            )}
          </div>
        </section>
      ))}
    </main>
  );
};

export default React.memo(GridMenu);
