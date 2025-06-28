import { useModal } from "../contexts/ModalContext";
import "../styles/Modal.css";

const ModalRenderer = () => {
  const { modals, hideModal, isModalOpen } = useModal();

  if (!isModalOpen) {
    return null;
  }

  const topModal = modals[modals.length - 1];

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
