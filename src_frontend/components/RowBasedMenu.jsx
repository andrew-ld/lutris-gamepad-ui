import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "../contexts/TranslationContext";
import { usePlayButtonActionSound } from "../hooks/usePlayButtonActionSound";
import { useScopedInput } from "../hooks/useScopedInput";
import { findScrollableParent } from "../utils/dom";

import "../styles/RowBasedMenu.css";

const defaultKeyExtractor = (item, index) => item.id ?? item.label ?? index;

const RowBasedMenu = ({
  items: baseItems,
  sections,
  renderItem,
  onAction,
  focusId,
  isActive = true,
  onFocusChange,
  itemKey = defaultKeyExtractor,
  renderEmpty,
  initialSectionIndex = 0,
  initialSelectedIndex = 0,
  onStateChange,
  emptyMessage,
}) => {
  const { t } = useTranslation();
  const playActionSound = usePlayButtonActionSound();

  const [activeSectionIndex, setActiveSectionIndex] =
    useState(initialSectionIndex);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);

  useEffect(() => {
    onStateChange?.({ activeSectionIndex, selectedIndex });
  }, [activeSectionIndex, selectedIndex, onStateChange]);

  const activeSectionIdReference = useRef(null);

  useEffect(() => {
    if (sections && sections[activeSectionIndex]) {
      activeSectionIdReference.current = sections[activeSectionIndex].id;
    }
  }, [activeSectionIndex, sections]);

  useEffect(() => {
    if (sections && activeSectionIdReference.current !== null) {
      const newSectionIndex = sections.findIndex(
        (s) => s.id === activeSectionIdReference.current,
      );
      if (newSectionIndex !== -1 && newSectionIndex !== activeSectionIndex) {
        setActiveSectionIndex(newSectionIndex);
      }
    }
  }, [sections, activeSectionIndex]);

  const items = useMemo(() => {
    return sections
      ? sections[activeSectionIndex]?.items || []
      : baseItems || [];
  }, [sections, activeSectionIndex, baseItems]);

  const selectedIndexReference = useRef(selectedIndex);
  const onActionReference = useRef(onAction);
  const onFocusChangeReference = useRef(onFocusChange);

  const containerReference = useRef(null);
  const listReference = useRef(null);
  const selectedItemKeyReference = useRef(null);
  const activeSectionIndexReference = useRef(activeSectionIndex);

  useEffect(() => {
    selectedIndexReference.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    activeSectionIndexReference.current = activeSectionIndex;
  }, [activeSectionIndex]);

  useEffect(() => {
    onActionReference.current = onAction;
  }, [onAction]);

  useEffect(() => {
    onFocusChangeReference.current = onFocusChange;
  }, [onFocusChange]);

  useEffect(() => {
    if (onFocusChangeReference.current) {
      onFocusChangeReference.current(items[selectedIndex] ?? null);
    }
  }, [selectedIndex, items]);

  useEffect(() => {
    selectedItemKeyReference.current =
      items.length > 0 && items[selectedIndex]
        ? itemKey(items[selectedIndex], selectedIndex)
        : null;
  }, [selectedIndex, items, itemKey]);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedIndex(0);
      onFocusChangeReference.current?.(null);
      return;
    }
    if (selectedItemKeyReference.current === null) {
      setSelectedIndex(0);
    } else {
      const newIndex = items.findIndex(
        (item, index) =>
          itemKey(item, index) === selectedItemKeyReference.current,
      );
      if (newIndex === -1) {
        setSelectedIndex(0);
      } else {
        setSelectedIndex(newIndex);
      }
    }
  }, [items, itemKey]);

  useEffect(() => {
    if (!listReference.current || items.length === 0) return;

    const scrollParent = findScrollableParent(listReference.current);
    const selectedElement = listReference.current.children[selectedIndex];

    if (selectedIndex === 0) {
      if (scrollParent) {
        scrollParent.scrollTo({ top: 0, behavior: "smooth" });
      } else if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (selectedIndex === items.length - 1) {
      if (scrollParent) {
        scrollParent.scrollTo({
          top: scrollParent.scrollHeight,
          behavior: "smooth",
        });
      } else if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    } else {
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex, items]);

  const inputHandler = useCallback(
    (input) => {
      if (sections && sections.length > 1) {
        if (input.name === "L1") {
          playActionSound();
          setActiveSectionIndex((previous) =>
            previous > 0 ? previous - 1 : sections.length - 1,
          );
          setSelectedIndex(0);
          return;
        }

        if (input.name === "R1") {
          playActionSound();
          setActiveSectionIndex((previous) =>
            previous < sections.length - 1 ? previous + 1 : 0,
          );
          setSelectedIndex(0);
          return;
        }
      }

      if (items.length === 0) {
        if (onActionReference.current) {
          playActionSound();
          onActionReference.current(input.name, null);
        }
        return;
      }

      const currentItem = items[selectedIndexReference.current];

      switch (input.name) {
        case "UP": {
          setSelectedIndex((previous) => {
            const next = previous - 1;
            playActionSound();
            return next < 0 ? items.length - 1 : next;
          });
          break;
        }
        case "DOWN": {
          setSelectedIndex((previous) => {
            const next = previous + 1;
            playActionSound();
            return next > items.length - 1 ? 0 : next;
          });
          break;
        }
        case "LEFT":
        case "RIGHT":
        case "A":
        case "B":
        case "X":
        case "Y":
        case "L1":
        case "R1": {
          if (onActionReference.current) {
            playActionSound();
            onActionReference.current(input.name, currentItem);
          }
          break;
        }
      }
    },
    [items, sections, playActionSound],
  );

  useScopedInput(inputHandler, focusId, isActive);

  const handleSectionClick = useCallback((index) => {
    setActiveSectionIndex(index);
    setSelectedIndex(0);
  }, []);

  const handleItemClick = useCallback((index) => {
    setSelectedIndex(index);
  }, []);

  const renderSections = () => {
    if (!sections || sections.length === 0) {
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
            onClick={() => handleSectionClick(index)}
          >
            {section.label}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (items.length === 0) {
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
      <div ref={listReference} className="row-based-menu-list">
        {items.map((item, index) =>
          renderItem(item, index === selectedIndex, () =>
            handleItemClick(index),
          ),
        )}
      </div>
    );
  };

  return (
    <div ref={containerReference} className="row-based-menu-container">
      {renderSections()}
      {renderContent()}
    </div>
  );
};

export default RowBasedMenu;
