import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import { useInput } from "../contexts/InputContext";
import { useTranslation } from "../contexts/TranslationContext";
import { usePlayButtonActionSound } from "../hooks/usePlayButtonActionSound";
import { useScopedInput } from "../hooks/useScopedInput";

import VirtualizedList from "./VirtualizedList";

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
  onFocusLost,
  itemKey = defaultKeyExtractor,
  renderEmpty,
  initialSectionIndex = 0,
  initialSelectedIndex = 0,
  onStateChange,
  emptyMessage,
}) => {
  const { t } = useTranslation();
  const playActionSound = usePlayButtonActionSound();
  const { isMouseActive } = useInput();

  const [activeSectionIndex, setActiveSectionIndex] =
    useState(initialSectionIndex);

  const items = useMemo(() => {
    return sections && sections.length > 0
      ? sections[activeSectionIndex]?.items || []
      : baseItems || [];
  }, [sections, activeSectionIndex, baseItems]);

  const [selectedKeys, setSelectedKeys] = useState(() => {
    const initialItems =
      sections && sections.length > 0
        ? sections[initialSectionIndex]?.items || []
        : baseItems || [];
    const initialItem = initialItems[initialSelectedIndex];

    if (initialItem) {
      return {
        [initialSectionIndex]: itemKey(initialItem, initialSelectedIndex),
      };
    }
    return {};
  });

  const selectedIndex = useMemo(() => {
    if (items.length === 0) return 0;

    const currentKey = selectedKeys[activeSectionIndex];
    if (currentKey !== undefined) {
      const index = items.findIndex(
        (item, idx) => itemKey(item, idx) === currentKey,
      );
      if (index !== -1) return index;
    }

    return 0;
  }, [items, selectedKeys, activeSectionIndex, itemKey]);

  const stateRef = useRef({
    items,
    selectedIndex,
    activeSectionIndex,
    sectionsLength: sections?.length || 0,
  });

  useEffect(() => {
    stateRef.current = {
      items,
      selectedIndex,
      activeSectionIndex,
      sectionsLength: sections?.length || 0,
    };
  });

  useEffect(() => {
    onStateChange?.({ activeSectionIndex, selectedIndex });
  }, [activeSectionIndex, selectedIndex, onStateChange]);

  useEffect(() => {
    if (onFocusChange) {
      onFocusChange(items[selectedIndex] ?? null);
    }
  }, [selectedIndex, items, onFocusChange]);

  const inputHandler = useCallback(
    (input) => {
      const {
        items: currentItems,
        selectedIndex: currentIndex,
        activeSectionIndex: currentSection,
        sectionsLength,
      } = stateRef.current;

      if (sectionsLength > 1) {
        if (input.name === "L1") {
          playActionSound();
          setActiveSectionIndex((prev) =>
            prev > 0 ? prev - 1 : sectionsLength - 1,
          );
          return;
        }

        if (input.name === "R1") {
          playActionSound();
          setActiveSectionIndex((prev) =>
            prev < sectionsLength - 1 ? prev + 1 : 0,
          );
          return;
        }
      }

      if (currentItems.length === 0) {
        if (onAction) {
          playActionSound();
          onAction(input.name, null);
        }
        return;
      }

      switch (input.name) {
        case "UP": {
          playActionSound();
          const nextIndex =
            currentIndex > 0 ? currentIndex - 1 : currentItems.length - 1;
          const nextItem = currentItems[nextIndex];
          if (nextItem) {
            setSelectedKeys((prev) => ({
              ...prev,
              [currentSection]: itemKey(nextItem, nextIndex),
            }));
          }
          break;
        }
        case "DOWN": {
          playActionSound();
          const nextIndex =
            currentIndex < currentItems.length - 1 ? currentIndex + 1 : 0;
          const nextItem = currentItems[nextIndex];
          if (nextItem) {
            setSelectedKeys((prev) => ({
              ...prev,
              [currentSection]: itemKey(nextItem, nextIndex),
            }));
          }
          break;
        }
        default: {
          if (onAction) {
            playActionSound();
            onAction(input.name, currentItems[currentIndex]);
          }
          break;
        }
      }
    },
    [onAction, playActionSound, itemKey],
  );

  const { isFocused, wasAcquired } = useScopedInput(
    inputHandler,
    focusId,
    isActive,
  );

  useEffect(() => {
    if (isActive && wasAcquired && !isFocused) {
      onFocusLost?.();
    }
  }, [isActive, isFocused, wasAcquired, onFocusLost]);

  const handleSectionClick = useCallback((index) => {
    setActiveSectionIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (index) => {
      if (!isMouseActive) return;

      const item = items[index];
      if (item) {
        setSelectedKeys((prev) => ({
          ...prev,
          [activeSectionIndex]: itemKey(item, index),
        }));
      }
    },
    [items, itemKey, isMouseActive, activeSectionIndex],
  );

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
      <VirtualizedList
        items={items}
        selectedIndex={selectedIndex}
        renderItem={renderItem}
        onItemClick={handleItemClick}
        className="row-based-menu-list"
      />
    );
  };

  return (
    <div className="row-based-menu-container">
      {renderSections()}
      {renderContent()}
    </div>
  );
};

export default React.memo(RowBasedMenu);
