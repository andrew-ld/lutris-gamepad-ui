import { useModalState, useModalActions } from "../contexts/ModalContext";
import "../styles/Modal.css";

const ModalRenderer = () => {
  const { topModal, isModalOpen } = useModalState();
  const { hideModal } = useModalActions();

  if (!isModalOpen) {
    return null;
  }

  const handleOverlayClick = () => {
    hideModal();
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={handleContentClick}>
        {topModal.content}
      </div>
    </div>
  );
};

export default ModalRenderer;
