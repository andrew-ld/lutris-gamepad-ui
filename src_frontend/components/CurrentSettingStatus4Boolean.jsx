import { useSettingsState } from "../stores/settingsStore";

import "../styles/CurrentSettingStatus4Boolean.css";

const CurrentSettingStatus4Boolean = ({ children, checked }) => {
  const { settings } = useSettingsState();
  const uncheckedClass = settings.highlightDisabledSettings
    ? "cross-icon"
    : "check-icon unchecked";
  return (
    <div class="checkmark-wrapper">
      <div class="checkmark">
        <div class={checked ? "check-icon checked" : uncheckedClass}></div>
      </div>
      <div>{children}</div>
    </div>
  );
};

export default CurrentSettingStatus4Boolean;
