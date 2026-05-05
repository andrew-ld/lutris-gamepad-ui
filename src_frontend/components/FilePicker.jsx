import { useState, useCallback, useMemo } from "react";

import { useTranslation } from "../contexts/TranslationContext";
import { useAsyncEffect } from "../hooks/useAsyncEffect";
import { useAsyncGuard } from "../hooks/useAsyncGuard";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";
import LoadingIndicator from "./LoadingIndicator";
import SelectionMenu from "./SelectionMenu";

const FilePicker = ({
  onSelect,
  onClose,
  title,
  mode = "file",
  initialPath = null,
}) => {
  const { t } = useTranslation();
  const isCancelled = useAsyncGuard();

  const [isLoading, setIsLoading] = useState(true);

  const [directoryData, setDirectoryData] = useState({});

  const { currentPath, entries = [] } = directoryData;

  const loadDirectory = useCallback(
    async (
      directoryPath = null,
      {
        showLoading = true,
        isCancelledCheck = isCancelled,
      } = {},
    ) => {
      if (showLoading) {
        setIsLoading(true);
      }
      try {
        const response = await api.listDirectory(directoryPath);
        if (!isCancelledCheck()) {
          setDirectoryData(response);
        }
      } catch (error) {
        api.logError("Failed to list directory", error);
      } finally {
        if (!isCancelledCheck()) {
          setIsLoading(false);
        }
      }
    },
    [isCancelled],
  );

  useAsyncEffect(async (isCancelledCheck) => {
    await loadDirectory(initialPath, {
      showLoading: false,
      isCancelledCheck,
    });
  }, [initialPath, loadDirectory]);

  const handleSelect = useCallback(
    (selectedValue) => {
      const selectedEntry = entries.find(
        (entry) => entry.path === selectedValue,
      );

      if (!selectedEntry) {
        return;
      }

      if (selectedEntry.isDirectory) {
        void loadDirectory(selectedEntry.path);
      } else if (mode === "file") {
        onSelect(selectedEntry.path);
      }
    },
    [entries, loadDirectory, mode, onSelect],
  );

  const options = useMemo(() => {
    if (isLoading) {
      return [];
    }

    const validEntries =
      mode === "directory"
        ? entries.filter((entry) => entry.isDirectory)
        : entries;

    const entryOptions = validEntries.map((entry) => {
      const icon = entry.isDirectory ? "📁" : "📄";
      return [`${icon} ${entry.name}`, entry.path];
    });

    return entryOptions;
  }, [entries, mode, isLoading]);

  const handleSelectCurrentDirectory = useCallback(() => {
    if (mode === "directory" && currentPath) {
      onSelect(currentPath);
    }
  }, [currentPath, mode, onSelect]);

  const handleAction = useCallback(
    (actionName) => {
      if (actionName === "Y") {
        handleSelectCurrentDirectory();
      }
    },
    [handleSelectCurrentDirectory],
  );

  const extraLegendItems = useMemo(() => {
    if (mode !== "directory" || !currentPath) {
      return [];
    }

    return [
      {
        button: "Y",
        label: t("Select Current Directory"),
        onClick: handleSelectCurrentDirectory,
      },
    ];
  }, [currentPath, handleSelectCurrentDirectory, mode, t]);

  const emptyMessage =
    mode === "directory"
      ? t("No directories available.")
      : t("No files available.");

  if (isLoading) {
    return (
      <DialogLayout title={title} description={currentPath} className="wide">
        <LoadingIndicator />
      </DialogLayout>
    );
  }

  return (
    <SelectionMenu
      title={title}
      description={currentPath}
      options={options}
      onSelect={handleSelect}
      onClose={onClose}
      onAction={handleAction}
      extraLegendItems={extraLegendItems}
      emptyMessage={emptyMessage}
      showCheckmark={false}
    />
  );
};

export default FilePicker;
