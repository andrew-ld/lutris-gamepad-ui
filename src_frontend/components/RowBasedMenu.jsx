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

  const activeSectionIdRef = useRef(null);

  useEffect(() => {
    if (sections && sections[activeSectionIndex]) {
      activeSectionIdRef.current = sections[activeSectionIndex].id;
    }
  }, [activeSectionIndex, sections]);

  useEffect(() => {
    if (sections && activeSectionIdRef.current !== null) {
      const newSectionIndex = sections.findIndex(
        (s) => s.id === activeSectionIdRef.current,
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

  const selectedIndexRef = useRef(selectedIndex);
  const onActionRef = useRef(onAction);
  const onFocusChangeRef = useRef(onFocusChange);

  const containerRef = useRef(null);
  const listRef = useRef(null);
  const selectedItemKeyRef = useRef(null);
  const activeSectionIndexRef = useRef(activeSectionIndex);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    activeSectionIndexRef.current = activeSectionIndex;
  }, [activeSectionIndex]);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    onFocusChangeRef.current = onFocusChange;
  }, [onFocusChange]);

  useEffect(() => {
    if (onFocusChangeRef.current) {
      onFocusChangeRef.current(items[selectedIndex] ?? null);
    }
  }, [selectedIndex, items]);

  useEffect(() => {
    if (items.length > 0 && items[selectedIndex]) {
      selectedItemKeyRef.current = itemKey(items[selectedIndex], selectedIndex);
    } else {
      selectedItemKeyRef.current = null;
    }
  }, [selectedIndex, items, itemKey]);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedIndex(0);
      onFocusChangeRef.current?.(null);
      return;
    }
    if (selectedItemKeyRef.current !== null) {
      const newIndex = items.findIndex(
        (item, index) => itemKey(item, index) === selectedItemKeyRef.current,
      );
      if (newIndex !== -1) {
        setSelectedIndex(newIndex);
      } else {
        setSelectedIndex(0);
      }
    } else {
      setSelectedIndex(0);
    }
  }, [items, itemKey]);

  useEffect(() => {
    if (!listRef.current || items.length === 0) return;

    const scrollParent = findScrollableParent(listRef.current);
    const selectedElement = listRef.current.children[selectedIndex];

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
          setActiveSectionIndex((prev) =>
            prev > 0 ? prev - 1 : sections.length - 1,
          );
          setSelectedIndex(0);
          return;
        }

        if (input.name === "R1") {
          playActionSound();
          setActiveSectionIndex((prev) =>
            prev < sections.length - 1 ? prev + 1 : 0,
          );
          setSelectedIndex(0);
          return;
        }
      }

      if (items.length === 0) {
        if (onActionRef.current) {
          playActionSound();
          onActionRef.current(input.name, null);
        }
        return;
      }

      const currentItem = items[selectedIndexRef.current];

      switch (input.name) {
        case "UP":
          setSelectedIndex((prev) => {
            const next = prev - 1;
            playActionSound();
            return next < 0 ? items.length - 1 : next;
          });
          break;
        case "DOWN":
          setSelectedIndex((prev) => {
            const next = prev + 1;
            playActionSound();
            return next > items.length - 1 ? 0 : next;
          });
          break;
        case "LEFT":
        case "RIGHT":
        case "A":
        case "B":
        case "X":
        case "Y":
        case "L1":
        case "R1":
          if (onActionRef.current) {
            playActionSound();
            onActionRef.current(input.name, currentItem);
          }
          break;
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
      <div ref={listRef} className="row-based-menu-list">
        {items.map((item, index) =>
          renderItem(item, index === selectedIndex, () =>
            handleItemClick(index),
          ),
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="row-based-menu-container">
      {renderSections()}
      {renderContent()}
    </div>
  );
};

export default RowBasedMenu;
