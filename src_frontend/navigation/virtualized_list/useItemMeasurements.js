import { useCallback, useMemo, useState } from "react";

import {
  EMPTY_ITEM_HEIGHTS,
  getElementTotalHeight,
  haveSameItemKeys,
} from "./utils";

export const useItemMeasurements = ({ items, itemKey }) => {
  const [baseHeight, setBaseHeight] = useState(64);
  const [itemMeasurements, setItemMeasurements] = useState(() => ({
    items,
    heights: EMPTY_ITEM_HEIGHTS,
  }));

  const measurementsMatch = useMemo(
    () => haveSameItemKeys(itemMeasurements.items, items, itemKey),
    [itemMeasurements.items, items, itemKey],
  );

  const measuredItemHeights = measurementsMatch
    ? itemMeasurements.heights
    : EMPTY_ITEM_HEIGHTS;

  const measureRef = useCallback(
    (node, index) => {
      if (!node) return;
      const totalHeight = getElementTotalHeight(node);

      setItemMeasurements((previousMeasurements) => {
        const itemsMatch = haveSameItemKeys(
          previousMeasurements.items,
          items,
          itemKey,
        );
        const previousHeights = itemsMatch
          ? previousMeasurements.heights
          : EMPTY_ITEM_HEIGHTS;

        if (itemsMatch && previousHeights[index] === totalHeight) {
          return previousMeasurements;
        }

        return {
          items,
          heights: { ...previousHeights, [index]: totalHeight },
        };
      });

      if (index === 0) {
        setBaseHeight((previousHeight) =>
          previousHeight === totalHeight ? previousHeight : totalHeight,
        );
      }
    },
    [items, itemKey],
  );

  return {
    baseHeight,
    measureRef,
    measuredItemHeights,
  };
};
