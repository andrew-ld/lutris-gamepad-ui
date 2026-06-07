import { useEffect, useRef, useState, useCallback } from "react";

import { useModalState, useModalActions } from "../stores/modalStore";
import { ViewStoreBinder } from "../stores/viewStore";
import "../styles/Modal.css";

const ModalRenderer = () => {
  const { topModal, isModalOpen } = useModalState();
  const { hideModal } = useModalActions();
  const [maxSize, setMaxSize] = useState({ width: 0, height: 0 });
  const contentReference = useRef(null);
  const [previousModalId, setPreviousModalId] = useState(topModal?.id);

  const resetSize = useCallback(() => {
    setMaxSize({ width: 0, height: 0 });
  }, []);

  if (topModal?.id !== previousModalId) {
    setPreviousModalId(topModal?.id);
    resetSize();
  }

  useEffect(() => {
    const handleWindowResize = () => {
      resetSize();
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [resetSize]);

  useEffect(() => {
    if (!contentReference.current || !isModalOpen) return;

    const observer = new ResizeObserver((entries) => {
      let measuredWidth = 0;
      let measuredHeight = 0;

      for (const entry of entries) {
        measuredWidth = Math.max(entry.target.offsetWidth, measuredWidth);
        measuredHeight = Math.max(entry.target.offsetHeight, measuredHeight);
      }

      if (measuredWidth > 0 || measuredHeight > 0) {
        setMaxSize((previous) => ({
          width: Math.max(previous.width, measuredWidth),
          height: Math.max(previous.height, measuredHeight),
        }));
      }
    });

    observer.observe(contentReference.current);
    return () => observer.disconnect();
  }, [isModalOpen, topModal]);

  if (!isModalOpen) {
    return null;
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      hideModal();
    }
  };

  const contentStyle = {
    minWidth: maxSize.width > 0 ? `${maxSize.width}px` : undefined,
    minHeight: maxSize.height > 0 ? `${maxSize.height}px` : undefined,
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-content"
        ref={contentReference}
        style={contentStyle}
        key={topModal.id}
      >
        <ViewStoreBinder onResetSize={resetSize}>
          {topModal.content}
        </ViewStoreBinder>
      </div>
    </div>
  );
};

export default ModalRenderer;
