import { useEffect, useRef, useState, useCallback } from "react";

import { useModalState, useModalActions } from "../contexts/ModalContext";
import { ViewProvider } from "../contexts/ViewContext";
import "../styles/Modal.css";

const ModalRenderer = () => {
  const { topModal, isModalOpen } = useModalState();
  const { hideModal } = useModalActions();
  const [maxSize, setMaxSize] = useState({ width: 0, height: 0 });
  const contentRef = useRef(null);
  const [prevModalId, setPrevModalId] = useState(topModal?.id);

  const resetSize = useCallback(() => {
    setMaxSize({ width: 0, height: 0 });
  }, []);

  if (topModal?.id !== prevModalId) {
    setPrevModalId(topModal?.id);
    resetSize();
  }

  useEffect(() => {
    if (!contentRef.current || !isModalOpen) return;

    const observer = new ResizeObserver((entries) => {
      let maxWidth = 0;
      let maxHeight = 0;

      for (const entry of entries) {
        maxWidth = Math.max(entry.target.offsetWidth, maxWidth);
        maxHeight = Math.max(entry.target.offsetHeight, maxHeight);
      }

      if (maxWidth > 0 || maxHeight > 0) {
        setMaxSize((prev) => ({
          width: Math.max(prev.width, maxWidth),
          height: Math.max(prev.height, maxHeight),
        }));
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [isModalOpen, topModal]);

  if (!isModalOpen) {
    return null;
  }

  const handleOverlayClick = () => {
    hideModal();
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  const contentStyle = {
    minWidth: maxSize.width > 0 ? `${maxSize.width}px` : undefined,
    minHeight: maxSize.height > 0 ? `${maxSize.height}px` : undefined,
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-content"
        onClick={handleContentClick}
        ref={contentRef}
        style={contentStyle}
        key={topModal.id}
      >
        <ViewProvider onResetSize={resetSize}>{topModal.content}</ViewProvider>
      </div>
    </div>
  );
};

export default ModalRenderer;
