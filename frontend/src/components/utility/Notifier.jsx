import React from 'react';
import { ToastContainer, Zoom } from 'react-toastify';
import 'react-toastify/ReactToastify.css';
import styles from './Notifier.module.css';

/**
 * Global notification container component using `react-toastify`.
 *
 * This component must be included once in the root of your application to enable toast notifications.
 * It applies custom styles from `Notifier.module.css`, disables the progress bar,
 * enables stacking of toasts, and uses a `Zoom` animation for transitions.
 *
 * @component
 *
 * @example
 * // Add this once in your App layout or root component:
 * <Notifier />
 *
 * // Then, elsewhere in the app:
 * toast.success('Success message!');
 */
const Notifier = () => {
  return (
    <ToastContainer
      toastClassName={styles['custom-toast']}
      bodyClassName={styles['custom-toast-body']}
      // transition={Zoom}
      hideProgressBar
      stacked
    />
  );
};

export default Notifier;
