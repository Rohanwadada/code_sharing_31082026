/**
 * Custom hook for managing toast notifications using react-toastify.
 *
 * Provides utility functions to show, resolve, reject, and dismiss toast notifications.
 *
 * @module useNotification
 */

import ComponentAddedToast from '@/components/roadmap-editor/roadmap-utility/ComponentAddedToast';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook for triggering and controlling toast notifications.
 *
 * @returns {Object} Notification utilities.
 * @returns {Function} return.showNotification - Show a toast of a specified type.
 * @returns {Function} return.showLoadingNotification - Show a loading (pending) toast.
 * @returns {Function} return.resolveNotification - Resolve a loading toast into a success state.
 * @returns {Function} return.rejectNotification - Resolve a loading toast into an error state.
 * @returns {Function} return.closeNotification - Dismiss a specific toast by ID.
 * @returns {Function} return.closeAllNotification - Dismiss all active toasts.
 */
export const useNotification = () => {
  /**
   * Displays a toast notification of the given type.
   *
   * @param {'success'|'error'|'info'|'warning'|'default'} type - Type of toast to display.
   * @param {string} message - Message to show in the toast.
   * @param {Object} [options={}] - Optional toast configuration (e.g. `position`, `autoClose`).
   * @returns {React.ReactText} Toast ID
   *
   * @example
   * showNotification('success', 'Saved successfully!');
   */
  const showNotification = (type = 'default', message, options = {}) => {
    const toastTypes = {
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
      default: toast,
    };

    return toastTypes[type](message, options);
  };

  /**
   * Displays a persistent loading toast (useful for async feedback).
   *
   * @param {string} id - Unique identifier for the toast.
   * @param {string} [message='Loading...'] - Message to show.
   * @param {Object} [options={}] - Additional toast options.
   *
   * @example
   * showLoadingNotification('save-action', 'Saving...');
   */
  const showLoadingNotification = (
    id,
    message = 'Loading...',
    options = {},
  ) => {
    toast.loading(message, {
      toastId: id,
      closeOnClick: false,
      draggable: false,
      ...options,
    });
  };

  /**
   * Resolves a loading toast into a success notification.
   *
   * @param {string} id - ID of the toast to update.
   * @param {string} [message='Success!'] - Message to display on success.
   * @param {Object} [options={}] - Additional toast options.
   *
   * @example
   * resolveNotification('save-action', 'Saved successfully!');
   */
  const resolveNotification = (id, message = 'Success!', options = {}) => {
    toast.update(id, {
      render: message,
      type: 'success',
      isLoading: false,
      autoClose: 3000,
      ...options,
    });
  };

  /**
   * Resolves a loading toast into an error notification.
   *
   * @param {string} id - ID of the toast to update.
   * @param {string} [message='Something went wrong.'] - Message to display on failure.
   * @param {Object} [options={}] - Additional toast options.
   *
   * @example
   * rejectNotification('save-action', 'Failed to save.');
   */
  const rejectNotification = (
    id,
    message = 'Something went wrong.',
    options = {},
  ) => {
    toast.update(id, {
      render: message,
      type: 'error',
      isLoading: false,
      autoClose: 3000,
      ...options,
    });
  };

  /**
   * Dismisses a specific toast by ID.
   *
   * @param {string} id - ID of the toast to dismiss.
   */
  const closeNotification = (id) => {
    toast.dismiss(id);
  };

  /**
   * Dismisses all currently active toasts.
   */
  const closeAllNotification = () => {
    toast.dismiss();
  };

  /**
   * Custom toast to be shown when an component is added to bag
   */
  const showComponentAddedAlert = (message) => {
    toast(<ComponentAddedToast message={message} />, {
      toastId: `component-added-alert-${uuidv4()}`, // ensures only one instance at a time
      position: 'top-right',
      autoClose: 3000,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className: 'component-added-toast',
      bodyClassName: 'component-added-toast',
      style: {
        padding: 0,
        background: 'transparent',
        boxShadow: 'none',
        position: 'absolute',
        top: '70px',
        right: '10px',
      },
    });
  };

  return {
    showNotification,
    showLoadingNotification,
    resolveNotification,
    rejectNotification,
    closeNotification,
    closeAllNotification,
    showComponentAddedAlert,
  };
};
