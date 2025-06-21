import { useModal } from "../contexts/ModalContext";
import "../styles/Modal.css";

const ModalRenderer = () => {
  const { modalContent, hideModal } = useModal();

  if (!modalContent) {
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
        {modalContent}
      </div>
    </div>
  );
};

export default ModalRenderer;
