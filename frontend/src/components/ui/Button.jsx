import styles from './Button.module.css';

const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  leftIcon,
  rightIcon,
  leftPlaceholder = false,
  rightPlaceholder = false,
  ...props
}) => {
  const showLeft = leftIcon !== undefined || leftPlaceholder;
  const showRight = rightIcon !== undefined || rightPlaceholder;

  return (
    <button
      className={`
        ${styles.button}
        ${styles[variant]}
        ${styles[size]}
        ${className}
      `}
      {...props}
    >
      {showLeft && <span className={styles.icon}>{leftIcon}</span>}

      {children}

      {showRight && <span className={styles.icon}>{rightIcon}</span>}
    </button>
  );
};

export default Button;
