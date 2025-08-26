import { useMemo, useCallback, useState } from "react";
import LegendaContainer from "./LegendaContainer";
import RowBasedMenu from "./RowBasedMenu";
import FocusableRow from "./FocusableRow";
import packageJson from "../../package.json";
import "../styles/About.css";
import { openExternalLink } from "../utils/ipc";
import { useTranslation } from "../contexts/TranslationContext";

export const AboutFocusId = "About";

const About = ({ onClose }) => {
  const { t } = useTranslation();
  const [focusedItem, setFocusedItem] = useState(null);

  const menuItems = useMemo(
    () => [
      { label: t("Version"), value: packageJson.version },
      { label: t("Author"), value: packageJson.author.name },
      {
        label: t("Homepage"),
        value: packageJson.homepage,
        isLink: true,
      },
      { label: t("License"), value: packageJson.license },
    ],
    [t]
  );

  const handleAction = useCallback(
    (actionName, item) => {
      if (actionName === "B") {
        onClose();
      }
      if (actionName === "A" && item.isLink) {
        openExternalLink(item.value);
      }
    },
    [onClose]
  );

  const handleFocusChange = useCallback((item) => {
    setFocusedItem(item);
  }, []);

  const renderItem = useCallback((item, isFocused, onMouseEnter) => {
    const valueContent = item.isLink ? (
      <a
        href={item.value}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.preventDefault()}
      >
        {item.value}
      </a>
    ) : (
      item.value
    );

    return (
      <FocusableRow
        key={item.label}
        isFocused={isFocused}
        onMouseEnter={onMouseEnter}
        onClick={() => {
          if (item.isLink) {
            openExternalLink(item.value);
          }
        }}
      >
        <span className="about-row-label">{item.label}</span>
        <span className="about-row-value">{valueContent}</span>
      </FocusableRow>
    );
  }, []);

  const legendItems = useMemo(() => {
    const items = [];
    if (focusedItem?.isLink) {
      items.push({
        button: "A",
        label: t("Open Link"),
        onClick: () => openExternalLink(focusedItem.value),
      });
    }
    items.push({ button: "B", label: t("Close"), onClick: onClose });
    return items;
  }, [focusedItem, onClose, t]);

  return (
    <div className="about-container">
      <LegendaContainer legendItems={legendItems}>
        <div className="about-header">
          <h2 className="about-title">Lutris Gamepad UI</h2>
          <p className="about-description">{packageJson.description}</p>
        </div>
        <RowBasedMenu
          items={menuItems}
          renderItem={renderItem}
          onAction={handleAction}
          focusId={AboutFocusId}
          onFocusChange={handleFocusChange}
        />
      </LegendaContainer>
    </div>
  );
};

export default About;
