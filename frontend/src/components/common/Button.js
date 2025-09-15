import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable button component
 */
function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  className = '',
  testId,
  type = 'button',
  ...props
}) {
  const getButtonClasses = () => {
    const baseClass = 'button';
    const variantClass = variant !== 'primary' ? `button-${variant}` : '';
    const sizeClass = size !== 'medium' ? `button-${size}` : '';
    const loadingClass = loading ? 'button-loading' : '';

    return [baseClass, variantClass, sizeClass, loadingClass, className]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <button
      type={type}
      className={getButtonClasses()}
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={testId}
      {...props}
    >
      {loading && <span className="button-spinner" />}
      <span className={loading ? 'button-text-loading' : ''}>{children}</span>
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
  testId: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
};

export default Button;
