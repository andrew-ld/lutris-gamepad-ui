import React from "react";
import ButtonIcon from "./ButtonIcon";
import "../styles/LegendaContainer.css";

const LegendaContainer = ({ children, legendItems = [] }) => {
  return (
    <div className="legenda-container">
      <div className="legenda-content">{children}</div>
      {legendItems.length > 0 && (
        <div className="legenda-footer">
          <div className="legenda-items-wrapper">
            {legendItems.map((item) => (
              <ButtonIcon
                key={item.button + (item.label || "")}
                size="small"
                {...item}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(LegendaContainer);
