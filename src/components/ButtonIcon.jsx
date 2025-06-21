import "../styles/ButtonIcon.css";

const ButtonIcon = ({ button, label, size = "large", onClick }) => (
  <div
    className={`button-hint size-${size} ${onClick ? "clickable" : ""}`}
    onClick={onClick}
  >
    <div className={`button-icon button-${button.toLowerCase()}`}>{button}</div>
    {label && <span className="button-label">{label}</span>}
  </div>
);

export default ButtonIcon;
