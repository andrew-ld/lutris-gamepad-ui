import React, { useCallback, useMemo, useEffect } from "react";

import { useInput } from "../../contexts/InputContext";
import { usePlayButtonActionSound } from "../../hooks/usePlayButtonActionSound";
import { useScopedInput } from "../../hooks/useScopedInput";

import { useFocusManager } from "./useFocusManager";
import { useGridLayout } from "./useGridLayout";
import { useSpatialNavigation } from "./useSpatialNavigation";

import "../../styles/GridMenu.css";

const getItemKey = (item, itemIndex) =>
  item?.id ?? item?.slug ?? item?.label ?? itemIndex;

const GridMenuItem = React.memo(
  ({
    item,
    itemIndex,
    sectionIndex,
    isFocused,
    renderItem,
    onAction,
    onItemFocus,
    setItemRef,
  }) => {
    const handleFocus = useCallback(() => {
      onItemFocus(sectionIndex, itemIndex);
    }, [itemIndex, onItemFocus, sectionIndex]);

    const handleClick = useCallback(() => {
      onAction?.("A", item);
    }, [item, onAction]);

    const setReference = useCallback(
      (element) => {
        setItemRef(element, sectionIndex, itemIndex);
      },
      [itemIndex, sectionIndex, setItemRef],
    );

    return renderItem(
      item,
      {
        sectionIndex,
        itemIndex,
        isFocused,
      },
      {
        onFocus: handleFocus,
        onClick: handleClick,
        ref: setReference,
      },
    );
  },
);

GridMenuItem.displayName = "GridMenuItem";

const GridMenu = ({
  sections,
  renderItem,
  renderHeader,
  renderEmpty,
  onAction,
  onFocusChange,
  focusId,
  isActive = true,
  scrollParentRef,
}) => {
  const { isMouseActive } = useInput();
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
    scrollParentRef,
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
        case "RIGHT": {
          move(input.name);
          break;
        }
        case "L1": {
          moveSection(-1);
          break;
        }
        case "R1": {
          moveSection(1);
          break;
        }
        default: {
          if (onAction) {
            onAction(input.name, currentItem);
          }
          break;
        }
      }
    },
    [sections, coords, move, moveSection, onAction],
  );

  const { isFocused } = useScopedInput(inputHandler, focusId, isActive);

  const handleItemFocus = useCallback(
    (sectionIndex, itemIndex) => {
      if (!isMouseActive || !isFocused) return;
      setCoords({ sectionIndex, itemIndex, preventScroll: true });
    },
    [setCoords, isMouseActive, isFocused],
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
          ref={(element) => setSectionRef(element, sectionIndex)}
          className="grid-menu-section"
        >
          {section.title && (
            <h2 className="grid-menu-section-title">{section.title}</h2>
          )}
          <div
            ref={(element) => setGridRef(element, sectionIndex)}
            className="grid-menu-grid"
          >
            {section.items.map((item, itemIndex) => (
              <GridMenuItem
                key={getItemKey(item, itemIndex)}
                item={item}
                itemIndex={itemIndex}
                sectionIndex={sectionIndex}
                isFocused={
                  coords.sectionIndex === sectionIndex &&
                  coords.itemIndex === itemIndex
                }
                renderItem={renderItem}
                onAction={onAction}
                onItemFocus={handleItemFocus}
                setItemRef={setItemRef}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
};

export default React.memo(GridMenu);
