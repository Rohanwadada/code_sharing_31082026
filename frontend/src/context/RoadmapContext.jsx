'use client';

/**
 * Context for managing and sharing roadmap-related state in the application.
 * It includes various states such as title, visibility, status, and nodes for a roadmap.
 */

import { createContext, useState } from 'react';
import useHistory from '../hooks/useHistory';
import { useParams } from 'next/navigation';

/**
 * @typedef {Object} RoadmapContextType
 * @property {String} roadmapTitle - The title of the roadmap.
 * @property {Function} setRoadmapTitle - Function to update the roadmap title.
 * @property {Boolean} isSavingRoadmap - Whether the roadmap is being saved.
 * @property {Function} setIsSavingRoadmap - Function to update the saving status of the roadmap.
 * @property {String} roadmapVisibility - The visibility of the roadmap (e.g., 'private', 'public').
 * @property {Function} setRoadmapVisibility - Function to update the roadmap visibility.
 * @property {String} roadmapStatus - The status of the roadmap (e.g., 'draft', 'published').
 * @property {Function} setRoadmapSatus - Function to update the roadmap status.
 * @property {Array} selectedElements - Array of selected elements (nodes or edges).
 * @property {Function} setSelectedElements - Function to update the selected elements.
 * @property {Object|null} clipboard - The clipboard state containing nodes and edges to be copied or pasted.
 * @property {Function} setClipboard - Function to update the clipboard.
 * @property {Array} nodes - List of nodes (elements) in the roadmap.
 * @property {Function} setNodes - Function to update the nodes state.
 * @property {Array} edges - List of edges (connections) between nodes.
 * @property {Function} setEdges - Function to update the edges state.
 * @property {Function} pushToHistory - Function to push changes to history for undo/redo functionality.
 * @property {Function} undo - Function to undo the last change.
 * @property {Function} redo - Function to redo the last undone change.
 */

/** @type {React.Context<RoadmapContextType>} */
export const RoadmapContext = createContext();

/**
 * Context provider that wraps the application or specific components
 * and provides access to the roadmap context value.
 *
 * @param {Object} props - The component props.
 * @param {ReactNode} props.children - The child components that will have access to the context state.
 * @returns {JSX.Element} The Context Provider component.
 */
export const RoadmapProvider = ({ children }) => {
  const [roadmapTitle, setRoadmapTitle] = useState('');
  const [roadmapDescription, setRoadmapDescription] = useState('');
  const [roadmapLevel, setRoadmapLevel] = useState('beginner');
  const [isSavingRoadmap, setIsSavingRoadmap] = useState(false);
  const [roadmapVisibility, setRoadmapVisibility] = useState('private');
  const [roadmapStatus, setRoadmapSatus] = useState('draft');
  const [selectedElements, setSelectedElements] = useState([]);
  const [clipboard, setClipboard] = useState(null);
  const [roadmapAccess, setRoadmapAccess] = useState('viewer');
  const [roadmapPrice, setRoadmapPrice] = useState(0);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [componentBagData, setComponentBagData] = useState([]);
  const [showComponentBag, setShowComponentBag] = useState(false);
  const [isDraggingComponent, setIsDraggingComponent] = useState(false);

  // React Flow: State management for nodes (roadmap elements).
  const [nodes, setNodes] = useState([]);

  // React Flow: Stores the edges (connections) between nodes.
  const [edges, setEdges] = useState([]);

  const { roadmapId } = useParams();
  // List of content details which will be send for content alert to users in content alert email
  const [contentUpdatedNodeDetails, setContentUpdateNodeDetails] = useState(
    () => {
      const dataFromLocal = localStorage.getItem(
        `pushEmailContentData_${roadmapId}`,
      );
      return dataFromLocal ? JSON.parse(dataFromLocal) : [];
    },
  );

  const { pushToHistory, undo, redo } = useHistory({
    setNodes,
    setEdges,
    roadmapId,
  });

  return (
    <RoadmapContext.Provider
      value={{
        roadmapTitle,
        setRoadmapTitle,
        isSavingRoadmap,
        setIsSavingRoadmap,
        roadmapVisibility,
        setRoadmapVisibility,
        roadmapStatus,
        setRoadmapSatus,
        selectedElements,
        setSelectedElements,
        clipboard,
        setClipboard,
        nodes,
        setNodes,
        edges,
        setEdges,
        pushToHistory,
        undo,
        redo,
        roadmapDescription,
        setRoadmapDescription,
        roadmapLevel,
        setRoadmapLevel,
        roadmapAccess,
        setRoadmapAccess,
        roadmapPrice,
        setRoadmapPrice,
        contentUpdatedNodeDetails,
        setContentUpdateNodeDetails,
        selectedComponent,
        setSelectedComponent,
        componentBagData,
        setComponentBagData,
        showComponentBag,
        setShowComponentBag,
        isDraggingComponent,
        setIsDraggingComponent,
      }}
    >
      {children}
    </RoadmapContext.Provider>
  );
};
