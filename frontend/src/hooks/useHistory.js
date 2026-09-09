/**
 * Custom React hook for managing undo/redo history in a roadmap editor.
 *
 * Integrates with `useAuthContext` to track changes to nodes and edges,
 * and persists/rolls back changes through a simple undo/redo stack mechanism.
 * Also supports metadata-driven side effects like content deletion and restoration.
 *
 * @module useHistory
 */

import { useCallback, useState } from 'react';
import {
  getTimestampInKolkata,
  USER_ROADMAP_HISTORY_ACTIONS,
} from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';
import {
  removeNodeContent as removeNodeContentApi,
  restoreNodeContent as restoreNodeContentApi,
} from '@/service/roadmapContent.service';

/**
 * Hook for managing undo/redo history and content restoration/deletion logic.
 *
 * @param {Object} params
 * @param {Function} params.setNodes - Setter for updating current nodes.
 * @param {Function} params.setEdges - Setter for updating current edges.
 *
 * @returns {Object} - Hook API
 * @returns {Function} return.pushToHistory - Pushes a new state snapshot to the undo stack.
 * @returns {Function} return.undo - Reverts to the previous state, optionally restoring deleted content.
 * @returns {Function} return.redo - Reapplies a previously undone state, optionally deleting content again.
 */
function useHistory({ setNodes, setEdges, roadmapId }) {
  const userEmail = useAuthStore((s) => s.userDetails?.email);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  /**
   * Removes content associated with the specified nodes from the roadmap.
   *
   * This function sends a `DELETE` request to the server to remove content from the given node IDs.
   * It requires `roadmapId` and `userEmail` to be available in the component state.
   *
   * @param {string[]} nodeIds - An array of node IDs whose content needs to be removed.
   *
   * @example
   * await removeNodeContent(['node1', 'node2']);
   *
   */
  const removeNodeContent = useCallback(
    async (nodeIds, roadmapId, userEmail) => {
      try {
        const responseData = await removeNodeContentApi(roadmapId, nodeIds);
      } catch (error) {
        console.log(error);
      }
    },
    [],
  );

  /**
   * Sends a request to restore content previously removed from the given node IDs.
   *
   * @async
   * @param {string[]} nodeIds - IDs of the nodes whose content should be restored.
   */
  const restoreNodeContent = async (nodeIds, roadmapId, userEmail) => {
    try {
      const responseData = await restoreNodeContentApi(roadmapId, nodeIds);
    } catch (error) {
      console.log(error);
    }
  };
  /**
   * Sends a request to restore content previously removed from the given node IDs.
   *
   * @async
   * @param {string[]} nodeIds - IDs of the nodes whose content should be restored.
   */
  const saveActivityLog = async (log, roadmapId, userEmail) => {
    try {
      const data = {
        e: userEmail,
        log: log,
      };
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_SERVER_URL}/r/log/${roadmapId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        },
      );
      const responseData = await response.json();
      if (response.status !== 200) {
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getNodeOldData = (action, nodeIds, nodes, edges) => {
    if (action === 'resize') {
      if (nodeIds.length == 1) {
        const node = nodes.find((n) => n.id === nodeIds[0]);
        console.log(node);
        if (node) {
          return node?.style ?? node?.measured ?? null;
        } else {
          return { height: 'unknown', width: 'unknown' };
        }
      }
    } else if (action === 'position') {
      let oldNodePositions = {};
      nodeIds.forEach((nid) => {
        const node = nodes.find((n) => n.id === nid);
        console.log('NODE : ', node);
        if (node) {
          oldNodePositions[nid] = node.position;
        }
      });
      return oldNodePositions;
    }
    return {};
  };

  /**
   * Pushes the current nodes and edges to the undo stack.
   *
   * @param {Object[]} newNodes - Array of current node objects.
   * @param {Object[]} newEdges - Array of current edge objects.
   * @param {string} [action='history'] - Optional action type (e.g., 'delete').
   * @param {Object} [metadata={}] - Optional metadata, such as deleted node IDs.
   */
  const pushToHistory = useCallback(
    (newNodes, newEdges, action = 'history', metadata = {}) => {
      // mark selected key as false
      let nodesCopy = newNodes.map((n) => ({
        ...n,
        selected: false,
        dragging: false,
      }));
      let edgesCopy = newEdges.map((e) => ({
        ...e,
        selected: false,
        dragging: false,
      }));
      setUndoStack((prev) => {
        const updatedUndoStack = [
          ...prev,
          { action: action, nodes: nodesCopy, edges: edgesCopy, metadata },
        ];

        console.log(action);
        if (
          action !== USER_ROADMAP_HISTORY_ACTIONS.BASE_ENTRY.name &&
          action !== 'history'
        ) {
          // For the changes done in canvas, collect the past state of the changed elements from the last entry of undo stack
          if (
            action === USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name &&
            ['resize', 'position'].includes(metadata?.type) &&
            metadata?.source === 'canvas'
          ) {
            const secondLastEvent = prev[prev.length - 1];
            const oldNodesData = getNodeOldData(
              metadata?.type,
              metadata?.node_id,
              secondLastEvent.nodes,
              secondLastEvent.edges,
            );
            metadata = { ...metadata, from: oldNodesData };
          }
          // saveActivityLog(
          //   {
          //     action: action,
          //     metadata: metadata,
          //     timestamp: getTimestampInKolkata(),
          //   },
          //   roadmapId,
          //   userEmail,
          // );
        }
        // setRedoStack([]); // clear redo on new change

        return updatedUndoStack;
      });
    },
    [],
  );

  /**
   * Undoes the last state change, optionally restoring deleted content.
   * @async
   */
  const undo = useCallback(async () => {
    if (undoStack.length <= 1) return;

    const newUndo = [...undoStack];
    const last = newUndo.pop(); // current state
    const previous = newUndo[newUndo.length - 1]; // what we're going back to

    setUndoStack(newUndo);
    setRedoStack((r) => [...r, last]);

    setNodes(previous.nodes);
    setEdges(previous.edges);

    if (last.action === USER_ROADMAP_HISTORY_ACTIONS.DELETE_NODE.name) {
      await restoreNodeContent(
        last.metadata?.node_id || [],
        roadmapId,
        userEmail,
      );
    }
    if (last.action === USER_ROADMAP_HISTORY_ACTIONS.ADD_SNIPPET.name) {
      await removeNodeContent(
        last.metadata?.node_id || [],
        roadmapId,
        userEmail,
      );
    }

    if (
      last.action !== USER_ROADMAP_HISTORY_ACTIONS.BASE_ENTRY.name &&
      last.action !== 'history'
    ) {
      // saveActivityLog(
      //   {
      //     action: USER_ROADMAP_HISTORY_ACTIONS.UNDO.name,
      //     message: USER_ROADMAP_HISTORY_ACTIONS.UNDO.message,
      //     event: {
      //       action: last.action,
      //       metadata: last.metadata,
      //       timestamp: last.timestamp,
      //     },
      //     timestamp: getTimestampInKolkata(),
      //   },
      //   roadmapId,
      //   userEmail,
      // );
    }
  }, [undoStack, setNodes, setEdges, restoreNodeContent]);

  /**
   * Redoes a previously undone state, optionally re-removing deleted content.
   * @async
   */
  const redo = useCallback(async () => {
    if (redoStack.length === 0) return;

    const newRedo = [...redoStack];
    const last = newRedo.pop();

    setRedoStack(newRedo);
    setUndoStack((u) => [...u, last]);

    setNodes(last.nodes);
    setEdges(last.edges);

    if (last.action === USER_ROADMAP_HISTORY_ACTIONS.DELETE_NODE.name) {
      await removeNodeContent(
        last.metadata?.node_id || [],
        roadmapId,
        userEmail,
      );
    }
    if (last.action === USER_ROADMAP_HISTORY_ACTIONS.ADD_SNIPPET.name) {
      await restoreNodeContent(
        last.metadata?.node_id || [],
        roadmapId,
        userEmail,
      );
    }

    if (
      last.action !== USER_ROADMAP_HISTORY_ACTIONS.BASE_ENTRY.name &&
      last.action !== 'history'
    ) {
      // saveActivityLog(
      //   {
      //     action: USER_ROADMAP_HISTORY_ACTIONS.REDO.name,
      //     message: USER_ROADMAP_HISTORY_ACTIONS.REDO.message,
      //     event: {
      //       action: last.action,
      //       metadata: last.metadata,
      //       timestamp: last.timestamp,
      //     },
      //     timestamp: getTimestampInKolkata(),
      //   },
      //   roadmapId,
      //   userEmail,
      // );
    }
  }, [redoStack, setNodes, setEdges, removeNodeContent]);

  return { pushToHistory, undo, redo };
}

export default useHistory;
