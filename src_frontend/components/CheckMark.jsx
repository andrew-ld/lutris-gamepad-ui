import { useSettingsState } from "../stores/settingsStore";
import "../styles/CheckMark.css";

const CheckMark = ({ checked, label }) => {
  const { settings } = useSettingsState();
  const uncheckedClass = settings.highlightDisabledSettings
    ? "cross-icon"
    : "check-icon unchecked";
  return (
    <div class="checkmark-wrapper">
      <div class="checkmark">
        <div class={checked ? "check-icon checked" : uncheckedClass}></div>
      </div>
      <div class="checkmark-label">{label}</div>
    </div>
  );
};

export default CheckMark;
