import "../styles/ToggleButton.css";

const ToggleButton = ({ isToggledOn, labelOn, labelOff, onClick }) => {
  return (
    <button
      className="toggle-button"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      {isToggledOn ? labelOn : labelOff}
    </button>
  );
};

export default ToggleButton;
