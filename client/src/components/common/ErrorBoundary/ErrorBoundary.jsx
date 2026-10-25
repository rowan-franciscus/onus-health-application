import React from 'react';
import PropTypes from 'prop-types';
import Card from '../Card';
import Button from '../Button';
import styles from './ErrorBoundary.module.css';

/**
 * Catches render errors in its children and shows a fallback card instead of
 * unmounting the whole page. Give it a `key` that changes with the content
 * (e.g. the active tab) so it resets on navigation.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <Card className={styles.fallback}>
        <h3 className={styles.title}>{this.props.title}</h3>
        <p className={styles.text}>Try again, or reload the page if the problem continues.</p>
        <Button variant="secondary" onClick={this.handleRetry}>Try again</Button>
      </Card>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string
};

ErrorBoundary.defaultProps = {
  title: 'Something went wrong showing this section'
};

export default ErrorBoundary;
