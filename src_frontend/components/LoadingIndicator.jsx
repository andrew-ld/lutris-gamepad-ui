import "../styles/LoadingIndicator.css";
import { useTranslation } from "../contexts/TranslationContext";

const LoadingIndicator = ({ message }) => {
  const { t } = useTranslation();
  return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p className="loading-message">{message || t("Loading...")}</p>
    </div>
  );
};

export default LoadingIndicator;
