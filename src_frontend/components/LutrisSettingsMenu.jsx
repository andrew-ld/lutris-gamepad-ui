import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "../contexts/TranslationContext";
import { useAsyncEffect } from "../hooks/useAsyncEffect";
import { useAsyncGuard } from "../hooks/useAsyncGuard";
import * as api from "../utils/ipc";

import AbstractLutrisSettingsMenu from "./AbstractLutrisSettingsMenu";

const LutrisSettingsMenu = ({
  gameSlug = null,
  runnerSlug = null,
  onClose,
}) => {
  const { t } = useTranslation();
  const isCancelled = useAsyncGuard();
  const [settings, setSettings] = useState(null);
  const [gameName, setGameName] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(
    async ({
      showLoading = true,
      isCancelledCheck = isCancelled,
    } = {}) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const data = await api.getLutrisSettings(gameSlug, runnerSlug);
        if (!isCancelledCheck() && data && data.settings) {
          setSettings(data.settings);
          if (data.game_name) {
            setGameName(data.game_name);
          }
        }
      } finally {
        if (!isCancelledCheck()) {
          setLoading(false);
        }
      }
    },
    [gameSlug, isCancelled, runnerSlug],
  );

  useAsyncEffect(async (isCancelledCheck) => {
    await fetchSettings({
      showLoading: false,
      isCancelledCheck,
    });
  }, [fetchSettings]);

  const updateSetting = useCallback(
    async (section, key, value, type) => {
      setLoading(true);
      try {
        await api.updateLutrisSetting(
          section,
          key,
          value,
          type,
          gameSlug,
          runnerSlug,
        );
        await fetchSettings({ showLoading: false });
      } finally {
        if (!isCancelled()) {
          setLoading(false);
        }
      }
    },
    [gameSlug, runnerSlug, fetchSettings, isCancelled],
  );

  const currentTitle = useMemo(() => {
    if (gameName) {
      return t("Settings: {{name}}", { name: gameName });
    }
    return t("Lutris Settings");
  }, [gameName, t]);

  return (
    <AbstractLutrisSettingsMenu
      title={currentTitle}
      settings={settings}
      loading={loading}
      onClose={onClose}
      onUpdateSetting={updateSetting}
    />
  );
};

export default LutrisSettingsMenu;
