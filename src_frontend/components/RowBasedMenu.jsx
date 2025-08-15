import { useState, useCallback, useRef, useEffect } from "react";
import { useScopedInput } from "../hooks/useScopedInput";
import { playActionSound } from "../utils/sound";

const RowBasedMenu = ({
  items,
  renderItem,
  onAction,
  focusId,
  isActive = true,
  onFocusChange,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;

  useEffect(() => {
    setSelectedIndex(0);
    if (onFocusChangeRef.current && items.length > 0) {
      onFocusChangeRef.current(items[0]);
    }
  }, [items]);

  useEffect(() => {
    if (onFocusChangeRef.current && items[selectedIndex]) {
      onFocusChangeRef.current(items[selectedIndex]);
    }
  }, [selectedIndex, items]);

  const inputHandler = useCallback((input) => {
    const currentItem = itemsRef.current[selectedIndexRef.current];

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
          const next = Math.min(itemsRef.current.length - 1, prev + 1);
          if (next !== prev) playActionSound();
          return next;
        });
        break;
      case "LEFT":
      case "RIGHT":
      case "A":
      case "B":
        if (onActionRef.current) {
          playActionSound();
          onActionRef.current(input.name, currentItem);
        }
        break;
    }
  }, []);

  useScopedInput(inputHandler, focusId, isActive);

  return (
    <div>
      {items.map((item, index) =>
        renderItem(item, index === selectedIndex, () => setSelectedIndex(index))
      )}
    </div>
  );
};

export default RowBasedMenu;
