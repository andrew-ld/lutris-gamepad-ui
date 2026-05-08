import { useCallback, useMemo, useRef, useState } from "react";

import { useAsyncEffect } from "../hooks/useAsyncEffect";
import { useIsMounted } from "../hooks/useIsMounted";
import { useToastActions } from "../stores/toastStore";
import { useTranslation } from "../stores/translationStore";
import * as api from "../utils/ipc";

import AbstractLutrisSettingsMenu from "./AbstractLutrisSettingsMenu";

const LutrisSettingsMenu = ({
  gameIdentifier = null,
  runnerSlug = null,
  onClose,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToastActions();
  const isMounted = useIsMounted();
  const fetchRequestId = useRef(0);
  const [settings, setSettings] = useState(null);
  const [gameName, setGameName] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(
    async ({ showLoading = true, isMountedCheck = isMounted } = {}) => {
      const requestId = fetchRequestId.current + 1;
      fetchRequestId.current = requestId;

      const isCurrentRequest = () =>
        isMountedCheck() && fetchRequestId.current === requestId;

      if (showLoading && isCurrentRequest()) {
        setLoading(true);
      }

      try {
        const data = await api.getLutrisSettings(gameIdentifier, runnerSlug);
        if (isCurrentRequest() && data && data.settings) {
          setSettings(data.settings);
          if (data.game_name) {
            setGameName(data.game_name);
          }
        }
      } catch (error) {
        api.logError("Failed to fetch Lutris settings", error);
        if (isCurrentRequest()) {
          showToast({
            title: t("Failed to fetch Lutris settings"),
            type: "error",
          });
        }
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    },
    [gameIdentifier, isMounted, runnerSlug, showToast, t],
  );

  useAsyncEffect(
    async (isMountedCheck) => {
      await fetchSettings({
        showLoading: false,
        isMountedCheck,
      });
    },
    [fetchSettings],
  );

  const updateSetting = useCallback(
    async (section, key, value, type) => {
      setLoading(true);
      try {
        await api.updateLutrisSetting(
          section,
          key,
          value,
          type,
          gameIdentifier,
          runnerSlug,
        );
        await fetchSettings({ showLoading: false });
      } catch (error) {
        api.logError("Failed to update Lutris setting", error);
        if (isMounted()) {
          showToast({
            title: t("Failed to update Lutris setting"),
            type: "error",
          });
        }
      } finally {
        if (isMounted()) {
          setLoading(false);
        }
      }
    },
    [gameIdentifier, runnerSlug, fetchSettings, isMounted, showToast, t],
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
