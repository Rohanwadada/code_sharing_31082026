import React, { useState, useEffect, useRef, useContext } from 'react';
import styles from './PropertiesTab.module.css';
import {
  ALLOWED_NODE_TYPES,
  FONT_SIZE_MAP,
  NODE_COLOR_MAP,
  USER_ROADMAP_HISTORY_ACTIONS,
} from '@/utils/constants';
import PropTypes from 'prop-types';
import { Tooltip } from 'react-tooltip';
import checkIcon from '@/assets/access-management/check.svg';
import { emitCustomEvent, isDarkColor } from '@/utils/helper';
import { useReactFlow } from '@xyflow/react';
import { RoadmapContext } from '@/context/RoadmapContext';
import Image from 'next/image';

/**
 * PropertiesTab Component
 *
 * This component renders various node property editors based on user permissions.
 * Each property editor allows modifying specific attributes of the selected node.
 *
 * Props:
 * @param {Object} selectedNode - The currently selected node in the flow.
 * @param {Array} nodes - The list of all nodes in the flow.
 * @param {Function} setNodes - Function to update the list of nodes.
 * @param {Function} setSelectedNode - Function to update the selected node.
 * @param {Function} hasPermission - Function to check if the user has permission for specific properties.
 */
const PropertiesTab = ({
  selectedNode,
  nodes,
  setNodes,
  setSelectedNode,
  hasPermission,
}) => {
  const { getEdges } = useReactFlow();
  const { pushToHistory } = useContext(RoadmapContext);

  return (
    <div className={styles['properties-container']}>
      {/* Label */}
      {hasPermission('properties', 'label') && (
        <NodeLabelEditor
          selectedNode={selectedNode}
          nodes={nodes}
          setNodes={setNodes}
          setSelectedNode={setSelectedNode}
          pushToHistory={pushToHistory}
          getEdges={getEdges}
        />
      )}

      {/* Position */}
      {hasPermission('properties', 'position') && (
        <NodePositionEditor
          selectedNode={selectedNode}
          nodes={nodes}
          setNodes={setNodes}
          setSelectedNode={setSelectedNode}
          hasPermission={hasPermission}
          pushToHistory={pushToHistory}
          getEdges={getEdges}
        />
      )}

      {/* Dimension */}
      {hasPermission('properties', 'dimension') && (
        <NodeDimensionEditor
          selectedNode={selectedNode}
          nodes={nodes}
          setNodes={setNodes}
          setSelectedNode={setSelectedNode}
          hasPermission={hasPermission}
          pushToHistory={pushToHistory}
          getEdges={getEdges}
        />
      )}

      {hasPermission('properties', 'rearrangeLayout') && (
        <RarrangeChildLayout selectedNode={selectedNode} />
      )}

      {/* Node Knowledge level type editor */}
      {hasPermission('properties', 'nodeStyleByKnowledegeLevelChanger') && (
        <NodeStyleByKnowledgeLevelEditor
          selectedNode={selectedNode}
          nodes={nodes}
          setNodes={setNodes}
          setSelectedNode={setSelectedNode}
          pushToHistory={pushToHistory}
          getEdges={getEdges}
        />
      )}

      {/* Node type switcher */}
      {hasPermission('properties', 'nodeTypeChanger') && (
        <NodeTypeEditor
          selectedNode={selectedNode}
          nodes={nodes}
          setNodes={setNodes}
          setSelectedNode={setSelectedNode}
          pushToHistory={pushToHistory}
          getEdges={getEdges}
        />
      )}

      {/* Node Font size */}
      {hasPermission('properties', 'fontSize') && (
        <NodeFontSizeEditor
          selectedNode={selectedNode}
          nodes={nodes}
          setNodes={setNodes}
          setSelectedNode={setSelectedNode}
          pushToHistory={pushToHistory}
          getEdges={getEdges}
        />
      )}

      {/* Node background Color */}
      {hasPermission('properties', 'backgroundColor') && (
        <NodeBackgroundColorEditor
          selectedNode={selectedNode}
          nodes={nodes}
          setNodes={setNodes}
          setSelectedNode={setSelectedNode}
          pushToHistory={pushToHistory}
          getEdges={getEdges}
        />
      )}

      {/* Border, background, text color for paragraph */}
      {hasPermission('properties', 'paragraphStyle') && (
        <ParagraphStyleEditor
          selectedNode={selectedNode}
          nodes={nodes}
          setNodes={setNodes}
          setSelectedNode={setSelectedNode}
        />
      )}
    </div>
  );
};

/**
 * NodeLabelEditor Component
 *
 * This component allows users to edit the label or content of a selected node.
 * If the node type is 'paragraph', a textarea is used for input; otherwise, an input field is used.
 *
 * Props:
 * - @param {Object} selectedNode : The currently selected node.
 * - @param {Array} nodes : List of all nodes in the editor.
 * - @param {Function} setNodes : Function to update the list of nodes.
 * - @param {Function} setSelectedNode : Function to update the currently selected node.
 *
 * Functionality:
 * - Updates the label or content of the selected node in real-time as the user types.
 * - Uses an input field for regular nodes and a textarea for paragraph-type nodes.
 *
 * @returns {JSX.Element} The rendered NodeLabelEditor component.
 */
const NodeLabelEditor = ({
  selectedNode,
  nodes,
  setNodes,
  setSelectedNode,
  pushToHistory,
  getEdges,
}) => {
  const labelInputRef = useRef(null);
  const [labelInput, setLableInput] = useState(selectedNode?.data?.label || '');
  const [oldNodeLabel, setOldNodeLabel] = useState(null);

  useEffect(() => {
    setLableInput(selectedNode?.data?.label || '');
  }, [selectedNode]);

  const handleNodeLabelInputFocus = () => {
    setOldNodeLabel(selectedNode.data.label);
  };

  /**
   * Handles label/content changes and updates the node list accordingly.
   * @param {Event} event - The input change event.
   */
  const handleNodeLabelChange = (event) => {
    const newLabel = event.target.value;
    setLableInput(newLabel);
    const updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        setSelectedNode({
          ...node,
          data: { ...node.data, label: newLabel },
        });
        return { ...node, data: { ...node.data, label: newLabel } };
      }
      return node;
    });
    // setLabel(event.target.value);
    setNodes(updatedNodes);
  };

  const handleNodeLableInputBlur = () => {
    if (oldNodeLabel.trim() === labelInput.trim()) return;
    const finalNodes = nodes;
    const finalEdges = getEdges();
    pushToHistory(
      finalNodes,
      finalEdges,
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
      {
        message: 'Changed node label',
        type: 'node_label',
        node_id: [selectedNode?.id],
        from: oldNodeLabel,
        to: labelInput,
      },
    );
    setOldNodeLabel(null);
  };

  // useEffect(() => {
  //   if(labelInputRef.current) {
  //     labelInputRef.current?.focus();
  //   }
  // }, [selectedNode?.id]);

  return (
    <div className={styles['label']}>
      {selectedNode?.type === 'paragraph' ? (
        <>
          <p className={styles['label-name']}>CONTENT</p>
          <textarea
            ref={labelInputRef}
            type="text"
            value={selectedNode?.data?.label || ''}
            onFocus={handleNodeLabelInputFocus}
            onChange={handleNodeLabelChange}
            onBlur={handleNodeLableInputBlur}
            className={styles['textarea-input']}
          ></textarea>
        </>
      ) : (
        <>
          <p className={styles['label-name']}>LABEL</p>
          <input
            ref={labelInputRef}
            type="text"
            value={selectedNode?.data?.label || ''}
            onFocus={handleNodeLabelInputFocus}
            onChange={handleNodeLabelChange}
            onBlur={handleNodeLableInputBlur}
            className={styles['label-input']}
          />
        </>
      )}
    </div>
  );
};

/**
 * NodePositionEditor Component
 *
 * @description
 * Allows users to adjust the position (`x` and `y` coordinates) of a selected node.
 * Updates are immediately reflected in the node's data and the global state.
 *
 * Props:
 * @param {Object} selectedNode - The currently selected node whose position is being edited.
 * @param {Array} nodes - The list of all nodes in the flow.
 * @param {Function} setNodes - Function to update the nodes state.
 * @param {Function} setSelectedNode - Function to update the selected node state.
 * @param {Function} hasPermission - Function to check if the user has permission to modify the node's position.
 *
 * @returns {JSX.Element} The rendered NodePositionEditor component.
 */
const NodePositionEditor = ({
  selectedNode,
  nodes,
  setNodes,
  setSelectedNode,
  hasPermission,
  pushToHistory,
  getEdges,
}) => {
  const [nodePosition, setNodePosition] = useState(
    selectedNode?.position || {},
  );

  const [oldPosition, setOldPosition] = useState(null);

  useEffect(() => {
    if (selectedNode) {
      setNodePosition(selectedNode?.position);
    }
  }, [selectedNode]);

  const handlePositionFocus = () => {
    if (selectedNode?.position) {
      setOldPosition({ ...selectedNode.position });
    }
  };

  const handlePositionChange = (event) => {
    const { name, value } = event.target;
    let newPosition = {};
    const updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        newPosition = { ...node.position, [name]: Number(value) };

        setSelectedNode({
          ...node,
          position: newPosition,
        });
        setNodePosition(newPosition);
        return { ...node, position: newPosition };
      }
      return node;
    });
    setNodes(updatedNodes);
  };

  const handlePositionBlur = () => {
    const updatedNode = nodes.find((n) => n.id === selectedNode.id);
    if (
      oldPosition &&
      (oldPosition.x !== updatedNode.position.x ||
        oldPosition.y !== updatedNode.position.y)
    ) {
      pushToHistory(
        nodes,
        getEdges(),
        USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
        {
          message: 'Updated the position of the node',
          type: 'position',
          node_id: [selectedNode?.id],
          from: oldPosition,
          to: updatedNode.position,
        },
      );
      setOldPosition(null); // reset after logging
    }
  };

  return (
    <div className={styles['position-ct']}>
      <p className={styles['label-name']}>POSITION</p>
      <div className={styles['position-input-ct']}>
        <div className={styles['position-input-x']}>
          <span>X</span>
          <input
            value={Math.trunc(nodePosition?.x)}
            type="number"
            name="x"
            className={styles['position-input']}
            onFocus={handlePositionFocus}
            onChange={handlePositionChange}
            onBlur={handlePositionBlur}
          />
        </div>
        <div className={styles['position-input-y']}>
          <span>Y</span>
          <input
            value={Math.trunc(nodePosition?.y)}
            type="number"
            name="y"
            className={styles['position-input']}
            onFocus={handlePositionFocus}
            onChange={handlePositionChange}
            onBlur={handlePositionBlur}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * NodeDimensionEditor Component
 *
 * This component allows users to modify the dimensions (width and height) of a selected node.
 * It ensures that certain node types have restricted dimension changes, such as preventing width
 * modifications for child nodes within a group and height modifications for group nodes.
 *
 * Props:
 * @param {Object} selectedNode - The currently selected node whose position is being edited.
 * @param {Array} nodes - The list of all nodes in the flow.
 * @param {Function} setNodes - Function to update the nodes state.
 * @param {Function} setSelectedNode - Function to update the selected node state.
 * @param {Function} hasPermission - Function to check if the user has permission to modify the node's position.
 *
 * @returns {JSX.Element} The rendered NodeDimensionEditor component.
 */
const NodeDimensionEditor = ({
  selectedNode,
  nodes,
  setNodes,
  setSelectedNode,
  hasPermission,
  pushToHistory,
  getEdges,
}) => {
  const [nodeDimension, setNodeDimension] = useState(
    selectedNode?.measured || selectedNode || selectedNode?.style,
  );
  const [oldDimensions, setOldDimensions] = useState(null);

  const [widthInput, setWidthInput] = useState('');
  const [heightInput, setHeightInput] = useState('');

  useEffect(() => {
    if (selectedNode) {
      const newDimension =
        selectedNode?.measured || selectedNode || selectedNode?.style;
      setNodeDimension(newDimension);
      setWidthInput(newDimension?.width?.toString() || '');
      setHeightInput(newDimension?.height?.toString() || '');
    }
  }, [selectedNode]);

  const MIN_WIDTH = 7;
  const MIN_HEIGHT = 7;
  const MAX_DIMENSION = 10000;

  const emitCustomEvent = (eventName, eventData) => {
    const event = new CustomEvent(eventName, { detail: eventData });
    window.dispatchEvent(event);
  };

  const updateChildNodesWidth = (nodes, parentNode, newWidth) => {
    const parentX = parentNode.position.x;
    const parentWidth = newWidth;
    const childWidth = parentWidth * 0.9;
    return nodes.map((node) => {
      if (node.parentId === parentNode.id) {
        return {
          ...node,
          position: {
            ...node.position,
            x: (parentWidth - childWidth) / 2,
          },
          measured: {
            ...node.measured,
            width: childWidth,
          },
          style: {
            ...node.style,
            width: childWidth,
          },
          width: childWidth,
        };
      }
      return node;
    });
  };

  const handleDimensionFocus = () => {
    if (selectedNode) {
      setOldDimensions({
        width: selectedNode.measured?.width,
        height: selectedNode.measured?.height,
      });
    }
  };

  const handleDimensionChange = (event) => {
    const { name, value } = event.target;

    if (name === 'width') setWidthInput(value);
    if (name === 'height') setHeightInput(value);

    const parsed = parseInt(value);
    if (isNaN(parsed)) return;

    // prevent changing height of the group nodes
    if (
      (selectedNode?.type === 'subtopicGroup' ||
        selectedNode?.type === 'topicGroup') &&
      name === 'height'
    )
      return;
    // prevent changing width of the child nodes in a group
    if (
      (selectedNode?.type === 'subtopic' ||
        selectedNode?.type === 'assignmentNode') &&
      selectedNode?.parentId &&
      name === 'width'
    )
      return;

    let updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        const updated = {
          ...node,
          measured: { ...node.measured, [name]: parsed },
          style: { ...node.style, [name]: parsed },
          [name]: parsed,
        };

        setSelectedNode(updated);
        setNodeDimension((prev) => ({ ...prev, [name]: parsed }));

        return updated;
      }
      return node;
    });

    updatedNodes = updateChildNodesWidth(updatedNodes, selectedNode, value);
    // maintaing the parent node height when the height of child node changes
    if (
      name === 'height' &&
      (selectedNode?.type === 'subtopic' ||
        selectedNode?.type === 'assignmentNode') &&
      selectedNode?.parentId
    ) {
      const parentNode = nodes.find(
        (node) => node.id === selectedNode.parentId,
      );
      if (parentNode) {
        emitCustomEvent('groupNode::rearrangeChildren', {
          nodeId: parentNode.id,
          nodes: updatedNodes,
        });
      }
    }
    setNodes(updatedNodes);
  };

  const handleDimensionBlur = (name) => {
    const inputVal = name === 'width' ? widthInput : heightInput;
    const parsed = parseInt(inputVal);

    if (isNaN(parsed)) {
      // Reset to the current dimension if input is invalid
      if (name === 'width')
        setWidthInput(Math.trunc(nodeDimension?.width).toString());
      if (name === 'height')
        setHeightInput(Math.trunc(nodeDimension?.height).toString());
      return;
    }

    // Clamp values
    const clamped = Math.max(10, Math.min(999999999, parsed)); // adjust bounds if needed

    // Prevent dimension updates for restricted types
    if (
      (selectedNode?.type === 'subtopicGroup' ||
        selectedNode?.type === 'topicGroup') &&
      name === 'height'
    )
      return;

    if (
      (selectedNode?.type === 'subtopic' ||
        selectedNode?.type === 'assignmentNode') &&
      selectedNode?.parentId &&
      name === 'width'
    )
      return;

    // avoid redundent update on blur
    if (clamped === oldDimensions?.[name]) {
      // Reset input to reflect clamped/truncated value (sanity UI)
      if (name === 'width') setWidthInput(clamped.toString());
      if (name === 'height') setHeightInput(clamped.toString());
      return;
    }

    let updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        const updated = {
          ...node,
          measured: { ...node.measured, [name]: clamped },
          style: { ...node.style, [name]: clamped },
          [name]: clamped,
        };

        setSelectedNode(updated);
        setNodeDimension((prev) => ({ ...prev, [name]: clamped }));

        return updated;
      }
      return node;
    });

    updatedNodes = updateChildNodesWidth(updatedNodes, selectedNode, clamped);

    if (
      name === 'height' &&
      (selectedNode?.type === 'subtopic' ||
        selectedNode?.type === 'assignmentNode') &&
      selectedNode?.parentId
    ) {
      const parentNode = nodes.find(
        (node) => node.id === selectedNode.parentId,
      );
      if (parentNode) {
        emitCustomEvent('groupNode::rearrangeChildren', {
          nodeId: parentNode.id,
          nodes: updatedNodes,
        });
      }
    }

    setNodes(updatedNodes);

    // Get new dimensions after update
    const updatedNode = updatedNodes.find((n) => n.id === selectedNode.id);
    const newDimensions = {
      width: updatedNode?.measured?.width,
      height: updatedNode?.measured?.height,
    };

    pushToHistory(
      updatedNodes,
      getEdges(),
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
      {
        message: 'Updated the dimension of the node',
        type: 'dimension',
        node_id: [selectedNode?.id],
        field: name,
        from: oldDimensions,
        to: newDimensions,
      },
    );

    setOldDimensions(null);

    // Reset input value to clamped value
    if (name === 'width') setWidthInput(clamped.toString());
    if (name === 'height') setHeightInput(clamped.toString());
  };

  return (
    <>
      <div className={styles['dimension-ct']}>
        <p className={styles['label-name']}>DIMENSIONS</p>
        <div className={styles['dimension-input-ct']}>
          <div
            className={`${styles['dimension-input-w']} ${
              !hasPermission('properties', 'dimension.width')
                ? styles['readonly']
                : ''
            }`}
            data-tooltip-id="dimension-tooltip"
            data-tooltip-content={
              !hasPermission('properties', 'dimension.width')
                ? "Width is readonly for this node. It automatically increases according to the parent node's width"
                : ''
            }
            data-tooltip-place="right"
          >
            <span>W</span>
            <input
              value={widthInput}
              type="number"
              name="width"
              className={styles['dimension-input']}
              onFocus={handleDimensionFocus}
              onChange={handleDimensionChange}
              onBlur={() => handleDimensionBlur('width')}
              readOnly={!hasPermission('properties', 'dimension.width')}
            />
          </div>
          <div
            className={`${styles['dimension-input-h']} ${
              !hasPermission('properties', 'dimension.height')
                ? styles['readonly']
                : ''
            }`}
            data-tooltip-id="dimension-tooltip"
            data-tooltip-content={
              !hasPermission('properties', 'dimension.height')
                ? "Height is readonly for this node. It automatically increases according to the inner node's height"
                : ''
            }
            data-tooltip-place="left"
          >
            <span>H</span>
            <input
              value={heightInput}
              type="number"
              name="height"
              className={styles['dimension-input']}
              onFocus={handleDimensionFocus}
              onChange={handleDimensionChange}
              onBlur={() => handleDimensionBlur('height')}
              readOnly={!hasPermission('properties', 'dimension.height')}
            />
          </div>
        </div>
      </div>
      <Tooltip
        id="dimension-tooltip"
        style={{
          backgroundColor: '#000000',
          color: '#FFFFFF',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '10px',
          fontWeight: '500',
          textAlign: 'left',
          // borderRadius: '20px',
          padding: '5px',
          zIndex: 1000,
          width: '200px',
        }}
        delayShow={500}
        className={styles['custom-tooltip-animation']}
      />
    </>
  );
};

/**
 * NodeTypeEditor Component
 *
 * This component allows users to change the type of a selected node.
 *
 * Props:
 * @param {Object} selectedNode - The currently selected node whose position is being edited.
 * @param {Array} nodes - The list of all nodes in the flow.
 * @param {Function} setNodes - Function to update the nodes state.
 * @param {Function} setSelectedNode - Function to update the selected node state.
 *
 * Behavior:
 * - Renders a dropdown that lets the user select a node type.
 * - Updates the selected node's type in the state when changed.
 * - Ensures the new type is reflected in the nodes list.
 *
 * @returns {JSX.Element} The rendered NodeTypeEditor component.
 */
const NodeTypeEditor = ({
  selectedNode,
  nodes,
  setNodes,
  setSelectedNode,
  pushToHistory,
  getEdges,
}) => {
  const options = [
    { id: 'subtopic', label: 'Subtopic' },
    { id: 'assignmentNode', label: 'Assignment' },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(options[0]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (selectedNode?.type) {
      setSelectedOption(
        options.find((option) => option.id === selectedNode?.type) ||
          options[0],
      );
    }
  }, [selectedNode.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleTypeChange = (option) => {
    const newType = option.id;
    selectedNode.type = newType;
    const updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        return {
          ...node,
          type: newType,
          data: {
            ...node.data,
            label: newType === 'assignmentNode' ? 'Assignment' : 'Sub-Topic',
          },
        };
      }
      return node;
    });
    setNodes(updatedNodes);
    pushToHistory(
      updatedNodes,
      getEdges(),
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
      {
        message: `Changed the node type`,
        type: 'type_change',
        node_id: [selectedNode?.id],
        from: `${newType === 'subtopic' ? 'Assignment' : 'Subtopic'}`,
        to: `${newType === 'subtopic' ? 'Subtopic' : 'Assignment'}`,
      },
    );
  };

  const handleOptionClick = (option) => {
    handleTypeChange(option);
    setSelectedOption(option);
    setIsOpen(false);
  };

  return (
    <div className="type">
      <p className={styles['label-name']}>NODE TYPE</p>
      {/* <select
        name="type"
        id="type"
        className={styles['select-type']}
        value={selectedNode.type}
        onChange={handleTypeChange}
      >
        <option value="subtopic">Subtopic</option>
        <option value="assignmentNode">Assignment</option>
      </select> */}

      <div className={styles['dropdown-container']} ref={dropdownRef}>
        <div
          className={`${styles['dropdown-header']} ${isOpen ? styles['dropdown-open'] : ''}`}
          onClick={toggleDropdown}
        >
          <div className={styles['selected-option']}>
            <span className={styles['selected-option-label']}>
              {selectedOption.label}
            </span>
          </div>
        </div>

        {isOpen && (
          <div className={styles['dropdown-options']}>
            {options
              .filter((option) => option.id !== selectedOption.id)
              .map((option) => (
                <div
                  key={option.id}
                  className={styles['dropdown-option']}
                  onClick={() => handleOptionClick(option)}
                >
                  <span className={styles['option-label']}>{option.label}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * NodeFontSizeEditor Component
 *
 * This component allows users to update the font size of a selected node.
 * Font size changes are applied to the node's style data and, in case of group nodes,
 * to the header style as well.
 *
 * Props:
 * @param {Object} selectedNode - The currently selected node whose font size is being edited.
 * @param {Array} nodes - The list of nodes in the React Flow graph.
 * @param {Function} setNodes - Function to update the nodes state.
 * @param {Function} setSelectedNode - Function to update the selected node state.
 *
 * Behavior:
 * - Displays available font size options from FONT_SIZE_MAP.
 * - Highlights the currently selected font size.
 * - Updates the node's font size in its style data when a size is selected.
 * - If the node is a group node, also updates its headerStyle font size.
 *
 * @returns {JSX.Element} The rendered NodeFontSizeEditor component.
 */
const NodeFontSizeEditor = ({
  selectedNode,
  nodes,
  setNodes,
  setSelectedNode,
  pushToHistory,
  getEdges,
}) => {
  const handleFontSizeChange = (size) => {
    const oldFontSize = ALLOWED_NODE_TYPES.group.includes(selectedNode?.type)
      ? selectedNode.data.headerStyle.fontSize
      : selectedNode.data.style.fontSize;
    const updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        const updatedData = {
          ...node.data,
          style: { ...node.data.style, fontSize: FONT_SIZE_MAP[size] },
        };
        // for group nodes
        if (ALLOWED_NODE_TYPES.group.includes(node?.type)) {
          updatedData.headerStyle = {
            ...node.data.headerStyle,
            fontSize: FONT_SIZE_MAP[size],
          };
        }
        setSelectedNode({
          ...node,
          data: updatedData,
        });

        return {
          ...node,
          data: updatedData,
        };
      }
      return node;
    });

    setNodes(updatedNodes);
    pushToHistory(
      updatedNodes,
      getEdges(),
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
      {
        message: 'Changed the font size of the node',
        type: 'font',
        node_id: [selectedNode?.id],
        from: oldFontSize,
        to: FONT_SIZE_MAP[size],
      },
    );
  };

  return (
    <>
      <div className={styles['font-size']}>
        <p className={styles['label-name']}>FONT SIZE</p>
        <div className={styles['all-font-size']}>
          {Object.entries(FONT_SIZE_MAP).map(([size, px]) => (
            <p
              key={size}
              className={`${styles['size']} ${
                selectedNode?.data?.style?.fontSize === px
                  ? styles['selected']
                  : ''
              }`}
              onClick={() => handleFontSizeChange(size)}
              data-tooltip-id="fontsize-tooltip"
              data-tooltip-content={`${px}`}
            >
              {size}
            </p>
          ))}
        </div>
      </div>
      <Tooltip
        id="fontsize-tooltip"
        style={{
          backgroundColor: '#000000',
          color: '#FFFFFF',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '12px',
          fontWeight: '600',
          textAlign: 'left',
          padding: '5px',
          zIndex: 1000,
        }}
        place="top"
        delayShow={500}
        noArrow
        className={styles['custom-tooltip-animation']}
      />
    </>
  );
};

/**
 * NodeBackgroundColorEditor Component
 *
 * This component allows users to change the background color of a selected node.
 * The selected color is applied to the node's style and is updated in the global state.
 *
 * Props:
 * @param {Object} props - Component props
 * @param {Object} props.selectedNode - The currently selected node in the flow
 * @param {Array} props.nodes - List of all nodes in the flow
 * @param {Function} props.setNodes - Function to update the nodes state
 * @param {Function} props.setSelectedNode - Function to update the selected node state
 *
 * @returns {JSX.Element} The rendered NodeBackgroundColorEditor component.
 */
const NodeBackgroundColorEditor = ({
  selectedNode,
  nodes,
  setNodes,
  setSelectedNode,
  pushToHistory,
  getEdges,
}) => {
  /**
   * Handles background color change for the selected node.
   * Updates the node's style and text color based on the selected background color.
   *
   * @param {number} index - The index of the selected color in NODE_COLOR_MAP
   */
  const handleNodeColorChange = (index) => {
    const oldColorValue = selectedNode.data.style.backgroundColor;
    const newColorValue = NODE_COLOR_MAP[index];
    const updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        return {
          ...node,
          data: {
            ...node.data,
            style: {
              ...node.data.style,
              backgroundColor: newColorValue,
              color: isDarkColor(newColorValue) ? '#ffffff' : '#000000',
            },
          },
        };
      }
      return node;
    });
    setNodes(updatedNodes);
    pushToHistory(
      updatedNodes,
      getEdges(),
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
      {
        message: 'Changed the background color of the node',
        type: 'background_color',
        node_id: [selectedNode?.id],
        from: oldColorValue,
        to: newColorValue,
      },
    );
  };

  return (
    <div className={styles['node-color']}>
      <p className={styles['label-name']}>NODE COLOR</p>
      <div className={styles['all-color']}>
        {NODE_COLOR_MAP.map((colorCode, index) => {
          const isDarkBgColor = isDarkColor(colorCode);
          return (
            <div
              key={index}
              className={`${styles['color-card']} ${
                selectedNode?.data?.style?.backgroundColor.toLowerCase() ===
                NODE_COLOR_MAP[index].toLowerCase()
                  ? styles['selectd']
                  : ''
              }`}
              style={{
                backgroundColor: colorCode,
                border:
                  colorCode.toLowerCase() === '#ffffff'
                    ? '1px solid #000000'
                    : 'none',
              }}
              onClick={() => handleNodeColorChange(index)}
            >
              {selectedNode?.data?.style?.backgroundColor.toLowerCase() ===
                NODE_COLOR_MAP[index].toLowerCase() && (
                <Image
                  src={checkIcon}
                  alt=""
                  style={{
                    width: '15px',
                    filter: isDarkBgColor ? 'invert(1)' : 'none',
                  }}
                />
              )}
            </div>
          );
        })}
        {/* <div className={styles['color-card-add-btn']}>
          <p>+</p>
        </div> */}
      </div>
    </div>
  );
};

/**
 * ParagraphStyleEditor Component
 *
 * This component allows users to edit the style properties of a selected paragraph node,
 * including background color, border color, text color, padding, text alignment, and justification.
 *
 * Props:
 * @param {Object} props - Component props
 * @param {Object} props.selectedNode - The currently selected node in the flow
 * @param {Array} props.nodes - List of all nodes in the flow
 * @param {Function} props.setNodes - Function to update the nodes state
 *
 * Functionality:
 * - Uses `handleParagraphStyleChange` to update the selected node's styles in state.
 * - Supports color pickers for background, border, and text colors.
 * - Allows input for padding values (converted to pixels).
 * - Provides dropdowns for text alignment and justification options.
 *
 * @returns {JSX.Element} The rendered ParagraphStyleEditor component.
 */
const ParagraphStyleEditor = ({
  selectedNode,
  nodes,
  setNodes,
  setSelectedNode,
}) => {
  /**
   * Handles style changes for the selected paragraph node.
   * @param {Event} event - The change event from the input.
   * @param {string} key - The style property to update.
   */
  const handleParagraphStyleChange = (event, key) => {
    let value = event.target.value;

    if (key === 'padding') {
      value += 'px';
    }

    const updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        setSelectedNode({
          ...node,
          data: { ...node.data, style: { ...node.data.style, [key]: value } },
        });
        return {
          ...node,
          data: { ...node.data, style: { ...node.data.style, [key]: value } },
        };
      }
      return node;
    });
    setNodes(updatedNodes);
  };

  return (
    <div className={styles['paragraphs']}>
      <p className={styles['label-name']}>PARAGRAPH STYLE</p>

      <div className={styles['paragraph-style']}>
        <div className={styles['background']}>
          <p className={styles['label-child-name']}>Background Color</p>
          <div className={styles['double']}>
            <input
              type="color"
              value={selectedNode?.data?.style?.backgroundColor}
              onChange={(e) => handleParagraphStyleChange(e, 'backgroundColor')}
              className={styles['color']}
            />
            <input
              type="text"
              value={selectedNode?.data?.style?.backgroundColor}
              readOnly
              className={styles['color-hex-input']}
            />
          </div>
        </div>
        <div className={styles['border']}>
          <p className={styles['label-child-name']}>Border Color</p>
          <div className={styles['double']}>
            <input
              type="color"
              value={selectedNode?.data?.style?.borderColor}
              onChange={(e) => handleParagraphStyleChange(e, 'borderColor')}
              className={styles['color']}
            />
            <input
              type="text"
              value={selectedNode?.data?.style?.borderColor}
              readOnly
              className={styles['color-hex-input']}
            />
          </div>
        </div>
        <div className={styles['text']}>
          <p className={styles['label-child-name']}>Text Color</p>
          <div className={styles['double']}>
            <input
              type="color"
              value={selectedNode?.data?.style?.color}
              onChange={(e) => handleParagraphStyleChange(e, 'color')}
              className={styles['color']}
            />
            <input
              type="text"
              value={selectedNode?.data?.style?.color}
              readOnly
              className={styles['color-hex-input']}
            />
          </div>
        </div>
        <div className={styles['padding']}>
          <p className={styles['label-child-name']}>Padding</p>
          <input
            type="number"
            value={parseInt(selectedNode?.data?.style?.padding, 10) || 0}
            onChange={(e) => handleParagraphStyleChange(e, 'padding')}
            className={styles['padding-input']}
          />
        </div>
        <div className={styles['text-align']}>
          <p className={styles['label-child-name']}>Text Align</p>
          <select
            value={selectedNode?.data?.style?.textAlign}
            onChange={(e) => handleParagraphStyleChange(e, 'textAlign')}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div className={styles['justification']}>
          <p className={styles['label-child-name']}>Justification</p>
          <select
            value={selectedNode?.data?.style?.justifyContent}
            onChange={(e) => handleParagraphStyleChange(e, 'justifyContent')}
          >
            <option value="flex-start">Top</option>
            <option value="center">Center</option>
            <option value="flex-end">Bottom</option>
          </select>
        </div>
      </div>
    </div>
  );
};

/**
 * NodeStyleByKnowledgeLevelEditor Component
 *
 * This component allows users to select a knowledge type (Must Know, Good To Know, Suggested Learning)
 * and updates the node's background and border color based on the selection.
 *
 * Props:
 * @param {Object} selectedNode - The currently selected node.
 * @param {Array} nodes - The list of nodes in the graph.
 * @param {Function} setNodes - Function to update the nodes list.
 * @param {Function} setSelectedNode - Function to update the selected node state.
 *
 * @returns {JSX.Element} The rendered ParagraphStyleEditor component.
 */
const NodeStyleByKnowledgeLevelEditor = ({
  selectedNode,
  nodes,
  setNodes,
  setSelectedNode,
  pushToHistory,
  getEdges,
}) => {
  const getStylesByKNLType = (knowledgeType) => {
    if (knowledgeType === 'none') {
      return {
        backgroundColor: '#FFFFFF',
        borderColor: '#161616',
        color: '#000000',
      };
    }
    if (knowledgeType === 'must_know') {
      return {
        backgroundColor: '#FF4C4C30',
        borderColor: '#FF4C4C',
        color: '#000000',
      };
    }
    if (knowledgeType === 'good_to_know') {
      return {
        backgroundColor: '#FFC72780',
        borderColor: '#FFC727',
        color: '#000000',
      };
    }
    if (knowledgeType === 'suggested_learning') {
      return {
        backgroundColor: '#7DCE7980',
        borderColor: '#0AB81F',
        color: '#000000',
      };
    }
  };

  const handleTypeChange = (option) => {
    const knowledgeType = option.id;
    const oldKnowledgeType = selectedNode?.id?.data?.knl_type || 'none';
    const oldKnowledgeOption = options.find((o) => o.id === oldKnowledgeType);
    const updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            knl_type: knowledgeType,
            style: { ...node.data.style, ...getStylesByKNLType(knowledgeType) },
          },
        };
        setSelectedNode(updatedNode);
        return updatedNode;
      }
      return node;
    });
    setNodes(updatedNodes);
    pushToHistory(
      updatedNodes,
      getEdges(),
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
      {
        message: `Change the knowledge level type of the node`,
        type: 'knowledge_type',
        node_id: [selectedNode?.id],
        from: oldKnowledgeOption?.label,
        to: option.label,
      },
    );
  };

  const options = [
    { id: 'none', label: 'None', color: '#161616' },
    { id: 'must_know', label: 'Must Know', color: '#FF615D' },
    { id: 'good_to_know', label: 'Good to Know', color: '#FFC727' },
    { id: 'suggested_learning', label: 'Suggested Learning', color: '#01A901' },
    // { id: "add_new_type", label: "Add New Type", color: "#161616" },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(options[0]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (selectedNode?.data?.knl_type) {
      const nodeKnowledgeType = options.find(
        (option) => option.id === selectedNode?.data?.knl_type,
      );
      if (nodeKnowledgeType) {
        setSelectedOption(nodeKnowledgeType);
      }
    } else {
      setSelectedOption(options[0]);
    }
  }, [selectedNode.id]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option) => {
    handleTypeChange(option);
    setSelectedOption(option);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="type">
      <p className={styles['label-name']}>TYPE</p>
      <div className={styles['dropdown-container']} ref={dropdownRef}>
        <div
          className={`${styles['dropdown-header']} ${isOpen ? styles['dropdown-open'] : ''}`}
          onClick={toggleDropdown}
        >
          <div className={styles['selected-option']}>
            <span
              className={styles['color-indicator']}
              style={{ backgroundColor: selectedOption.color }}
            ></span>
            <span className={styles['selected-option-label']}>
              {selectedOption.label}
            </span>
          </div>
        </div>

        {isOpen && (
          <div className={styles['dropdown-options']}>
            {options
              .filter((option) => option.id !== selectedOption.id)
              .map((option) => (
                <div
                  key={option.id}
                  className={styles['dropdown-option']}
                  onClick={() => handleOptionClick(option)}
                >
                  <span
                    className={styles['color-indicator']}
                    style={{ backgroundColor: option.color }}
                  ></span>
                  <span className={styles['option-label']}>{option.label}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RarrangeChildLayout = ({ selectedNode }) => {
  const { getNodes } = useReactFlow();

  const handleRarrangeLayout = () => {
    emitCustomEvent('groupNode::rearrangeChildren', {
      nodeId: selectedNode.id,
      nodes: getNodes(),
    });

    setTimeout(() => {
      emitCustomEvent('groupNode::adjustChildWidth', {
        node: selectedNode,
      });
    }, 200);
  };

  return (
    <button
      className={styles['rearrange-layout-btn']}
      onClick={handleRarrangeLayout}
    >
      Rearrange Layout
    </button>
  );
};

// Prop types for prop-validation

PropertiesTab.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
  hasPermission: PropTypes.func.isRequired,
};

NodeLabelEditor.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
};

NodePositionEditor.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
  hasPermission: PropTypes.func.isRequired,
};

NodeDimensionEditor.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
  hasPermission: PropTypes.func.isRequired,
};

NodeTypeEditor.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
};

NodeFontSizeEditor.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
};

NodeBackgroundColorEditor.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
};

ParagraphStyleEditor.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
};

ParagraphStyleEditor.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
};

export default PropertiesTab;
