import { useMemo, useCallback } from "react";

import { useTranslation } from "../contexts/TranslationContext";

import DialogLayout from "./DialogLayout";
import FocusableRow from "./FocusableRow";
import RowBasedMenu from "./RowBasedMenu";

const EMPTY_LEGEND_ITEMS = [];

const SelectionMenu = ({
  title,
  description,
  options,
  currentValue,
  onSelect,
  onClose,
  onAction,
  extraLegendItems = EMPTY_LEGEND_ITEMS,
  emptyMessage,
  showCheckmark = true,
}) => {
  const { t } = useTranslation();

  const handleAction = useCallback(
    (actionName, item) => {
      if (actionName === "A" && item) {
        onSelect(item.value);
      } else if (actionName === "B") {
        onClose();
      } else {
        onAction?.(actionName, item);
      }
    },
    [onSelect, onClose, onAction],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter, ref) => (
      <FocusableRow
        ref={ref}
        isFocused={isFocused}
        onMouseEnter={onMouseEnter}
        onClick={() => onSelect(item.value)}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            alignItems: "center",
          }}
        >
          <span className="settings-menu-label">{item.label}</span>
          {showCheckmark && String(item.value) === String(currentValue) && (
            <span style={{ color: "var(--accent-color)", fontWeight: "bold" }}>
              ✓
            </span>
          )}
        </div>
      </FocusableRow>
    ),
    [currentValue, onSelect, showCheckmark],
  );

  const items = useMemo(
    () =>
      options.map((opt) => ({
        label: opt[0],
        value: opt[1],
      })),
    [options],
  );

  const legendItems = useMemo(() => {
    const result = [];

    if (items.length > 0) {
      result.push({ button: "A", label: t("Select") });
    }

    for (const item of extraLegendItems) {
      result.push(item);
    }

    result.push({ button: "B", label: t("Back"), onClick: onClose });

    return result;
  }, [items.length, t, extraLegendItems, onClose]);

  const initialIndex = useMemo(() => {
    const index = items.findIndex(
      (index_) => String(index_.value) === String(currentValue),
    );
    return Math.max(index, 0);
  }, [items, currentValue]);

  return (
    <DialogLayout
      title={title}
      description={description}
      legendItems={legendItems}
      className="wide"
      scrollable={false}
    >
      <RowBasedMenu
        items={items}
        renderItem={renderItem}
        onAction={handleAction}
        focusId="SelectionMenu"
        initialSelectedIndex={initialIndex}
        emptyMessage={emptyMessage}
      />
    </DialogLayout>
  );
};

export default SelectionMenu;
