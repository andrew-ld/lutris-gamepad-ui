import { useCallback, useMemo, useState } from "react";

import { useAsyncEffect } from "../hooks/useAsyncEffect";
import { useIsMounted } from "../hooks/useIsMounted";
import { useToastActions } from "../stores/toastStore";
import { useTranslation } from "../stores/translationStore";
import * as api from "../utils/ipc";

import AbstractLutrisSettingsMenu from "./AbstractLutrisSettingsMenu";

const ADD_GAME_SECTION_ORDER = ["info", "game", "runner", "system"];
const isReleaseYear = (value) => /^\d+$/.test(value);

const updateOptionValue = (settings, section, key, value) => {
  if (!settings) return settings;
  return {
    ...settings,
    [section]: (settings[section] || []).map((option) =>
      option.key === key ? { ...option, value } : option,
    ),
  };
};

const LutrisAddGameSettingsMenu = ({
  runnerSlug,
  runnerName,
  onClose,
  onDone = onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToastActions();
  const isMounted = useIsMounted();
  const [settings, setSettings] = useState(null);
  const [changedSettings, setChangedSettings] = useState({});
  const [gameInfo, setGameInfo] = useState({
    name: "",
    sortname: "",
    year: "",
  });
  const [loading, setLoading] = useState(true);

  useAsyncEffect(
    async (isMountedCheck) => {
      try {
        const data = await api.getNewGameLutrisSettings(runnerSlug);
        if (isMountedCheck() && data && data.settings) {
          setSettings(data.settings);
        }
      } catch (error) {
        api.logError("Failed to fetch new game Lutris settings", error);
        if (isMountedCheck()) {
          showToast({
            title: t("Failed to fetch Lutris settings"),
            type: "error",
          });
        }
      } finally {
        if (isMountedCheck()) {
          setLoading(false);
        }
      }
    },
    [runnerSlug, showToast, t],
  );

  const infoSettings = useMemo(
    () => [
      {
        key: "name",
        label: t("Name"),
        type: "string",
        value: gameInfo.name,
        default: t("Required"),
      },
      {
        key: "sortname",
        label: t("Sort name"),
        type: "string",
        value: gameInfo.sortname,
        default: t("Optional"),
      },
      {
        key: "year",
        label: t("Release year"),
        type: "string",
        value: gameInfo.year,
        default: t("Optional"),
      },
    ],
    [gameInfo.name, gameInfo.sortname, gameInfo.year, t],
  );

  const combinedSettings = useMemo(() => {
    if (!settings) return null;
    return {
      info: infoSettings,
      ...settings,
    };
  }, [settings, infoSettings]);

  const updateSetting = useCallback((section, key, value) => {
    if (section === "info") {
      setGameInfo((previous) => ({ ...previous, [key]: value }));
      return;
    }

    setSettings((previous) => updateOptionValue(previous, section, key, value));
    setChangedSettings((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [key]: value,
      },
    }));
  }, []);

  const sectionLabels = useMemo(
    () => ({
      info: t("Info"),
      game: t("Game"),
      runner: t("Runner"),
      system: t("System"),
    }),
    [t],
  );

  const handleSubmit = useCallback(async () => {
    const name = gameInfo.name.trim();
    const year = gameInfo.year.trim();

    if (!name) {
      showToast({
        title: t("Game name is required"),
        type: "error",
      });
      return;
    }

    if (year && !isReleaseYear(year)) {
      showToast({
        title: t("Release year must be a number"),
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      let result;
      try {
        result = await api.addLutrisGame({
          name,
          sortname: gameInfo.sortname.trim(),
          year,
          runner: runnerSlug,
          settings: changedSettings,
        });
      } catch (error) {
        api.logError("Failed to add Lutris game", error);
        if (isMounted()) {
          showToast({
            title: t("Failed to add game"),
            type: "error",
          });
        }
        return;
      }

      if (isMounted()) {
        showToast({
          title: t("Added {{name}}", { name }),
          type: "success",
        });
        try {
          await onSaved?.(result);
        } catch (error) {
          api.logError("Failed to refresh library after adding game", error);
        }
        onDone();
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [
    changedSettings,
    gameInfo.name,
    gameInfo.sortname,
    gameInfo.year,
    isMounted,
    onDone,
    onSaved,
    runnerSlug,
    showToast,
    t,
  ]);

  return (
    <AbstractLutrisSettingsMenu
      title={t("Add Game: {{runner}}", { runner: runnerName || runnerSlug })}
      settings={combinedSettings}
      loading={loading}
      onClose={onClose}
      onUpdateSetting={updateSetting}
      onSubmit={handleSubmit}
      submitLabel={t("Save")}
      sectionOrder={ADD_GAME_SECTION_ORDER}
      sectionLabels={sectionLabels}
    />
  );
};

export default LutrisAddGameSettingsMenu;
