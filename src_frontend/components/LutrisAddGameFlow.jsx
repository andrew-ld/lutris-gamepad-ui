import { useCallback, useEffect, useMemo, useState } from "react";

import { useToastActions } from "../contexts/ToastContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useViewActions } from "../contexts/ViewContext";
import { useIsMounted } from "../hooks/useIsMounted";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";
import LoadingIndicator from "./LoadingIndicator";
import LutrisAddGameSettingsMenu from "./LutrisAddGameSettingsMenu";
import SelectionMenu from "./SelectionMenu";

const LutrisAddGameFlow = ({ onClose, onSaved, maxWidth = "700px" }) => {
  const { t } = useTranslation();
  const { showToast } = useToastActions();
  const { resetSize } = useViewActions();
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState(true);
  const [runners, setRunners] = useState([]);
  const [selectedRunner, setSelectedRunner] = useState(null);

  const fetchRunners = useCallback(async () => {
    setLoading(true);
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
  }, [onClose, showToast, t, isMounted]);

  useEffect(() => {
    fetchRunners();
  }, [fetchRunners]);

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
      <DialogLayout title={t("Add Game")} maxWidth={maxWidth}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px",
          }}
        >
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
        maxWidth={maxWidth}
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
      maxWidth={maxWidth}
    />
  );
};

export default LutrisAddGameFlow;
