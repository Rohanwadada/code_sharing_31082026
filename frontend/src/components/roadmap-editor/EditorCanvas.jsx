import React, { useContext, useLayoutEffect, useRef } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ReactFlow,
  SelectionMode,
  useReactFlow,
} from '@xyflow/react';
import styles from './EditorCanvas.module.css';
import { useCallback, useEffect, useState } from 'react';
import TitleNode from '../custom-nodes/TitleNode';
import TopicNode from '../custom-nodes/TopicNode';
import NodeEditModal from './modals/NodeEditModal';
import SubTopicNode from '../custom-nodes/SubTopicNode';
import ParagraphNode from '../custom-nodes/ParagraphNode';
import {
  ALLOWED_NODE_TYPES,
  changePageTitle,
  DEFAULT_EDGE_STYLE,
  USER_ROADMAP_HISTORY_ACTIONS,
} from '@/utils/constants';
import {
  createNewNode,
  createNodeCopy,
  emitCustomEvent,
  generateHash,
  resolveAllOverlapsBlockwise,
  secureRandomString,
} from '@/utils/helper';
import SubtopicGroupNode from '../custom-nodes/SubtopicGroupNode';
import Loader from './Loader';
import TopicGroupNode from '../custom-nodes/TopicGroupNode';
import EdgeEditModal from './modals/EdgeEditModal';
import EdgeMarkers from '../shared/EdgeMarkers';
import RoadmapControlPanel from './roadmap-utility/RoadmapControlPanel';
import { AnimatePresence } from 'framer-motion';
import HelperLines from './HelperLines';
import ComponentPreviewModal from './modals/ComponentPreviewModal';
import ComponentBagModal from './modals/ComponentBagModal';
import { motion } from 'framer-motion';
import CanvasPlaceholders from './roadmap-utility/CanvasPlaceholders';
import LearningAnchor from '../custom-nodes/LearningAnchor';
import AssignmentNode from '../custom-nodes/AssignmentNode';
import { useAuthStore } from '@/store/authStore';
import { RoadmapContext } from '@/context/RoadmapContext';
import { useRouter } from 'next/navigation';
import {
  getRoadmapById,
  updateRoadmap as updateRoadmapApi,
} from '@/service/roadmap.service';
import { addSnippetToRoadmap as addSnippetToRoadmapApi } from '@/service/roadmapBlock.service';
import { removeNodeContent as removeNodeContentApi } from '@/service/roadmapContent.service';

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified delay has elapsed since the last time it was called.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds before executing the function.
 * @returns {Function} - A debounced version of the input function.
 *
 * @example
 * const debouncedSearch = debounce(() => console.log('Search API called'), 300);
 * window.addEventListener('input', debouncedSearch);
 */
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Initial set of nodes for the React Flow graph.
 * Nodes represent individual elements in the roadmap.
 *
 * @type {Array}
 * @see https://reactflow.dev/docs/api/nodes
 */
const initialNodes = [];

/**
 * Initial set of edges for the React Flow graph.
 * Edges define connections between nodes.
 *
 * @type {Array}
 * @see https://reactflow.dev/docs/api/edges
 */
const initialEdges = [];

/**
 * Allowed types of nodes that can be added to the roadmap editor.
 * Each key represents a specific node type, mapped to its respective React component.
 *
 * @type {Object}
 * @see https://reactflow.dev/docs/examples/nodes/custom-node/
 */
const allowedNodeTypes = {
  title: TitleNode,
  topic: TopicNode,
  subtopic: SubTopicNode,
  paragraph: ParagraphNode,
  subtopicGroup: SubtopicGroupNode,
  assignmentNode: AssignmentNode,
  topicGroup: TopicGroupNode,
  learningAnchor: LearningAnchor,
};

/**
 * Controls whether the canvas should pan when dragging a node.
 * The array [1, 2] refers to mouse buttons that trigger panning.
 * 1 = Left Click, 2 = Right Click.
 *
 * @type {number[]}
 * @see https://reactflow.dev/learn/concepts/the-viewport#figma-like-viewport-controls
 */
const panOnDrag = [1, 2];

/**
 * Default settings for edges (connections between nodes).
 * Includes a marker at the end (arrow) and defines the edge type.
 *
 * @type {Object}
 * @see https://reactflow.dev/examples/edges/custom-edges
 */
const defaultEdgeOptions = {
  // markerEnd: {
  //   type: MarkerType.Arrow,
  // },
  type: 'step',
  // style: {
  //   stroke: '#000',
  // }
};

/**
 * Renders the roadmap editor canvas interface using ReactFlow.
 *
 * This component includes:
 * - **NodeEditModal** : Displays when a node is selected, allowing edits.
 * - **EdgeEditModal** : Displays when an edge is selected, allowing edits.
 * - **ReactFlow Canvas** : Handles node/edge interactions and event bindings.
 * - **RoadmapTitleEditor** : Manages the roadmap's title.
 * - **Loader** : Shows a full-page loader when processes are ongoing.
 *
 * @component
 * @returns {JSX.Element} The roadmap canvas UI.
 */
const EditorCanvas = ({ roadmapId }) => {
  // Accessing user details from the global context.
  const userDetails = useAuthStore((s) => s.userDetails);
  const {
    roadmapTitle,
    setRoadmapTitle,
    roadmapDescription,
    setRoadmapDescription,
    roadmapLevel,
    setRoadmapLevel,
    setRoadmapPrice,
    setIsSavingRoadmap,
    roadmapVisibility,
    setRoadmapVisibility,
    setRoadmapSatus,
    nodes,
    setNodes,
    edges,
    setEdges,
    selectedElements,
    setSelectedElements,
    clipboard,
    setClipboard,
    pushToHistory,
    undo,
    redo,
    setRoadmapAccess,
    selectedComponent,
    showComponentBag,
    setIsDraggingComponent,
  } = useContext(RoadmapContext);

  // roadmap canvas ref
  const canvasWrapperRef = useRef(null);

  // cursor position ref
  const cursorPositionRef = useRef({ x: 0, y: 0 });

  // track if a node is being dragged
  const dragOrderRef = useRef({});

  /**
   * Stores the currently selected node.
   * Used for editing or applying actions to a specific node.
   * @type {Object | null}
   */
  const [selectedNode, setSelectedNode] = useState(null);

  //  Stores the currently selected edges. Useful for bulk actions like deletion.
  const [selectedEdges, setSelectedEdges] = useState([]);

  // Keeps track of the number of selected nodes.
  const [nodesSelectedCount, setNodesSelectedCount] = useState(0);

  const [cloneType, setCloneType] = useState(null);

  /**
   * Stores the instance of React Flow.
   * This allows access to instance functions like `toObject()` for exporting state.
   * @see https://reactflow.dev/api-reference/types/react-flow-instance
   */
  const [rfInstance, setRfInstance] = useState(null);

  // Stores the reference roadmap ID. It is used for creating a new roadmap by cloing existing one. It is the ID of parent roadmap
  const [refRoadmapId, setRefRoadmapId] = useState(null);

  // For full showing and hiding full page loader
  const [showFullPageLoader, setShowFullPageLoader] = useState(false);

  const [intersectingNodes, setIntersectingNodes] = useState([]);

  /**
   * React Flow utility functions for interacting with the canvas.
   * - `screenToFlowPosition`: Converts screen coordinates to the flow canvas.
   * - `getNodes`: Retrieves all nodes in the current React Flow instance.
   * @see https://reactflow.dev/api-reference/hooks/use-react-flow
   * @see https://reactflow.dev/api-reference/types/react-flow-instance#screen-to-flow-position
   * @see https://reactflow.dev/api-reference/types/react-flow-instance#get-nodes
   */
  const { screenToFlowPosition, getNodes, getEdges, getIntersectingNodes } =
    useReactFlow();

  const router = useRouter();

  /**
   * Fetches roadmap data when the component mounts.
   * Uses `useLayoutEffect` for synchronous updates before the browser paint.
   *
   * @see https://react.dev/reference/react/useLayoutEffect
   */
  useLayoutEffect(() => {
    /**
     * Async function to retrieve roadmap details from the server.
     * - Fetches nodes, edges, title, and visibility settings.
     * - Updates the React Flow canvas with the retrieved data.
     * - Redirects the user if data retrieval fails.
     */
    const fetchRoadmapData = async () => {
      try {
        // Show full-page loader while fetching roadmap data
        setShowFullPageLoader(true);

        // API request to fetch roadmap details
        const responseData = await getRoadmapById(roadmapId);
        // Update state with roadmap data
        setNodes(responseData?.g_data?.nodes); // React Flow Nodes
        setEdges(responseData?.g_data?.edges); // React Flow Edges
        setRoadmapTitle(responseData?.title);
        setRoadmapDescription(responseData?.description);
        setRefRoadmapId(responseData?.g_data?.ref_rid);
        setRoadmapVisibility(responseData?.visibility);
        setRoadmapSatus(responseData?.status);
        setRoadmapAccess(responseData?.access);
        setRoadmapLevel(responseData?.level || 'begineer');
        setRoadmapPrice(responseData?.price || 0);
        // Set clone type (for roadmap duplication)
        setCloneType(responseData?.g_data?.clone_type);

        // Update the document title dynamically
        // changePageTitle(`Draw | ${responseData?.title}`);
        pushToHistory(
          responseData?.g_data?.nodes,
          responseData?.g_data?.edges,
          USER_ROADMAP_HISTORY_ACTIONS.BASE_ENTRY.name,
        );
      } catch (error) {
        console.log(error);
        // Redirect to the homepage if roadmap data is unavailable or API call fails
        router.push('/');
      } finally {
        // Hide full-page loader after API call completes
        setShowFullPageLoader(false);
      }
    };
    fetchRoadmapData();
  }, []);

  const updateChildNodesLayout = (nodes, parentNode) => {
    // Get all child nodes sorted by their current Y position

    const parentChildren = nodes
      .filter((node) => node.parentId === parentNode.id)
      .sort((a, b) => a.position.y - b.position.y);

    if (parentChildren.length === 0) return nodes;

    let currentY = parentChildren[0].position.y; // Initial spacing from parent node
    let totalHeight = parentChildren[0].position.y; // To track the total height of child nodes

    // Create a map of updated child nodes
    const updatedChildren = parentChildren.map((node) => {
      const updatedNode = {
        ...node,
        position: {
          ...node.position,
          y: currentY,
        },
      };
      currentY += (node.measured?.height || 50) + 10; // Move down by height + gap
      totalHeight = currentY; // Keep track of total occupied height
      return updatedNode;
    });

    // Determine if parent needs resizing
    const parentHeight = parentNode.measured?.height || 100; // Default height if missing
    const newParentHeight = Math.max(parentHeight, totalHeight + 20); // Add padding

    // Update parent node height if necessary
    const updatedNodes = nodes.map((node) => {
      if (node.parentId === parentNode.id) {
        return (
          updatedChildren.find((updated) => updated.id === node.id) || node
        );
      }
      if (node.id === parentNode.id) {
        return {
          ...node,
          measured: {
            ...node.measured,
            height: newParentHeight,
          },
          style: {
            ...node.style,
            height: newParentHeight,
          },
          height: newParentHeight,
        };
      }
      return node;
    });

    return updatedNodes;
  };

  /**
   * Updates the width of child nodes when the parent node's width changes.
   * - Maintains relative positioning.
   * - Ensures child nodes scale proportionally to their parent.
   *
   * @param {Array} nodes - The current list of nodes.
   * @param {Object} parentNode - The parent node whose width has changed.
   * @param {number} newWidth - The new width of the parent node.
   * @returns {Array} Updated list of nodes with adjusted child widths.
   *
   * @see https://reactflow.dev/docs/api/nodes/ (React Flow Nodes API)
   */
  const updateChildNodesWidth = (nodes, parentNode, newWidth) => {
    const parentX = parentNode.position.x; // Parent node X position
    const parentWidth = newWidth; // New width of the parent
    const childWidth = parentWidth * 0.9; // Child nodes take 90% of parent width
    return nodes.map((node) => {
      // Check if the node is a direct child of the parentNode
      if (node.parentId === parentNode.id) {
        return {
          ...node,
          position: {
            ...node.position,
            x: (parentWidth - childWidth) / 2, // Centering child node within the parent
          },
          measured: {
            ...node.measured,
            width: childWidth, // Update measured width
          },
          style: {
            ...node.style,
            width: childWidth, // Apply new width to styles
          },
          width: childWidth, // Directly update node width
        };
      }
      return node; // Return unchanged node if it's not a child
    });
  };

  /**
   *
   * @param {Object} reactFlowInstance Instance of reactflow
   * Here when reacflow canvas renders we will set the reactflow instatnce to a state and also set the initial zoom level
   */
  const onInit = (reactFlowInstance) => {
    setRfInstance(reactFlowInstance);

    // reactFlowInstance.zoomTo(0.5);
    // setTimeout(() => {
    //   reactFlowInstance.fitView({ maxZoom: 0.5 });
    // }, 100);
  };

  /**
   * Handles the Node changes in the roadmap graph.
   * @param {Array<Object>} changes - An array of objects representing the nodes and their change details.
   * @example
   * const changes = [
   *   {
   *     "id": "BC9bF7a0ca1227De619f51005D310b54",
   *     "type": "select" | "dimension" | "remove" | "replace",
   *     "selected": true
   *   }
   * ];
   * @see https://reactflow.dev/api-reference/types/on-nodes-change
   * @see https://reactflow.dev/api-reference/types/node-change
   */
  const onNodesChange = useCallback(
    (changes) => {
      let updatedNodes = applyNodeChanges(changes, nodes);
      changes.forEach((change) => {
        if (change.type === 'dimensions') {
          const changedNode = updatedNodes.find(
            (node) => node.id === change.id,
          );
          const parentNode =
            changedNode.type === 'subtopicGroup' ||
            changedNode.type === 'topicGroup'
              ? changedNode
              : undefined;
          if (parentNode) {
            const newWidth =
              parentNode?.measured?.width || parentNode?.style?.width;
            updatedNodes = updateChildNodesWidth(
              updatedNodes,
              parentNode,
              newWidth,
            );

            emitCustomEvent('groupNode::rearrangeChildren', {
              nodeId: parentNode.id,
              nodes: updatedNodes,
            });
          } else if (changedNode.parentId) {
            const parent = nodes.find(
              (node) => node.id === changedNode.parentId,
            );
            if (parent) {
              emitCustomEvent('groupNode::rearrangeChildren', {
                nodeId: parent.id,
                nodes: updatedNodes,
              });
              // updatedNodes = updateChildNodesLayout(updatedNodes, parent);
            }
          }
        } else if (change.type === 'remove') {
          const changedNode = nodes.find((node) => node.id === change.id);

          if (changedNode.parentId && updatedNodes !== undefined) {
            const parent = updatedNodes.find(
              (node) => node.id === changedNode.parentId,
            );
            if (parent) {
              const parentChildren = updatedNodes.filter(
                (node) => node.parentId === parent.id,
              );
              // if(parentChildren.length <= 1) return;

              // updatedNodes = updateChildNodesLayout(updatedNodes, parent);

              emitCustomEvent('groupNode::rearrangeChildren', {
                nodeId: parent.id,
                nodes: updatedNodes,
              });
            }
          }
        }
      });
      updatedNodes = resolveAllOverlapsBlockwise(updatedNodes, getEdges());
      setNodes(updatedNodes);

      setNodesSelectedCount(
        updatedNodes.filter((node) => node.selected).length,
      );
    },
    [nodes],
  );

  /**
   * Handles the Node changes in the roadmap graph.
   * @param {Array<Object>} changes - An array of objects representing the nodes and their change details.
   * @example
   * const changes = [
   *   {
   *     "id": "edge__7c18393aDc871B38D72267beA9386D97",
   *     "type": "select",
   *     "selected": true
   *   }
   * ];
   * @see https://reactflow.dev/api-reference/types/on-edges-change
   * @see https://reactflow.dev/api-reference/types/edge-change
   */
  const onEdgesChange = useCallback(
    (changes) => {
      // Apply the edge changes
      let updatedEdges = applyEdgeChanges(changes, edges);
      changes.forEach((change) => {
        if (change.type === 'select') {
          const changedEdge = updatedEdges.find(
            (edge) => edge.id === change.id,
          );
          if (!changedEdge) return;
          if (change.selected) {
            setSelectedEdges((prevEdges) => [...prevEdges, changedEdge]);
          } else {
            setSelectedEdges((prevEdges) =>
              prevEdges.filter((edge) => edge.id !== change.id),
            );
          }
        }
      });
      setEdges(updatedEdges);
    },
    [edges],
  );

  const onSelectionChange = useCallback(({ nodes, edges }) => {
    setSelectedElements({ nodes, edges });
  }, []);

  /**
   * Handles new edge connections in the ReactFlow graph.
   *
   * When a user connects two nodes, this function adds a new edge
   * with default styling and updates the edges state.
   *
   * @param {Object} params - Connection parameters provided by ReactFlow.
   * @returns {void}
   *
   * @see https://reactflow.dev/api-reference/react-flow#on-connect
   */
  const onConnect = useCallback(
    (params) =>
      setEdges((eds) => {
        const edgeExists = eds.some(
          (edge) =>
            (edge.source === params.source && edge.target === params.target) ||
            (edge.source === params.target && edge.target === params.source),
        );
        if (edgeExists) return eds;
        const finalEdges = addEdge({ ...params, ...DEFAULT_EDGE_STYLE }, eds);
        const newEdge = finalEdges.find(
          (e) => !eds.some((prev) => prev.id === e.id),
        );
        pushToHistory(
          getNodes(),
          finalEdges,
          USER_ROADMAP_HISTORY_ACTIONS.ADD_EDGE.name,
          {
            message: USER_ROADMAP_HISTORY_ACTIONS.ADD_EDGE.message,
            edge_id: newEdge?.id,
            sourceNode: params?.source,
            targetNode: params?.target,
          },
        );
        return finalEdges;
      }),
    [],
  );

  /**
   * Handles drag-over events in the ReactFlow editor.
   *
   * This function prevents the default drag behavior and sets the drop effect
   * to 'move', allowing nodes to be properly dragged and dropped within the canvas.
   *
   * @param {DragEvent} event - The drag event object.
   * @returns {void}
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
   */
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleOnNodeDrag = useCallback((event, draggedNodes) => {
    const intersections = getIntersectingNodes(draggedNodes);
  }, []);

  const handleNodeDragStart = useCallback((event, draggedNode) => {
    // multi-select: capture order for every affected parent
    const moved = nodes.filter((n) => n.selected);
    const moving = moved.length ? moved : [draggedNode];
    const parentIds = Array.from(
      new Set(moving.map((n) => n.parentId).filter(Boolean)),
    );

    parentIds.forEach((pid) => {
      const siblings = nodes
        .filter((n) => n.parentId === pid)
        .sort((a, b) => a.position.y - b.position.y);
      dragOrderRef.current[pid] = siblings.map((s) => s.id);
    });
  }, []);

  const handleNodeDragStop = useCallback(
    (event, draggedNode) => {
      const selectedNodes = nodes.filter((n) => n.selected);

      // Fallback if none are selected
      const movedNodes =
        selectedNodes.length > 0 ? selectedNodes : [draggedNode];

      // Set of moved IDs for fast lookup
      const movedNodeIds = new Set(movedNodes.map((n) => n.id));
      console.log(movedNodeIds);

      // Update node positions based on the draggedNode’s position (only one will have updated position directly)
      const updatedNodes = nodes.map((n) => {
        if (movedNodeIds.has(n.id)) {
          // This is naive: assumes the node's position is already updated (e.g., from state or the lib)
          return {
            ...n,
            // Pull directly from draggedNode if React Flow hasn’t updated your state yet
            position:
              n.id === draggedNode.id ? draggedNode.position : n.position,
          };
        }
        return n;
      });

      const updatedEdges = getEdges(); // same edges
      const newPositions = {};
      updatedNodes.forEach((node) => {
        if (movedNodeIds.has(node.id)) {
          newPositions[node.id] = { ...node.position };
        }
      });

      // pushToHistory(
      //   updatedNodes,
      //   updatedEdges,
      //   USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
      //   {
      //     message: `Updated the position of the nodes`,
      //     type: 'position',
      //     source: 'canvas',
      //     node_id: [...movedNodeIds],
      //     to: newPositions,
      //   },
      // );

      // ---- NEW: emit rearrange AFTER the drag stops (once per affected parent) ----
      const parentIds = Array.from(
        new Set(movedNodes.map((n) => n.parentId).filter(Boolean)),
      );
      if (parentIds.length > 0) {
        // fresh snapshot from react-flow
        const snapshot = getNodes();

        parentIds.forEach((pid) => {
          const parent = snapshot.find((p) => p.id === pid);
          if (
            !parent ||
            !(parent.type === 'subtopicGroup' || parent.type === 'topicGroup')
          )
            return;

          // update child widths first (same as you did earlier)
          const newWidth = parent?.measured?.width || parent?.style?.width;
          const finalSnapshot = updateChildNodesWidth(
            snapshot,
            parent,
            newWidth,
          );

          // all children for this parent (in snapshot space)
          const siblings = finalSnapshot
            .filter((n) => n.parentId === pid)
            .sort((a, b) => a.position.y - b.position.y);
          const movedInThisParent = siblings.filter((s) =>
            movedNodeIds.has(s.id),
          );

          // If multiple moved nodes inside same parent -> preserve their original internal order
          // and insert them as a block at correct index, then recompute Y for all children.
          if (movedInThisParent.length >= 1) {
            const originalOrder =
              dragOrderRef.current[pid] || siblings.map((s) => s.id);

            // moved block ids in original relative order
            const movedBlockIds = movedInThisParent
              .slice()
              .sort(
                (a, b) =>
                  originalOrder.indexOf(a.id) - originalOrder.indexOf(b.id),
              )
              .map((n) => n.id);

            // compute block top (use the current y positions of moved nodes in snapshot)
            const blockTop = Math.min(
              ...movedInThisParent.map((n) => n.position.y),
            );

            // remaining siblings (without moved nodes)
            const remaining = siblings.filter((s) => !movedNodeIds.has(s.id));

            // find insertion index in remaining based on blockTop
            let insertIndex = remaining.findIndex(
              (sib) => blockTop < sib.position.y,
            );
            if (insertIndex === -1) insertIndex = remaining.length;

            // build new ordered id list: remaining (in their y order) with moved block inserted
            const newOrderedIds = remaining.map((s) => s.id);
            newOrderedIds.splice(insertIndex, 0, ...movedBlockIds);

            // compute y positions from header + gap (match SubtopicGroupNode logic)
            const headingHeight =
              (parent.data &&
                parent.data.headerStyle &&
                Number(parent.data.headerStyle.height)) ||
              parent.measured?.headerHeight ||
              70;
            let currentY = headingHeight + 30;
            const GAP = 25;
            const DEFAULT_CHILD_HEIGHT = 50;

            // update finalSnapshot nodes' y by walking newOrderedIds
            newOrderedIds.forEach((childId) => {
              const idx = finalSnapshot.findIndex((n) => n.id === childId);
              if (idx === -1) return;
              const child = finalSnapshot[idx];
              const childHeight =
                (child.measured && child.measured.height) ||
                DEFAULT_CHILD_HEIGHT;
              finalSnapshot[idx] = {
                ...child,
                position: { ...child.position, y: currentY },
              };
              currentY += childHeight + GAP;
            });

            // emit corrected snapshot
            emitCustomEvent('groupNode::rearrangeChildren', {
              nodeId: pid,
              nodes: finalSnapshot,
            });
          } else {
            // no moved children in this parent (shouldn't happen), just emit width-updated snapshot
            emitCustomEvent('groupNode::rearrangeChildren', {
              nodeId: pid,
              nodes: finalSnapshot,
            });
          }

          pushToHistory(
            finalSnapshot,
            updatedEdges,
            USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
            {
              message: `Updated the position of the nodes`,
              type: 'position',
              source: 'canvas',
              node_id: [...movedNodeIds],
              to: newPositions,
            },
          );
        });
      } else {
        pushToHistory(
          updatedNodes,
          updatedEdges,
          USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
          {
            message: `Updated the position of the nodes`,
            type: 'position',
            source: 'canvas',
            node_id: [...movedNodeIds],
            to: newPositions,
          },
        );
      }
    },
    [nodes],
  );

  const onDragEnter = (event) => {
    console.log(event);
    setIsDraggingComponent(true);
  };
  const onDragLeave = (event) => {
    console.log(event);
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDraggingComponent(false);
    }
  };

  /**
   * Handles the drop event for dragging elements into the ReactFlow editor.
   *
   * This function processes different drag types (`single-node-drag` and `predefined-roadmap-component-drag`) and
   * updates the node/edge state accordingly. It also emits custom events for group nodes.
   *
   * @param {DragEvent} event - The drag event containing data about the dropped element.
   * @returns {Promise<void>}
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
   */
  const onDrop = async (event) => {
    event.preventDefault();

    const dragType = event.dataTransfer.getData('dragType');
    const dragData = event.dataTransfer.getData('dragData');
    // Get the position where the object is dropped in form of co-ordinates
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    if (!dragData) return;

    try {
      // When a single node dragged and dropped. like topic, subtopic, assignmentNode
      if (dragType === 'single-node-drag') {
        const nodeType = dragData;

        if (nodeType === 'subtopicGroup' || nodeType === 'topicGroup') {
          const newNode = createNewNode(
            nodeType,
            userDetails?.email,
            position,
            undefined,
            undefined,
            true,
            { style: { width: 350, height: 150 } },
          );
          // let newSubtopicNode = createNewNode("subtopic", userDetails?.email, {x: 0, y: 0}, false, false, {style:{width: 200}, parentId: newNode.id, extent: 'parent', nodeTp: 'groupHeader'});
          // const newSubtopicNode = createNewNode('subtopic', userDetails?.email, newNodePosition, true, true, {parentId: id, extent: 'parent', connectable: true, draggable: true, style: {width: parentNode.measured.width*0.8}});
          // setSelectedNode(newNode);
          if (nodeType === 'subtopicGroup') {
            const newSubtopicNode = createNewNode(
              'subtopic',
              userDetails?.email,
              { x: 17, y: 118 },
              false,
              true,
              false,
              {
                parentId: newNode?.id,
                extent: 'parent',
                connectable: true,
                draggable: true,
                style: { width: 350 * 0.9 },
              },
            );
            setNodes((prevNodes) => {
              const updatedNodes = prevNodes.map((node) => ({
                ...node,
                selected: false,
              }));
              const finalNodes = [...updatedNodes, newNode, newSubtopicNode];
              const finalEdges = getEdges();
              pushToHistory(
                finalNodes,
                finalEdges,
                USER_ROADMAP_HISTORY_ACTIONS.ADD_NODE.name,
                { message: 'Added a new module', node_id: [newNode?.id] },
              );
              return finalNodes;
            });
          }
          if (nodeType === 'topicGroup') {
            const newAssignmentNode = createNewNode(
              'assignmentNode',
              userDetails?.email,
              { x: 17, y: 99 },
              false,
              true,
              false,
              {
                parentId: newNode?.id,
                extent: 'parent',
                connectable: true,
                draggable: true,
                style: { width: 350 * 0.9 },
              },
            );
            setNodes((prevNodes) => {
              const updatedNodes = prevNodes.map((node) => ({
                ...node,
                selected: false,
              }));
              const finalNodes = [...updatedNodes, newNode, newAssignmentNode];
              const finalEdges = getEdges();
              pushToHistory(
                finalNodes,
                finalEdges,
                USER_ROADMAP_HISTORY_ACTIONS.ADD_NODE.name,
                { message: 'Added a new topic', node_id: [newNode?.id] },
              );
              return finalNodes;
            });
          }

          // setTimeout(() => {
          //   if (nodeType === 'subtopicGroup') {
          //     emitCustomEvent('groupNode::addSubtopic', { nodeId: newNode.id });
          //   }
          //   if (nodeType === 'topicGroup') {
          //     emitCustomEvent('groupNode::addAssignment', {
          //       nodeId: newNode.id,
          //     });
          //   }
          // }, 10);
        } else {
          const newNode = createNewNode(
            nodeType,
            userDetails?.email,
            position,
            undefined,
            undefined,
            true,
          );
          setSelectedNode(newNode);
          setNodes((prevNodes) => {
            const updatedNodes = prevNodes.map((node) => ({
              ...node,
              selected: false,
            }));
            const finalNodes = [...updatedNodes, newNode];
            const finalEdges = getEdges();
            pushToHistory(
              finalNodes,
              finalEdges,
              USER_ROADMAP_HISTORY_ACTIONS.ADD_NODE.name,
              {
                message: `Added a new ${newNode?.type}`,
                node_id: [newNode?.id],
              },
            );
            return finalNodes;
          });
        }
      } else if (dragType === 'predefined-roadmap-component-drag') {
        // Entered here when we drag a roadmap snippet
        const roadmapSnippet = JSON.parse(dragData);
        const subtree = roadmapSnippet?.subtree;
        const referenceRoadmapId = roadmapSnippet?.r_id;
        // const regeneratedRoadmapSnippet = regenerateRoadmapSnippet(userDetails?.email, roadmapId, subtree);
        console.log(subtree);
        const processedNodes = processAndCleanGraph(
          subtree,
          position.x,
          position.y,
        );
        const regeneratedRoadmapSnippet = await addSnippetToRoadmap(
          userDetails?.email,
          roadmapId,
          referenceRoadmapId,
          processedNodes,
        );
        const finalNodes = [...nodes, ...regeneratedRoadmapSnippet.nodes];
        const finalEdges = [...edges, ...regeneratedRoadmapSnippet.edges];
        pushToHistory(
          finalNodes,
          finalEdges,
          USER_ROADMAP_HISTORY_ACTIONS.ADD_SNIPPET.name,
          {
            message: USER_ROADMAP_HISTORY_ACTIONS.ADD_SNIPPET.message,
            node_id: regeneratedRoadmapSnippet.nodes.map((n) => n.id),
            edge_id: regeneratedRoadmapSnippet.edges.map((e) => e.id),
          },
        );
        setNodes(finalNodes);
        setEdges(finalEdges);
      }
    } catch (error) {
      console.error(error.message);
      console.error(error.stack);
    } finally {
      setIsDraggingComponent(false);
    }
  };

  /**
   * Processes and repositions a roadmap graph relative to the drop position.
   *
   * This function adjusts the node positions based on the drop coordinates (`clientX`, `clientY`),
   * ensuring that the first node in the graph aligns with the drop point while maintaining relative positions.
   * It also marks all nodes and edges as selected.
   *
   * Usage : This used when we DnD a roadmap snippet then all of the nodes position in that snippet should be adjusted
   * according to the dropped position
   *
   * @param {Object} roadmapGraph - The graph data containing nodes and edges.
   * @param {number} clientX - The X-coordinate where the graph is dropped.
   * @param {number} clientY - The Y-coordinate where the graph is dropped.
   * @returns {Object} An object containing the updated nodes and edges.
   *
   * @example
   * const updatedGraph = processAndCleanGraph(roadmapData, 100, 200);
   *
   *
   * @see https://reactflow.dev/docs/api/nodes/node-options/#position
   */
  const processAndCleanGraph = (roadmapGraph, clientX, clientY) => {
    if (!roadmapGraph.nodes.length) return [];

    // The first node will be placed at the drop position
    const firstNode = roadmapGraph.nodes[0];
    const refX = firstNode.position.x;
    const refY = firstNode.position.y;

    const newNodes = roadmapGraph.nodes.map((node) => {
      if (node.parentId) return node;
      const offsetX = node.position.x - refX;
      const offsetY = node.position.y - refY;
      return {
        ...node,
        selected: true,
        position: {
          x: clientX + offsetX,
          y: clientY + offsetY,
        },
      };
    });

    const newEdges = roadmapGraph.edges.map((edge) => {
      return {
        ...edge,
        selected: true,
      };
    });
    return { nodes: newNodes, edges: newEdges };
  };

  /**
   * Adds a roadmap snippet to an existing roadmap.
   *
   * This function sends a `PUT` request to the server to append a roadmap snippet to an existing roadmap.
   * If the request is successful, the updated roadmap data is returned. Otherwise, an empty graph structure is returned.
   *
   * @param {string} userId - The ID of the user making the request.
   * @param {string} roadmapId - The ID of the roadmap where the snippet should be added.
   * @param {string} refRoadmapId - The ID of the referenced roadmap from which the snippet originates.
   * @param {Object} snippet - The snippet data containing nodes and edges to be added.
   * @returns {Promise<Object>} A promise resolving to the updated roadmap data or an empty graph object on failure.
   *
   * @example
   * const updatedRoadmap = await addSnippetToRoadmap('user123', 'roadmap456', 'refRoadmap789', snippetData);
   *
   */
  const addSnippetToRoadmap = async (
    userId,
    roadmapId,
    refRoadmapId,
    snippet,
  ) => {
    try {
      setShowFullPageLoader(true);
      const data = {
        snippet: snippet,
        ref_rid: refRoadmapId,
      };
      const responseData = await addSnippetToRoadmapApi(
        roadmapId,
        snippet,
        refRoadmapId,
      );
      return responseData;
    } catch (error) {
      return { nodes: [], edges: [] };
    } finally {
      setShowFullPageLoader(false);
    }
  };

  const regenerateRoadmapSnippet = (userId, roadmapId, roadmapGraph) => {
    // Deep copy of roadmapGraph
    const newRoadmapGraph = JSON.parse(JSON.stringify(roadmapGraph));
    const newRoadmapContent = {};

    const oldToNewIdMap = newRoadmapGraph.nodes.reduce((acc, node) => {
      acc[node.id] = generateHash(
        `${userId}#${roadmapId}#${node.id}#${secureRandomString(20)}`,
        32,
      );
      return acc;
    }, {});

    // update nodes
    newRoadmapGraph.nodes.forEach((node) => {
      const oldNodeId = node.id;
      const newNodeId = oldToNewIdMap[oldNodeId];
      node.id = newNodeId;
      // left for content update
    });
    newRoadmapGraph.edges.forEach((edge) => {
      const newEdgeId = generateHash(
        `${userId}#${roadmapId}#${edge.id}#${secureRandomString(20)}`,
        32,
      );
      edge.id = `edge__${newEdgeId}`;
      if (edge.source in oldToNewIdMap) {
        edge.source = oldToNewIdMap[edge.source];
      }
      if (edge.target in oldToNewIdMap) {
        edge.target = oldToNewIdMap[edge.target];
      }
    });

    return newRoadmapGraph;
  };

  const deepOmit = (obj, keysToIgnore) => {
    if (Array.isArray(obj)) {
      return obj.map((item) => deepOmit(item, keysToIgnore));
    } else if (obj && typeof obj === 'object') {
      return Object.entries(obj).reduce((acc, [key, value]) => {
        if (keysToIgnore.includes(key)) return acc;
        acc[key] = deepOmit(value, keysToIgnore);
        return acc;
      }, {});
    }
    return obj;
  };

  const deepEqualIgnoringKeys = (obj1, obj2, keysToIgnore = []) => {
    return (
      JSON.stringify(deepOmit(obj1, keysToIgnore)) ===
      JSON.stringify(deepOmit(obj2, keysToIgnore))
    );
  };

  /**
   * Updates the roadmap with the latest graph data and metadata.
   *
   * This function compiles the current roadmap state, clears selected nodes, and sends a `PUT` request to update
   * the roadmap on the server. If the roadmap has a reference ID, it includes additional metadata.
   *
   * @example
   * await updateRoadmap();
   *
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   */
  let lastSavedGraph = null;
  const updateRoadmap = async () => {
    try {
      if (roadmapTitle === '') return;
      const compiledGraph = JSON.parse(JSON.stringify(rfInstance.toObject()));
      compiledGraph.nodes.forEach((node) => {
        node.selected = false;
      });
      // Avoid API call if graph hasn't changed meaningfully
      if (
        lastSavedGraph &&
        deepEqualIgnoringKeys(compiledGraph, lastSavedGraph, [
          'selected',
          'viewport',
        ])
      ) {
        console.log('No meaningful changes detected — skipping update');
        return;
      }
      compiledGraph.edges.forEach((edge) => {
        // if (node.id !== selectedNode?.id) {
        edge.selected = false;
        // }
      });
      if (refRoadmapId) {
        compiledGraph.ref_rid = refRoadmapId;
        compiledGraph.clone_type = cloneType;
      }
      const data = {
        title: roadmapTitle,
        // r_desc: roadmapDescription,
        // r_l: roadmapLevel,
        roadmap_graph: compiledGraph,
        visibility_scope: roadmapVisibility,
        source: 'canvas',
      };
      const response = await updateRoadmapApi(roadmapId, data);
      lastSavedGraph = compiledGraph;
    } catch (error) {
      console.log(error);
    } finally {
    }
  };

  /**
   * Removes content associated with the specified nodes from the roadmap.
   *
   * This function sends a `DELETE` request to the server to remove content from the given node IDs.
   * It requires `roadmapId` and `userDetails.uid` to be available in the component state.
   *
   * @param {string[]} nodeIds - An array of node IDs whose content needs to be removed.
   *
   * @example
   * await removeNodeContent(['node1', 'node2']);
   *
   */
  const removeNodeContent = async (nodeIds) => {
    try {
      const responseData = await removeNodeContentApi(roadmapId, nodeIds);
    } catch (error) {
      console.log(error);
    }
  };

  /**
   * Handles the event when a node is clicked.
   * If exactly one node is selected and it's different from the currently selected node,
   * it updates the selected node in the state.
   *
   * @param {MouseEvent} event - The click event.
   * @param {Object} node - The clicked node object.
   *
   * @example
   * handleOnNodeClick(event, node);
   */
  const handleOnNodeClick = (event, node) => {
    if (nodesSelectedCount == 1 && node?.id !== selectedNode?.id) {
      setSelectedNode(node);
    }
  };

  /**
   * Handles node deletion by removing its associated content.
   *
   * This function receives an array of deleted nodes, extracts their IDs,
   * and calls `removeNodeContent` to remove the related content from the backend.
   *
   * @param {Object[]} deleted - Array of deleted nodes.
   * @returns {Promise<void>} A promise that resolves when node content is removed.
   *
   * @example
   * handleOnNodeDelete([{ id: "node1" }, { id: "node2" }]);
   */
  const handleOnNodeDelete = useCallback(
    async (deleted) => {
      // delete node content
      const nodeCotentToBeRemoved = deleted.map((node) => node.id);
      const finalEdges = getEdges();
      let finalNodes = nodes
        .filter((n) => !nodeCotentToBeRemoved.includes(n.id))
        .map((n) => ({ ...n, selected: false }));
      deleted.forEach((node) => {
        if (node.type === 'subtopic' && node.parentId) {
          // const parentNode = getNode(node.parentId);
          const childNodes = nodes.filter((n) => n.parentId === node.parentId);
          if (childNodes.length <= 1)
            finalNodes = finalNodes.map((n) => {
              if (n.id === node.parentId) {
                return {
                  ...n,
                  type: 'subtopic',
                  data: {
                    ...n.data,
                    style: {
                      ...n?.data?.style,
                      ...{
                        backgroundColor: '#313030',
                        color: '#ffffff',
                        borderColor: '#BEBEBE',
                      },
                    },
                  },
                };
              }
              return n;
            });
        }
        if (node.type === 'assignmentNode' && node.parentId) {
          // const parentNode = getNode(node.parentId);
          const childNodes = nodes.filter((n) => n.parentId === node.parentId);
          if (childNodes.length <= 1)
            finalNodes = finalNodes.map((n) => {
              if (n.id === node.parentId) {
                return {
                  ...n,
                  type: 'topic',
                  data: {
                    ...n.data,
                    style: {
                      ...n.data.style,
                      borderColor: '#BEBEBE',
                      fontSize: '32px',
                      color: '#ffffff',
                      backgroundColor: '#1849D6',
                    },
                  },
                };
              }
              return n;
            });
        }
      });
      pushToHistory(
        finalNodes,
        finalEdges,
        USER_ROADMAP_HISTORY_ACTIONS.DELETE_NODE.name,
        {
          message: USER_ROADMAP_HISTORY_ACTIONS.DELETE_NODE.message,
          node_id: nodeCotentToBeRemoved,
          node_label: deleted.map((node) => node?.data?.label),
        },
      );
      await removeNodeContent(nodeCotentToBeRemoved);
    },
    [nodes],
  );

  /**
   * Handles edge deletion by removing it from the selected edges list if applicable.
   *
   * @param {Object[]} deleted - Array of deleted edges.
   *
   * @example
   * handleOnEdgeDelete([{ id: "edge1", selected: true }]);
   */
  const handleOnEdgeDelete = useCallback(
    async (deleted) => {
      const edgesToRemove = [];
      deleted.forEach((edge) => {
        if (
          edge.selected &&
          selectedEdges.length == 1 &&
          edge.id === selectedEdges[0].id
        ) {
          setSelectedEdges([]);
        }
        edgesToRemove.push(edge.id);
      });
      const finalNodes = getNodes();
      const finalEdges = edges
        .filter((e) => !edgesToRemove.includes(e.id))
        .map((e) => ({ ...e, selected: false }));
      pushToHistory(
        finalNodes,
        finalEdges,
        USER_ROADMAP_HISTORY_ACTIONS.DELETE_EDGE.name,
        {
          message: USER_ROADMAP_HISTORY_ACTIONS.DELETE_EDGE.message,
          edge_id: edgesToRemove,
        },
      );
    },
    [edges],
  );

  /**
   * Copies the selected nodes and edges to the clipboard for future pasting.
   *
   * @description
   * This function creates a deep copy of the selected nodes and their associated edges.
   * - It handles both root nodes (without a `parentId`) and nodes within groups (which may have child nodes).
   * - It also ensures that only edges connecting the selected nodes are copied.
   *
   * @callback
   * @param {void}
   * @returns {void}
   *
   * @sideEffect
   * Sets the `clipboard` state with the copied nodes and edges.
   */
  const handleCopy = useCallback(async () => {
    if (selectedElements.nodes?.length) {
      // Create a deep copy of the selected elements
      const nodesCopy = [];

      selectedElements.nodes.forEach((node) => {
        if (!node.parentId) {
          nodesCopy.push({ ...node });
        }

        if (ALLOWED_NODE_TYPES.group.includes(node.type)) {
          const childNodes = nodes.filter((n) => n.parentId === node.id);
          childNodes.forEach((child) => {
            nodesCopy.push({ ...child });
          });
        }
      });

      // Get only the edges that connect selected nodes
      const edgesCopy = selectedElements.edges
        ? selectedElements.edges.filter(
            (edge) =>
              nodesCopy.some((node) => node.id === edge.source) &&
              nodesCopy.some((node) => node.id === edge.target),
          )
        : [];

      setClipboard({ nodes: nodesCopy, edges: edgesCopy });

      await navigator.clipboard.writeText(
        JSON.stringify({
          version: '1.0.0',
          source: 'SETU Roadmaps',
          nodes: nodesCopy,
          edges: edgesCopy,
        }),
      );
    }
  }, [selectedElements]);

  /**
   * Pastes the nodes and edges from the clipboard into the current workspace.
   *
   * @description
   * This function uses the clipboard's copied nodes and edges to create new nodes and edges in the current workspace.
   * - Nodes are given new IDs and offset positions. If a node has a `parentId`, the parent must exist in the `idMap` for the node to be created.
   * - Edges are also recreated with updated source and target IDs based on the new nodes.
   * - If any parent node in the clipboard doesn't exist in the `idMap`, its child nodes are skipped.
   *
   * @callback
   * @param {void}
   * @returns {void}
   *
   * @sideEffect
   * - Sets the new nodes and edges into the `nodes` and `edges` state.
   * - Updates the history with the newly pasted nodes and edges.
   * - Logs the new nodes and edges to the console for debugging.
   * - Updates the `clipboard` state with the pasted nodes and edges.
   */
  const handlePaste = useCallback(async () => {
    try {
      // if (!clipboard) return;

      // Deselect all current nodes
      const deselectedNodes = nodes.map((node) => ({
        ...node,
        selected: false,
      }));

      // Deselect all current edges
      const deselectedEdges = edges.map((edge) => ({
        ...edge,
        selected: false,
      }));

      // Create a mapping of old node IDs to new node IDs
      const idMap = {};

      const dataFromClipboard = await navigator.clipboard.readText();
      const copiedStructure = JSON.parse(dataFromClipboard);
      if (copiedStructure?.source !== 'SETU Roadmaps') {
        return;
      }
      const firstNode = copiedStructure?.nodes[0];
      const cursorPos = cursorPositionRef.current;
      const offsetX = cursorPos.x - firstNode?.position.x;
      const offsetY = cursorPos.y - firstNode?.position.y;

      // Create new nodes with new IDs and offset positions
      const newNodes = copiedStructure.nodes
        .map((node) => {
          let newNode = null;
          if (node.parentId) {
            if (!idMap[node.parentId]) {
              return null;
            }
            newNode = createNodeCopy(
              { x: offsetX, y: offsetY },
              node,
              userDetails?.email,
              {
                parentId: idMap[node.parentId],
                selected: false,
              },
            );
          } else {
            newNode = createNodeCopy(
              { x: offsetX, y: offsetY },
              node,
              userDetails?.email,
              {
                selected: true,
              },
            );
          }

          const newId = newNode.id;
          idMap[node.id] = newId;

          return newNode;
        })
        .filter((node) => node !== null);

      // Create new edges with updated source and target IDs
      const newEdges = copiedStructure.edges.map((edge) => ({
        ...edge,
        id: `xy-edge__${idMap[edge.source]}${edge.sourceHandle}-${idMap[edge.target]}${edge.targetHandle}`,
        source: idMap[edge.source],
        target: idMap[edge.target],
        selected: true,
      }));

      const finalNodes = [...deselectedNodes, ...newNodes];
      const finalEdges = [...deselectedEdges, ...newEdges];
      setNodes(finalNodes);
      setEdges(finalEdges);
      pushToHistory(
        finalNodes,
        finalEdges,
        USER_ROADMAP_HISTORY_ACTIONS.PASTE.name,
        {
          message: USER_ROADMAP_HISTORY_ACTIONS.PASTE.message,
          node_id: newNodes.map((n) => n?.id),
          edge_id: newEdges.map((e) => e?.id),
        },
      );
      setClipboard({ nodes: newNodes, edges: newEdges });
      setSelectedEdges([]);
    } catch (error) {
      return;
    }
  }, [clipboard, nodes, edges, setNodes, setEdges]);

  /**
   * Debounced function to update the roadmap.
   * This reduces frequent API calls by ensuring updates are triggered only after 500ms of inactivity.
   *
   * @example
   * debouncedUpdateRoadmap();
   *
   * @see updateRoadmap
   */
  const debouncedUpdateRoadmap = useCallback(
    debounce(() => updateRoadmap(), 500),
    [rfInstance, roadmapTitle],
  );

  /**
   * Automatically triggers a debounced roadmap update whenever nodes, edges,
   * or other dependencies change.
   *
   * This ensures that roadmap updates are not triggered excessively,
   * reducing unnecessary API calls.
   *
   * Dependencies:
   * - `edges`, `nodes`: Triggers update when the graph structure changes.
   * - `rfInstance`: Ensures an update is triggered only when the React Flow instance is available.
   * - `nodes.length`, `edges.length`: Explicitly included to detect changes in node/edge count.
   * - `roadmapVisibility`: Updates when roadmap visibility changes.
   * - `selectedEdges`: Ensures selected edges impact updates if relevant.
   *
   * @see debouncedUpdateRoadmap
   */
  useEffect(() => {
    if (rfInstance) {
      debouncedUpdateRoadmap();
    }
  }, [
    edges,
    nodes,
    rfInstance,
    nodes.length,
    edges.length,
    // roadmapTitle,
    debouncedUpdateRoadmap,
    // roadmapVisibility,
    selectedEdges,
  ]);

  /**
   * Updates the selected node based on the number of currently selected nodes.
   *
   * Behavior:
   * - If more than one node or no nodes are selected, it clears the selected node.
   * - If exactly one node is selected, it updates the state only if the selected node has changed.
   * - Uses `JSON.stringify` to compare deep equality, preventing unnecessary re-renders.
   *
   * Dependencies:
   * - `nodes`: Triggers recalculation whenever node selection changes.
   *
   * @example
   * // Automatically selects a node when it's clicked
   * setSelectedNode(selected);
   */
  useEffect(() => {
    const selectedNodesCount = nodes.filter((node) => node.selected).length;

    if (selectedNodesCount > 1 || selectedNodesCount === 0) {
      setSelectedNode(null);
    } else if (selectedNodesCount === 1) {
      const selected = nodes.find((node) => node.selected);
      if (
        selected?.id !== selectedNode?.id ||
        JSON.stringify(selected) !== JSON.stringify(selectedNode)
      ) {
        setSelectedNode(selected || null);
      }
    }
  }, [nodes]);

  /**
   * Listens for a `roadmap::update` event and updates the roadmap data on the server.
   *
   * @description
   * This `useEffect` hook listens for the custom event `roadmap::update` and updates the roadmap details on the server when the event is triggered.
   * - The roadmap is updated with details including the title, visibility, and graph structure.
   * - If the `rfInstance` (roadmap graph instance) is available and the `roadmapTitle` is not empty, the event listener is attached.
   * - On successful update, it triggers a PUT request to the backend, sending the updated roadmap data.
   *
   * @callback
   * @param {Object} event - The event triggered by the `roadmap::update` event.
   * @param {Object} event.detail - Contains the details to update the roadmap.
   *
   * @sideEffect
   * - Makes a PUT request to update the roadmap on the server.
   * - Updates the `isSavingRoadmap` state while the request is in progress.
   * - Logs errors to the console in case of failure.
   * - Removes the event listener when the component is unmounted or dependencies change.
   */
  useEffect(() => {
    const updateRoadmapFromEvent = async (event) => {
      try {
        const details = event.detail;

        if (roadmapTitle === '') return;
        setIsSavingRoadmap(true);
        const compiledGraph = rfInstance.toObject();
        compiledGraph.nodes.forEach((node) => {
          // if (node.id !== selectedNode?.id) {
          node.selected = false;
          // }
        });
        if (refRoadmapId) {
          compiledGraph.ref_rid = refRoadmapId;
          compiledGraph.clone_type = cloneType;
        }
        const data = {
          title: roadmapTitle,
          roadmap_graph: compiledGraph,
          visibility_scope: roadmapVisibility,
          source: 'canvas',
          ...details,
        };
        const response = await updateRoadmapApi(roadmapId, data);
        const responseData = await response.json();
        if (response.status !== 200) {
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsSavingRoadmap(false);
      }
    };
    if (rfInstance && roadmapTitle !== '') {
      window.addEventListener('roadmap::update', updateRoadmapFromEvent);
    }

    return () => {
      if (rfInstance && roadmapTitle !== '') {
        window.removeEventListener('roadmap::update', updateRoadmapFromEvent);
      }
    };
  }, [rfInstance, roadmapTitle]);

  /**
   * Listens for the keyboard shortcuts `Ctrl + Z` (undo) and `Ctrl + Y` (redo).
   *
   * @description
   * This `useEffect` hook listens for `keydown` events on the canvas element to handle undo and redo actions triggered by keyboard shortcuts.
   * - `Ctrl + Z` triggers the undo action.
   * - `Ctrl + Y` triggers the redo action.
   * - The effect is active while the canvas element is rendered and adds/removes the event listener accordingly.
   *
   * @callback
   * @param {KeyboardEvent} e - The keyboard event triggered by pressing keys.
   *
   * @sideEffect
   * - Calls the `undo` and `redo` functions when the respective keyboard shortcuts are pressed.
   * - Removes the event listener when the component is unmounted or dependencies change.
   */
  useEffect(() => {
    // const canvasEl = canvasWrapperRef.current;
    // if (!canvasEl) return;

    const handleKeyDown = (e) => {
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable);
      // Let the browser handle undo/redo in input fields
      if (isInputFocused) {
        return;
      }

      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        handlePaste(e);
      }
    };

    // Track cursor position within the ReactFlow canvas
    const handleMouseMove = (event) => {
      if (rfInstance) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        cursorPositionRef.current = position;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [undo, redo, handleCopy, handlePaste]);

  /**
   * Listens for the `groupNode::adjustChildWidth` event and adjusts the width of child nodes based on a parent node's width.
   *
   * @description
   * This `useEffect` hook listens for the `groupNode::adjustChildWidth` event, which adjusts the width of child nodes based on the width of their parent node.
   * - When the event is triggered, it calculates the updated width for child nodes and applies the changes.
   * - The `getNodes` function is used to get the current state of nodes, and `updateChildNodesWidth` is used to adjust the width.
   *
   * @callback
   * @param {CustomEvent} event - The event triggered by the `groupNode::adjustChildWidth` event.
   * @param {Object} event.detail - Contains the parent node details that triggered the width adjustment.
   *
   * @sideEffect
   * - Updates the width of child nodes in the state.
   * - Adds and removes event listeners for `groupNode::adjustChildWidth`.
   */

  useEffect(() => {
    const handleChildWidthAdjust = (event) => {
      // event.preventDefault();
      const parentNode = event.detail.node;
      const newNodes = getNodes();
      const newWidth = parentNode?.measured?.width || parentNode?.style?.width;
      const updatedNodes = updateChildNodesWidth(
        newNodes,
        parentNode,
        newWidth,
      );
      setNodes(updatedNodes);
    };
    window.addEventListener(
      'groupNode::adjustChildWidth',
      handleChildWidthAdjust,
    );

    return () => {
      window.removeEventListener(
        'groupNode::adjustChildWidth',
        handleChildWidthAdjust,
      );
    };
  }, []);

  useEffect(() => {
    console.log(intersectingNodes);
  }, [intersectingNodes]);

  return (
    <>
      {/* Node Edit Modal: Opens when a node is selected */}
      <AnimatePresence>
        {selectedNode && (
          <NodeEditModal
            selectedNode={selectedNode}
            nodes={nodes}
            setNodes={setNodes}
            roadmapId={roadmapId}
            setSelectedNode={setSelectedNode}
          />
        )}
      </AnimatePresence>
      {/* Edge Edit Modal: Opens when exactly one edge is selected */}
      <AnimatePresence>
        {selectedEdges.length == 1 && (
          <EdgeEditModal
            roadmapId={roadmapId}
            selectedEdge={selectedEdges[0]}
            setSelectedEdges={setSelectedEdges}
            edges={edges}
            setEdges={setEdges}
          />
        )}
      </AnimatePresence>

      {/* This will render component bag and component preview modal combinly */}
      {(showComponentBag || selectedComponent) && (
        <motion.div className={styles['component-ct']}>
          {selectedComponent && <ComponentPreviewModal />}
          {showComponentBag && <ComponentBagModal />}
        </motion.div>
      )}

      {/* ReactFlow Canvas: Main visual editor for the roadmap */}
      <div
        ref={canvasWrapperRef}
        tabIndex={0}
        style={{ outline: 'none', width: '100%', height: '100%' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => setTimeout(() => onNodesChange(changes))}
          onEdgesChange={(changes) => setTimeout(() => onEdgesChange(changes))}
          onSelectionChange={onSelectionChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onNodeDrag={handleOnNodeDrag}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={allowedNodeTypes}
          panOnScroll
          selectionOnDrag={true}
          selectNodesOnDrag={false}
          panOnDrag={panOnDrag}
          selectionMode={SelectionMode.Partial}
          onInit={onInit}
          onNodeClick={handleOnNodeClick}
          onNodesDelete={handleOnNodeDelete}
          onEdgesDelete={handleOnEdgeDelete}
          // maxZoom={1}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          minZoom={0.2}
          fitView
          // onNodeDrag={handleOnNodeDragStop}
          defaultEdgeOptions={defaultEdgeOptions}
        >
          {/* Edge Markers for better edge visibility */}
          <EdgeMarkers />

          {/* Background with a light gray color */}
          <Background style={{ backgroundColor: '#FAFAFA' }} color="#FAFAFA" />

          {/* Canvas Controls: Zoom, Pan, MiniMap */}
          {/*<div className={styles['canvas-controls']}>
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </div> */}
          <HelperLines />
        </ReactFlow>
      </div>
      <RoadmapControlPanel roadmapId={roadmapId} />
      <CanvasPlaceholders
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
      />

      {/* Full-page Loader for ongoing processes */}
      {showFullPageLoader && (
        <div className={styles['full-page-loader']}>
          <Loader height={120} width={120} />
        </div>
      )}
    </>
  );
};

export default EditorCanvas;
