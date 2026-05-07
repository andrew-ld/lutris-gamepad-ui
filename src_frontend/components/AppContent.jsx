import { useEffect } from "react";

import { useStaticSettings } from "../hooks/useStaticSettings";
import { useInput } from "../stores/inputStore";
import { useModalActions } from "../stores/modalStore";
import { useToastActions } from "../stores/toastStore";
import { onShowToast, onUpdateAvailable } from "../utils/ipc";

import LibraryContainer from "./LibraryContainer";
import SystemMenu from "./SystemMenu";
import TopBar from "./TopBar";
import UpdateDialog from "./UpdateDialog";

const AppContent = () => {
  const { isMouseActive } = useInput();
  const { staticSettings } = useStaticSettings();
  const { showToast } = useToastActions();
  const { showModal } = useModalActions();

  useEffect(() => {
    const handleShowToast = (payload) => {
      showToast(payload);
    };

    const unsubscribeOnShowToast = onShowToast(handleShowToast);

    const handleUpdateAvailable = ({ version, url }) => {
      showModal((hideModal) => (
        <UpdateDialog
          newVersion={version}
          releaseUrl={url}
          onClose={hideModal}
        />
      ));
    };

    const unsubsctibeOnUpdateAvaiable = onUpdateAvailable(
      handleUpdateAvailable,
    );

    return () => {
      unsubscribeOnShowToast();
      unsubsctibeOnUpdateAvaiable();
    };
  }, [showToast, showModal]);

  return (
    <div
      className={`App ${isMouseActive ? "mouse-active" : ""} ${
        staticSettings?.DISABLE_ANIMATIONS ? "disable-animations" : ""
      }`}
    >
      <TopBar />
      <SystemMenu />
      <LibraryContainer />
    </div>
  );
};

export default AppContent;
