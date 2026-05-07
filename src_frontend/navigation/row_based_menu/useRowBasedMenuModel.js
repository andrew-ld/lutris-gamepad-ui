import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePlayButtonActionSound } from "../../hooks/usePlayButtonActionSound";
import { useScopedInput } from "../../hooks/useScopedInput";
import { useInput } from "../../stores/inputStore";

export const defaultRowBasedMenuItemKey = (item, index) =>
  item.id ?? item.label ?? index;

const getSectionItems = (sections, sectionIndex) =>
  sections?.[sectionIndex]?.items || [];

const getInitialSelectedKeys = ({
  baseItems,
  initialSectionIndex,
  initialSelectedIndex,
  itemKey,
  sections,
}) => {
  const initialItems =
    sections?.length > 0
      ? getSectionItems(sections, initialSectionIndex)
      : baseItems || [];
  const initialItem = initialItems[initialSelectedIndex];

  if (!initialItem) return {};

  return {
    [initialSectionIndex]: itemKey(initialItem, initialSelectedIndex),
  };
};

const findSelectedIndex = (
  sectionItems,
  sectionIndex,
  selectedKeys,
  itemKey,
) => {
  if (sectionItems.length === 0) return 0;

  const selectedKey = selectedKeys[sectionIndex];
  if (selectedKey === undefined) return 0;

  const selectedIndex = sectionItems.findIndex(
    (item, index) => itemKey(item, index) === selectedKey,
  );

  return selectedIndex === -1 ? 0 : selectedIndex;
};

export const useRowBasedMenuModel = ({
  baseItems,
  focusId,
  initialSectionIndex,
  initialSelectedIndex,
  isActive,
  itemKey,
  onAction,
  onFocusChange,
  onFocusLost,
  onStateChange,
  sections,
}) => {
  const playActionSound = usePlayButtonActionSound();
  const { isMouseActive } = useInput();
  const sectionsLength = sections?.length || 0;
  const hasSections = sectionsLength > 0;

  const [activeSectionIndex, setActiveSectionIndex] =
    useState(initialSectionIndex);

  const activeItems = useMemo(() => {
    return hasSections
      ? getSectionItems(sections, activeSectionIndex)
      : baseItems || [];
  }, [hasSections, sections, activeSectionIndex, baseItems]);

  const [selectedKeys, setSelectedKeys] = useState(() =>
    getInitialSelectedKeys({
      baseItems,
      initialSectionIndex,
      initialSelectedIndex,
      itemKey,
      sections,
    }),
  );

  const getSelectedIndex = useCallback(
    (sectionItems, sectionIndex) =>
      findSelectedIndex(sectionItems, sectionIndex, selectedKeys, itemKey),
    [itemKey, selectedKeys],
  );

  const selectedIndex = useMemo(
    () => getSelectedIndex(activeItems, activeSectionIndex),
    [activeItems, activeSectionIndex, getSelectedIndex],
  );

  const stateRef = useRef({
    items: activeItems,
    selectedIndex,
    activeSectionIndex,
    sectionsLength,
  });

  useEffect(() => {
    stateRef.current = {
      items: activeItems,
      selectedIndex,
      activeSectionIndex,
      sectionsLength,
    };
  });

  useEffect(() => {
    onStateChange?.({ activeSectionIndex, selectedIndex });
  }, [activeSectionIndex, selectedIndex, onStateChange]);

  useEffect(() => {
    onFocusChange?.(activeItems[selectedIndex] ?? null);
  }, [selectedIndex, activeItems, onFocusChange]);

  const inputHandler = useCallback(
    (input) => {
      const {
        items: currentItems,
        selectedIndex: currentIndex,
        activeSectionIndex: currentSection,
        sectionsLength: currentSectionsLength,
      } = stateRef.current;

      if (currentSectionsLength > 1) {
        if (input.name === "L1") {
          playActionSound();
          setActiveSectionIndex((previous) =>
            previous > 0 ? previous - 1 : currentSectionsLength - 1,
          );
          return;
        }

        if (input.name === "R1") {
          playActionSound();
          setActiveSectionIndex((previous) =>
            previous < currentSectionsLength - 1 ? previous + 1 : 0,
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
            setSelectedKeys((previous) => ({
              ...previous,
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
            setSelectedKeys((previous) => ({
              ...previous,
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
    (sectionIndex, sectionItems, index) => {
      if (!isMouseActive) return;

      const item = sectionItems[index];
      if (item) {
        setActiveSectionIndex(sectionIndex);
        setSelectedKeys((previous) => ({
          ...previous,
          [sectionIndex]: itemKey(item, index),
        }));
      }
    },
    [itemKey, isMouseActive],
  );

  return {
    activeItems,
    activeSectionIndex,
    getSelectedIndex,
    handleItemClick,
    handleSectionClick,
    hasSections,
  };
};
