import React from 'react';
import { NODE_PERMISSIONS } from '@/utils/constants';

/**
 * Custom hook to manage node permissions based on its type.
 *
 * This hook retrieves permission settings from `NODE_PERMISSIONS` and determines
 * whether a given node has access to specific tabs and tools.
 * It soupport hirerchial permission checking. Like if a node has posotion then he can access to `position.x` and `position.y`
 * but if access is `position.x` then it only have `position.x` permission
 *
 * @param {Object} node - The node object whose permissions need to be checked.
 * @param {string} node.type - The type of the node, used to look up permissions.
 *
 * @returns {Object} An object containing:
 * - `allowedTabs` {Array<string>} - The list of allowed tabs for the given node.
 * - `hasPermission` {Function} - A function to check if a node has permission for a specific tab and key.
 *
 * @example
 * const { allowedTabs, hasPermission } = useNodePermissions(node);
 * if (hasPermission('properties', 'dimension')) {
 *   // The node has permission to dimesion change permission within the 'properties' tab.
 * if (hasPermission('properties', 'position.x')) {
 *   // The node has permission to change `x` position of position component within the 'properties' tab.
 * }
 */
const useNodePermissions = (node) => {
  const config = NODE_PERMISSIONS[node?.type] || {};
  const allowedTabs = config.allowedTabs || [];

  /**
   * Checks if the node has permission for a specific tab and key.
   *
   * @param {string} tab - The name of the tab being checked.
   * @param {string} key - The specific permission key within the tab.
   * @returns {boolean} True if the node has permission, otherwise false.
   */
  const hasPermission = (tab, key) => {
    if (!allowedTabs.includes(tab)) return false; // tab not present in the allowed tab list
    if (!config[tab]) return true; // allow all tools if no permission is defined explicitly
    if (config[tab].includes(key)) return true;
    // Check permissions dynamically
    return config[tab].some((perm) => {
      if (typeof perm === 'function') {
        const result = perm(node);
        return key.startsWith(result) || result.startsWith(key);
      }
      if (typeof perm === 'string') {
        return key.startsWith(perm) || perm.startsWith(key);
      }
    });
  };

  return {
    allowedTabs,
    hasPermission,
  };
};

export default useNodePermissions;
