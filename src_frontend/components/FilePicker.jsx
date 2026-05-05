import { useState, useCallback, useMemo } from "react";

import { useToastActions } from "../contexts/ToastContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useAsyncEffect } from "../hooks/useAsyncEffect";
import { useIsMounted } from "../hooks/useIsMounted";
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
  const { showToast } = useToastActions();
  const isMounted = useIsMounted();

  const [isLoading, setIsLoading] = useState(true);

  const [directoryData, setDirectoryData] = useState({});

  const { currentPath, entries = [] } = directoryData;

  const loadDirectory = useCallback(
    async (
      directoryPath = null,
      {
        allowFallback = false,
        showLoading = true,
        isMountedCheck = isMounted,
      } = {},
    ) => {
      if (showLoading) {
        setIsLoading(true);
      }
      try {
        const response = await api.listDirectory(directoryPath, allowFallback);
        if (isMountedCheck()) {
          setDirectoryData(response);
          if (allowFallback && response.fallbackFrom) {
            showToast({
              title: t("Initial folder unavailable"),
              description: t(
                'Showing "{{currentPath}}" instead of "{{fallbackFrom}}".',
                {
                  currentPath: response.currentPath,
                  fallbackFrom: response.fallbackFrom,
                },
              ),
              type: "warning",
            });
          }
        }
      } catch (error) {
        api.logError("Failed to list directory", directoryPath, error);
      } finally {
        if (isMountedCheck()) {
          setIsLoading(false);
        }
      }
    },
    [isMounted, showToast, t],
  );

  useAsyncEffect(
    async (isMountedCheck) => {
      await loadDirectory(initialPath, {
        allowFallback: true,
        showLoading: false,
        isMountedCheck,
      });
    },
    [initialPath, loadDirectory],
  );

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
