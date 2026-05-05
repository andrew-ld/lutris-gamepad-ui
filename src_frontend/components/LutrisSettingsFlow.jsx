import { useCallback, useState, useMemo } from "react";

import { useToastActions } from "../contexts/ToastContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useViewActions } from "../contexts/ViewContext";
import { useAsyncEffect } from "../hooks/useAsyncEffect";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";
import LoadingIndicator from "./LoadingIndicator";
import LutrisSettingsMenu from "./LutrisSettingsMenu";
import SelectionMenu from "./SelectionMenu";

const LutrisSettingsFlow = ({ onClose }) => {
  const { t } = useTranslation();
  const { showToast } = useToastActions();
  const { resetSize } = useViewActions();
  const [loading, setLoading] = useState(true);
  const [runners, setRunners] = useState([]);
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [isRunnerSelected, setIsRunnerSelected] = useState(false);

  useAsyncEffect(
    async (isCancelled) => {
      try {
        const data = await api.getLutrisRunners();
        if (!isCancelled()) {
          setRunners(data.runners || []);
        }
      } catch {
        if (!isCancelled()) {
          showToast({
            title: t("Failed to fetch Lutris runners"),
            type: "error",
          });
          onClose();
        }
      } finally {
        if (!isCancelled()) {
          setLoading(false);
        }
      }
    },
    [onClose, showToast, t],
  );

  const runnerOptions = useMemo(() => {
    return [[t("Global"), null], ...runners.map((r) => [r.human_name, r.name])];
  }, [runners, t]);

  const handleSelectRunner = useCallback(
    (runnerSlug) => {
      resetSize();
      setSelectedRunner(runnerSlug);
      setIsRunnerSelected(true);
    },
    [resetSize],
  );

  const handleBackToSelection = useCallback(() => {
    resetSize();
    setIsRunnerSelected(false);
  }, [resetSize]);

  if (loading) {
    return (
      <DialogLayout title={t("Lutris Settings")}>
        <div className="dialog-layout-loading">
          <LoadingIndicator />
        </div>
      </DialogLayout>
    );
  }

  if (!isRunnerSelected) {
    return (
      <SelectionMenu
        title={t("Lutris Settings")}
        description={t("Select Runner")}
        options={runnerOptions}
        currentValue={selectedRunner}
        onSelect={handleSelectRunner}
        onClose={onClose}
        showCheckmark={false}
      />
    );
  }

  return (
    <LutrisSettingsMenu
      runnerSlug={selectedRunner}
      onClose={handleBackToSelection}
    />
  );
};

export default LutrisSettingsFlow;
