import { useMemo, useCallback, useRef } from "react";

import { useTranslation } from "../contexts/TranslationContext";

import DialogLayout from "./DialogLayout";
import FocusableRow from "./FocusableRow";
import RowBasedMenu from "./RowBasedMenu";

const SelectionMenu = ({
  title,
  description,
  options,
  currentValue,
  onSelect,
  onClose,
  maxWidth = "600px",
  showCheckmark = true,
}) => {
  const { t } = useTranslation();
  const scrollParentReference = useRef(null);

  const handleAction = useCallback(
    (actionName, item) => {
      if (actionName === "A") {
        onSelect(item.value);
      } else if (actionName === "B") {
        onClose();
      }
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => (
      <FocusableRow
        key={item.value}
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

  const legendItems = useMemo(
    () => [
      { button: "A", label: t("Select") },
      { button: "B", label: t("Back"), onClick: onClose },
    ],
    [t, onClose],
  );

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
      maxWidth={maxWidth}
      contentRef={scrollParentReference}
    >
      <RowBasedMenu
        items={items}
        renderItem={renderItem}
        onAction={handleAction}
        focusId="SelectionMenu"
        initialSelectedIndex={initialIndex}
        scrollParentRef={scrollParentReference}
      />
    </DialogLayout>
  );
};

export default SelectionMenu;
