import { useEffect } from "react";
import TopBar from "./TopBar";
import SystemMenu from "./SystemMenu";
import LibraryContainer from "./LibraryContainer";
import UpdateDialog from "./UpdateDialog";
import { useToastActions } from "../contexts/ToastContext";
import { useModalActions } from "../contexts/ModalContext";
import { onShowToast, onUpdateAvailable } from "../utils/ipc";

const AppContent = () => {
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
    <div className="App">
      <TopBar />
      <SystemMenu />
      <LibraryContainer />
    </div>
  );
};

export default AppContent;
