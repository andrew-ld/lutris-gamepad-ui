import { useState, useCallback, useRef, useEffect } from "react";
import { useScopedInput } from "../hooks/useScopedInput";
import { playActionSound } from "../utils/sound";

const findScrollableParent = (element) => {
  let el = element;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    if (style.overflowY === "auto" || style.overflowY === "scroll") {
      if (el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return null;
};

const defaultKeyExtractor = (item, index) => item.id ?? item.label ?? index;

const RowBasedMenu = ({
  items,
  renderItem,
  onAction,
  focusId,
  isActive = true,
  onFocusChange,
  itemKey = defaultKeyExtractor,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;

  const containerRef = useRef(null);
  const selectedItemKeyRef = useRef(null);

  useEffect(() => {
    if (items[selectedIndex]) {
      selectedItemKeyRef.current = itemKey(items[selectedIndex], selectedIndex);
    } else {
      selectedItemKeyRef.current = null;
    }
  }, [selectedIndex, items, itemKey]);

  useEffect(() => {
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
    if (onFocusChangeRef.current && items[selectedIndex]) {
      onFocusChangeRef.current(items[selectedIndex]);
    }

    if (!containerRef.current) return;

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
      const currentItem = items[selectedIndexRef.current];

      switch (input.name) {
        case "UP":
          setSelectedIndex((prev) => {
            const next = Math.max(0, prev - 1);
            if (next !== prev) playActionSound();
            return next;
          });
          break;
        case "DOWN":
          setSelectedIndex((prev) => {
            const next = Math.min(items.length - 1, prev + 1);
            if (next !== prev) playActionSound();
            return next;
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

  return (
    <div ref={containerRef}>
      {items.map((item, index) =>
        renderItem(item, index === selectedIndex, () => setSelectedIndex(index))
      )}
    </div>
  );
};

export default RowBasedMenu;
