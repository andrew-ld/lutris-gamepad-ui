import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import SelectionMenu from "./SelectionMenu";
import LutrisSettingsMenu from "./LutrisSettingsMenu";
import LoadingIndicator from "./LoadingIndicator";
import DialogLayout from "./DialogLayout";
import * as api from "../utils/ipc";
import { useToastActions } from "../contexts/ToastContext";
import { useViewActions } from "../contexts/ViewContext";
import { useIsMounted } from "../hooks/useIsMounted";

const LutrisSettingsFlow = ({ onClose, maxWidth = "700px" }) => {
  const { t } = useTranslation();
  const { showToast } = useToastActions();
  const { resetSize } = useViewActions();
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState(true);
  const [runners, setRunners] = useState([]);
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [isRunnerSelected, setIsRunnerSelected] = useState(false);

  const fetchRunners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLutrisRunners();
      if (isMounted()) {
        setRunners(data.runners || []);
      }
    } catch (error) {
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
      <DialogLayout title={t("Lutris Settings")} maxWidth={maxWidth}>
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

  if (!isRunnerSelected) {
    return (
      <SelectionMenu
        title={t("Lutris Settings")}
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
    <LutrisSettingsMenu
      runnerSlug={selectedRunner}
      onClose={handleBackToSelection}
    />
  );
};

export default LutrisSettingsFlow;
