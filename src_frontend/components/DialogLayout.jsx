import React from "react";
import LegendaContainer from "./LegendaContainer";
import "../styles/DialogLayout.css";

const DialogLayout = ({
  title,
  description,
  children,
  legendItems = [],
  maxWidth = "500px",
  className = "",
  contentClassName = "",
  containerRef,
  style = {},
}) => {
  return (
    <div
      className={`dialog-layout-container ${className}`}
      style={{ maxWidth, ...style }}
      ref={containerRef}
    >
      <LegendaContainer legendItems={legendItems}>
        <div className={`dialog-layout-content ${contentClassName}`}>
          {title && <h2 className="dialog-layout-title">{title}</h2>}
          {description && (
            <p className="dialog-layout-description">{description}</p>
          )}
          {children}
        </div>
      </LegendaContainer>
    </div>
  );
};

export default DialogLayout;
