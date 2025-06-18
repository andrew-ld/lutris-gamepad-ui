import "../styles/CloseButton.css";

const CloseButton = () => {
  const handleClose = () => {
    window.close();
  };

  return (
    <button
      className="close-button"
      onClick={handleClose}
      aria-label="Close Application"
    >
      ×
    </button>
  );
};

export default CloseButton;
