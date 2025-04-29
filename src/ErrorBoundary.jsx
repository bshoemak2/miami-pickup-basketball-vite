import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';

class ErrorBoundaryWithTranslation extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Use error parameter to log or process if needed
    console.log('Error caught in getDerivedStateFromError:', error.message);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="error">
          <p>{t('error_loading_games')}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Name the export explicitly for Fast Refresh
const NamedErrorBoundary = withTranslation()(ErrorBoundaryWithTranslation);
export default NamedErrorBoundary;