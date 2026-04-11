import { useCallback, useMemo } from "react";

import SelectionMenu from "./SelectionMenu";

const SELECT_CURRENT_DIRECTORY = "__select_current_directory__";
const NAVIGATE_PARENT = "__navigate_parent__";

const Pathfinder = ({
  data,
  targetItem,
  maxWidth,
  onNavigate,
  onSelectPath,
  onClose,
  t,
}) => {
  const navigateTo = useCallback(
    async (path) => {
      await onNavigate(path, targetItem);
    },
    [onNavigate, targetItem],
  );

  const selectPath = useCallback(
    (path) => {
      onSelectPath(targetItem, path);
    },
    [onSelectPath, targetItem],
  );

  const entriesByPath = useMemo(() => {
    return new Map((data?.entries || []).map((entry) => [entry.path, entry]));
  }, [data]);

  const handleSelect = useCallback(
    async (value) => {
      const action = {
        [SELECT_CURRENT_DIRECTORY]: () => selectPath(data.path),
        [NAVIGATE_PARENT]: () => navigateTo(data.parent),
      }[value];

      if (action) {
        await action();
        return;
      }

      const entry = entriesByPath.get(value);
      if (!entry) {
        return;
      }

      if (entry.type === "directory") {
        await navigateTo(entry.path);
        return;
      }

      selectPath(entry.path);
    },
    [data, entriesByPath, navigateTo, selectPath],
  );

  const isRootPath = data?.path === data?.parent;

  const options = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      [t("Select this directory"), SELECT_CURRENT_DIRECTORY],
      ...(isRootPath ? [] : [[t(".. (Parent Directory)"), NAVIGATE_PARENT]]),
      ...data.entries.map((entry) => {
        const labelPrefix = entry.type === "directory" ? "[DIR]" : "[FILE]";
        const suffix = entry.type === "directory" ? "/" : "";
        return [`${labelPrefix} ${entry.name}${suffix}`, entry.path];
      }),
    ];
  }, [data, isRootPath, t]);

  if (!data) {
    return null;
  }

  return (
    <SelectionMenu
      title={targetItem?.label || t("Directory")}
      description={data.path}
      options={options}
      currentValue={targetItem?.value}
      maxWidth={maxWidth}
      showCheckmark={false}
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
};

export default Pathfinder;
