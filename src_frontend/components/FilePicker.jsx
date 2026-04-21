import { useState, useEffect, useCallback, useMemo } from "react";

import { useTranslation } from "../contexts/TranslationContext";
import { useIsMounted } from "../hooks/useIsMounted";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";
import LoadingIndicator from "./LoadingIndicator";
import SelectionMenu from "./SelectionMenu";

const ACTION_SELECT_CURRENT_DIRECTORY = "ACTION_SELECT_CURRENT_DIRECTORY";

const FilePicker = ({ onSelect, onClose, title, mode = "file" }) => {
  const { t } = useTranslation();
  const isMounted = useIsMounted();

  const [isLoading, setIsLoading] = useState(true);

  const [directoryData, setDirectoryData] = useState({});

  const { currentPath, entries } = directoryData;

  const loadDirectory = useCallback(
    async (directoryPath = null) => {
      setIsLoading(true);
      try {
        const response = await api.listDirectory(directoryPath);
        if (isMounted()) {
          setDirectoryData(response);
        }
      } catch (error) {
        api.logError("Failed to list directory", error);
      } finally {
        if (isMounted()) {
          setIsLoading(false);
        }
      }
    },
    [isMounted],
  );

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const handleSelect = useCallback(
    (selectedValue) => {
      if (selectedValue === ACTION_SELECT_CURRENT_DIRECTORY) {
        onSelect(currentPath);
        return;
      }

      const selectedEntry = entries.find(
        (entry) => entry.path === selectedValue,
      );

      if (!selectedEntry) {
        return;
      }

      if (selectedEntry.isDirectory) {
        loadDirectory(selectedEntry.path);
      } else if (mode === "file") {
        onSelect(selectedEntry.path);
      }
    },
    [currentPath, entries, loadDirectory, mode, onSelect],
  );

  const options = useMemo(() => {
    const generatedOptions = [];

    if (isLoading) {
      return generatedOptions;
    }

    if (mode === "directory") {
      generatedOptions.push([
        `✔️ ${t("Select Current Directory")}`,
        ACTION_SELECT_CURRENT_DIRECTORY,
      ]);
    }

    const validEntries =
      mode === "directory"
        ? entries.filter((entry) => entry.isDirectory)
        : entries;

    const entryOptions = validEntries.map((entry) => {
      const icon = entry.isDirectory ? "📁" : "📄";
      return [`${icon} ${entry.name}`, entry.path];
    });

    return [...generatedOptions, ...entryOptions];
  }, [entries, mode, t, isLoading]);

  if (isLoading) {
    return (
      <DialogLayout title={title} description={currentPath}>
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
      showCheckmark={false}
    />
  );
};

export default FilePicker;
