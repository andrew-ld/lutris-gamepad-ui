import "../styles/LoadingIndicator.css";

const LoadingIndicator = ({ message = "Loading..." }) => {
  return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingIndicator;
