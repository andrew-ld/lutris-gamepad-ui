import { useCallback, useMemo, useState } from "react";

import { useAsyncEffect } from "../hooks/useAsyncEffect";
import { useToastActions } from "../stores/toastStore";
import { useTranslation } from "../stores/translationStore";
import { useViewActions } from "../stores/viewStore";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";
import LoadingIndicator from "./LoadingIndicator";
import LutrisAddGameSettingsMenu from "./LutrisAddGameSettingsMenu";
import SelectionMenu from "./SelectionMenu";

const LutrisAddGameFlow = ({ onClose, onSaved }) => {
  const { t } = useTranslation();
  const { showToast } = useToastActions();
  const { resetSize } = useViewActions();
  const [loading, setLoading] = useState(true);
  const [runners, setRunners] = useState([]);
  const [selectedRunner, setSelectedRunner] = useState(null);

  useAsyncEffect(
    async (isMounted) => {
      try {
        const data = await api.getLutrisRunners();
        if (isMounted()) {
          setRunners(data.runners || []);
        }
      } catch {
        if (isMounted()) {
          showToast({
            title: t("Failed to fetch Lutris runners"),
            type: "error",
          });
          onClose();
        }
      } finally {
        if (isMounted()) {
          setLoading(false);
        }
      }
    },
    [onClose, showToast, t],
  );

  const runnerOptions = useMemo(
    () => runners.map((runner) => [runner.human_name, runner.name]),
    [runners],
  );

  const selectedRunnerInfo = useMemo(
    () => runners.find((runner) => runner.name === selectedRunner),
    [runners, selectedRunner],
  );

  const handleSelectRunner = useCallback(
    (runnerSlug) => {
      resetSize();
      setSelectedRunner(runnerSlug);
    },
    [resetSize],
  );

  const handleBackToSelection = useCallback(() => {
    resetSize();
    setSelectedRunner(null);
  }, [resetSize]);

  if (loading) {
    return (
      <DialogLayout title={t("Add Game")}>
        <div className="dialog-layout-loading">
          <LoadingIndicator />
        </div>
      </DialogLayout>
    );
  }

  if (!selectedRunner) {
    return (
      <SelectionMenu
        title={t("Add Game")}
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
    <LutrisAddGameSettingsMenu
      runnerSlug={selectedRunner}
      runnerName={selectedRunnerInfo?.human_name}
      onClose={handleBackToSelection}
      onDone={onClose}
      onSaved={onSaved}
    />
  );
};

export default LutrisAddGameFlow;
