import React from "react";

import { logError } from "../utils/ipc";

import CrashDialog from "./CrashDialog";

class ErrorBoundary extends React.Component {
  constructor(properties) {
    super(properties);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError("componentDidCatch", error, errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <CrashDialog
          error={this.state.error}
          errorInfo={this.state.errorInfo}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
