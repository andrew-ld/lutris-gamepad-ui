import "../styles/FocusableRow.css";

const FocusableRow = ({ children, isFocused, onClick, onMouseEnter }) => {
  return (
    <div
      className={`focusable-row ${isFocused ? "focused" : ""}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {children}
    </div>
  );
};

export default FocusableRow;
