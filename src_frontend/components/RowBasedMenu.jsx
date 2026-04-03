import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useInput } from "../contexts/InputContext";
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
    return sections
      ? sections[activeSectionIndex]?.items || []
      : baseItems || [];
  }, [sections, activeSectionIndex, baseItems]);

  const [selectedKey, setSelectedKey] = useState(() => {
    const initialItem = items[initialSelectedIndex];
    return initialItem ? itemKey(initialItem, initialSelectedIndex) : null;
  });

  const selectedIndex = useMemo(() => {
    if (selectedKey === null) return 0;
    const index = items.findIndex(
      (item, idx) => itemKey(item, idx) === selectedKey,
    );
    if (index === -1) {
      return 0;
    }
    return index;
  }, [items, selectedKey, itemKey]);

  if (selectedKey === null && items.length > 0) {
    setSelectedKey(itemKey(items[0], 0));
  }

  const listReference = useRef(null);

  const latestItemsReference = useRef(items);
  const latestSelectedIndexReference = useRef(selectedIndex);

  useEffect(() => {
    latestItemsReference.current = items;
    latestSelectedIndexReference.current = selectedIndex;
  });

  useEffect(() => {
    onStateChange?.({ activeSectionIndex, selectedIndex });
  }, [activeSectionIndex, selectedIndex, onStateChange]);

  useEffect(() => {
    if (onFocusChange) {
      onFocusChange(items[selectedIndex] ?? null);
    }
  }, [selectedIndex, items, onFocusChange]);

  useEffect(() => {
    if (!listReference.current || items.length === 0) return;

    const scrollParent = findScrollableParent(listReference.current);
    const selectedElement = listReference.current.children[selectedIndex];

    if (!selectedElement) return;

    if (selectedIndex === 0) {
      if (scrollParent) {
        scrollParent.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (selectedIndex === items.length - 1) {
      if (scrollParent) {
        scrollParent.scrollTo({
          top: scrollParent.scrollHeight,
          behavior: "smooth",
        });
      } else {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    } else {
      selectedElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex, items]);

  const inputHandler = useCallback(
    (input) => {
      const currentItems = latestItemsReference.current;
      const currentIndex = latestSelectedIndexReference.current;

      if (sections && sections.length > 1) {
        if (input.name === "L1") {
          playActionSound();
          setActiveSectionIndex((previous) =>
            previous > 0 ? previous - 1 : sections.length - 1,
          );
          return;
        }

        if (input.name === "R1") {
          playActionSound();
          setActiveSectionIndex((previous) =>
            previous < sections.length - 1 ? previous + 1 : 0,
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
            currentIndex - 1 < 0 ? currentItems.length - 1 : currentIndex - 1;
          const nextItem = currentItems[nextIndex];
          if (nextItem) {
            setSelectedKey(itemKey(nextItem, nextIndex));
          }
          break;
        }
        case "DOWN": {
          playActionSound();
          const nextIndex =
            currentIndex + 1 > currentItems.length - 1 ? 0 : currentIndex + 1;
          const nextItem = currentItems[nextIndex];
          if (nextItem) {
            setSelectedKey(itemKey(nextItem, nextIndex));
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
    [sections, onAction, playActionSound, itemKey],
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
        setSelectedKey(itemKey(item, index));
      }
    },
    [items, itemKey, isMouseActive],
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
    <div className="row-based-menu-container">
      {renderSections()}
      {renderContent()}
    </div>
  );
};

export default React.memo(RowBasedMenu);
