import styles from './ComponentAddedToast.module.css';

const ComponentAddedToast = ({ message }) => {
  return (
    <div className={styles['component-added-toast']}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="16"
        viewBox="0 0 18 16"
        fill="none"
      >
        <path
          d="M1.5 8.75L7.5 14.75L16.5 1.25"
          stroke="black"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
};

export default ComponentAddedToast;
