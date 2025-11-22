import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { useScopedInput } from "../hooks/useScopedInput";
import "../styles/RowBasedMenu.css";
import { findScrollableParent } from "../utils/dom";
import { playActionSound } from "../utils/sound";

const defaultKeyExtractor = (item, index) => item.id ?? item.label ?? index;

const RowBasedMenu = ({
  items,
  renderItem,
  onAction,
  focusId,
  isActive = true,
  onFocusChange,
  itemKey = defaultKeyExtractor,
  renderEmpty,
  emptyMessage,
}) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(selectedIndex);
  const onActionRef = useRef(onAction);
  const onFocusChangeRef = useRef(onFocusChange);

  const containerRef = useRef(null);
  const selectedItemKeyRef = useRef(null);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

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
        (item, index) => itemKey(item, index) === selectedItemKeyRef.current
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
    if (!containerRef.current || items.length === 0) return;

    const scrollParent = findScrollableParent(containerRef.current);
    const selectedElement = containerRef.current.children[selectedIndex];

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
          if (onActionRef.current) {
            playActionSound();
            onActionRef.current(input.name, currentItem);
          }
          break;
      }
    },
    [items]
  );

  useScopedInput(inputHandler, focusId, isActive);

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
    <div ref={containerRef}>
      {items.map((item, index) =>
        renderItem(item, index === selectedIndex, () => setSelectedIndex(index))
      )}
    </div>
  );
};

export default RowBasedMenu;
