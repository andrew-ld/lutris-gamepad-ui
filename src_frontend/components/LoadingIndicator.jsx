import { useTranslation } from "../contexts/TranslationContext";
import "../styles/LoadingIndicator.css";

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
