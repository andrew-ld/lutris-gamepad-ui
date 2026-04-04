import React from "react";
import "../styles/FocusableRow.css";

const FocusableRow = React.forwardRef(
  ({ children, isFocused, onClick, onMouseEnter }, ref) => {
    return (
      <div
        ref={ref}
        className={`focusable-row ${isFocused ? "focused" : ""}`}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        {children}
      </div>
    );
  },
);

FocusableRow.displayName = "FocusableRow";

export default React.memo(FocusableRow);
