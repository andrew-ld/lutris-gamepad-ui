import { useState, useEffect } from "react";
import { useToastState, useToastActions } from "../contexts/ToastContext";
import "../styles/Toast.css";

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
  >
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const Toast = ({ title, description, type, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
  };

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(onDismiss, 300);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onDismiss]);

  return (
    <div className={`toast-item ${type} ${isExiting ? "exiting" : ""}`}>
      <div className="toast-content">
        <span className="toast-title">{title}</span>
        {description && (
          <span className="toast-description">{description}</span>
        )}
      </div>
      <button className="toast-close-button" onClick={handleDismiss}>
        <CloseIcon />
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const { subscribe } = useToastState();
  const { hideToast } = useToastActions();
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribe(setToasts);
    return unsubscribe;
  }, [subscribe]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          title={toast.title}
          description={toast.description}
          type={toast.type}
          onDismiss={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
