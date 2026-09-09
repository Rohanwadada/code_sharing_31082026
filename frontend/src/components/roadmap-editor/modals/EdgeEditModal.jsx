import { useContext, useEffect, useState } from 'react';
import styles from './EdgeEditModal.module.css';
import React from 'react';
import PropTypes from 'prop-types';

import plainArrow from '@/assets/edge-edit-modal/pain-arrow.svg';
import roundedArrow from '@/assets/edge-edit-modal/rounded-arrow.svg';
import filledArrow from '@/assets/edge-edit-modal/filled-arrow.svg';
import circularArrow from '@/assets/edge-edit-modal/circular-arrow.svg';

import plainLine from '@/assets/edge-edit-modal/plain-line.svg';
import strokedLine from '@/assets/edge-edit-modal/dashed-line.svg';

import straightEdgeIcon from '@/assets/edge-edit-modal/straight-edge-icon.svg';
import stepEdgeIcon from '@/assets/edge-edit-modal/step-edge-icon.svg';
import smoothStepEdgeIcon from '@/assets/edge-edit-modal/smooth-step-edge-icon.svg';
import bezierEdgeIcon from '@/assets/edge-edit-modal/bezier-edge-icon.svg';

import { useReactFlow } from '@xyflow/react';
import { Tooltip } from 'react-tooltip';
import { RoadmapContext } from '@/context/RoadmapContext';
import { USER_ROADMAP_HISTORY_ACTIONS } from '@/utils/constants';
import { motion } from 'framer-motion';
import Image from 'next/image';

const EDGE_STROKES = [
  {
    name: 'plain',
    icon: plainLine,
    value: '0',
    toolTip: {
      content: 'Plain Edge',
      place: 'top',
    },
  },
  {
    name: 'dashed',
    icon: strokedLine,
    value: '5 5',
    toolTip: {
      content: 'Dashed Edge',
      place: 'top',
    },
  },
];

const ARROW_STYLES = [
  {
    name: 'no-marker',
    icon: null,
    type: 'custom-marker',
    toolTip: {
      content: 'No Marker',
      place: 'top',
    },
  },
  {
    name: 'arrow-marker',
    icon: plainArrow,
    type: 'custom-marker',
    toolTip: {
      content: 'Default Arrow',
      place: 'top',
    },
  },
  {
    name: 'closed-arrow-marker',
    icon: roundedArrow,
    type: 'custom-marker',
    toolTip: {
      content: 'Closed Arrow',
      place: 'top',
    },
  },
  {
    name: 'filled-arrow-marker',
    icon: filledArrow,
    type: 'custom-marker',
    toolTip: {
      content: 'Filled Arrow',
      place: 'top',
    },
  },
  {
    name: 'circular-marker',
    icon: circularArrow,
    type: 'custom-marker',
    toolTip: {
      content: 'Circular Arrow',
      place: 'top',
    },
  },
];

const EDGE_TYPES = [
  {
    name: 'Straight',
    icon: straightEdgeIcon,
    type: 'straight',
  },
  {
    name: 'Step',
    icon: stepEdgeIcon,
    type: 'step',
  },
  {
    name: 'Smooth Step',
    icon: smoothStepEdgeIcon,
    type: 'smoothstep',
  },
  {
    name: 'Bezier',
    icon: bezierEdgeIcon,
    type: 'bezier',
  },
];

// Animation Variants
const modalVariants = {
  hidden: {
    x: '100%',
    transition: {
      type: 'tween',
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
  visible: {
    x: 0,
    transition: {
      type: 'tween',
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

/**
 * EdgeEditModal Component
 *
 * This component provides a UI for editing edge styles in a roadmap visualization.
 * Users can modify edge color, stroke style, and arrow style. Updates are reflected
 * in the React Flow graph in real-time.
 *
 * Props:
 * @param {string} roadmapId - The ID of the roadmap to which the edge belongs.
 * @param {object} selectedEdge - The currently selected edge to be edited.
 * @param {function} setSelectedEdges - Function to update the selected edge state.
 * @param {array} edges - List of all edges in the graph.
 * @param {function} setEdges - Function to update the edges state.
 */
const EdgeEditModal = ({
  roadmapId,
  selectedEdge,
  setSelectedEdges,
  edges,
  setEdges,
}) => {
  const { updateEdge, getNodes, getEdges } = useReactFlow();
  const { pushToHistory } = useContext(RoadmapContext);

  const [tempColor, setTempColor] = useState(
    selectedEdge?.style?.stroke || '#000',
  );
  const [oldEdgeStrokeColor, setOldEdgeStrokeColor] = useState(null);

  const [strokeWidthInput, setStrokeWidthInput] = useState(
    selectedEdge?.style?.strokeWidth?.toString() || '1',
  );
  const [oldEdgeStrokeWidth, setOldEdgeStrokeWidth] = useState(null);

  const handleEdgeColorPickerFcous = () => {
    setOldEdgeStrokeColor(selectedEdge?.style?.stroke || '#000000');
  };

  /**
   * Handles edge color change.
   * Updates the edge stroke color in the state and UI.
   */
  const handleEdgePathColorChange = (event) => {
    const newColor = event.target.value;
    setTempColor(newColor);

    // Live preview without history
    const previewEdge = {
      ...selectedEdge,
      style: { ...selectedEdge.style, stroke: newColor },
    };

    setSelectedEdges([previewEdge]);
    updateEdge(selectedEdge.id, previewEdge, { replace: true });
  };

  // Commit to history when color picker closes
  const handleColorPickerClose = () => {
    // const oldEdgeStrokeColor = selectedEdge?.style?.stroke || '#000000';
    if (oldEdgeStrokeColor === tempColor) return;
    const finalEdge = {
      ...selectedEdge,
      style: { ...selectedEdge.style, stroke: tempColor },
    };

    setSelectedEdges([finalEdge]);
    updateEdge(selectedEdge.id, finalEdge, { replace: true });

    const finalNodes = getNodes();
    const finalEdges = getEdges().map((e) =>
      e.id === finalEdge.id ? finalEdge : e,
    );
    pushToHistory(
      finalNodes,
      finalEdges,
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_EDGE.name,
      {
        message: 'Changed the edge color',
        type: 'stroke_color',
        edge_id: [selectedEdge?.id],
        from: oldEdgeStrokeColor,
        to: tempColor,
      },
    );
  };

  /**
   * Handles arrow style change.
   * Updates the markerEnd property to apply different arrowhead styles.
   */
  const handleChangeStrokeStyle = (strokeData) => {
    const oldStrokeStyle = selectedEdge?.style?.strokeDasharray || 'plain';
    let newStrokeStyle = strokeData.value;
    if (selectedEdge?.style?.strokeDasharray !== newStrokeStyle) {
      const updatedEdge = {
        ...selectedEdge,
        style: { ...selectedEdge.style, strokeDasharray: newStrokeStyle },
      };
      setSelectedEdges([updatedEdge]);
      updateEdge(selectedEdge.id, updatedEdge, { replace: true });

      // add to history
      const finalNodes = getNodes();
      const finalEdges = getEdges().map((e) =>
        e.id === updatedEdge.id ? updatedEdge : e,
      );
      pushToHistory(
        finalNodes,
        finalEdges,
        USER_ROADMAP_HISTORY_ACTIONS.UPDATE_EDGE.name,
        {
          message: 'Changed the edge style',
          type: 'stroke_style',
          edge_id: [selectedEdge?.id],
          from: oldStrokeStyle,
          to: newStrokeStyle,
        },
      );
      setOldEdgeStrokeColor(null);
    }
  };

  const handleChangeArrowStyle = (markerData) => {
    const oldMarkerName = selectedEdge?.style?.markerEnd || 'no-marker';
    const markerType = markerData.type;
    const markerName = markerData.name;
    let updatedEdge = null;
    if (markerType === 'default-marker') {
      updatedEdge = {
        ...selectedEdge,
        markerEnd:
          typeof selectedEdge.markerEnd !== 'string'
            ? { ...selectedEdge.markerEnd, type: markerName, color: '#000000' }
            : { type: markerName, color: '#000000' },
      };
      setSelectedEdges([updatedEdge]);
      updateEdge(selectedEdge.id, updatedEdge, { replace: true });
    } else if (markerType === 'custom-marker') {
      if (markerName === 'no-marker') {
        updatedEdge = {
          ...selectedEdge,
          markerEnd: null,
        };
      } else {
        updatedEdge = { ...selectedEdge, markerEnd: markerName };
      }
      setSelectedEdges([updatedEdge]);
      updateEdge(selectedEdge.id, updatedEdge, { replace: true });

      // add to history
      const finalNodes = getNodes();
      const finalEdges = getEdges().map((e) =>
        e.id === updatedEdge.id ? updatedEdge : e,
      );
      pushToHistory(
        finalNodes,
        finalEdges,
        USER_ROADMAP_HISTORY_ACTIONS.UPDATE_EDGE.name,
        {
          message: 'Changed the edge arrow style',
          type: 'arrow_style',
          edge_id: [selectedEdge?.id],
          from: oldMarkerName,
          to: markerName,
        },
      );
    }
  };
  const handleChangeEdgeType = (edgeType) => {
    const oldEdgeType = selectedEdge?.type || 'step';
    const newEdgeType = edgeType.type;
    let updatedEdge = { ...selectedEdge, type: newEdgeType };

    setSelectedEdges([updatedEdge]);
    updateEdge(selectedEdge.id, updatedEdge, { replace: true });

    // add to history
    const finalNodes = getNodes();
    const finalEdges = getEdges().map((e) =>
      e.id === updatedEdge.id ? updatedEdge : e,
    );
    pushToHistory(
      finalNodes,
      finalEdges,
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_EDGE.name,
      {
        message: 'Changed the edge type',
        type: 'arrow_style',
        edge_id: [selectedEdge?.id],
        from: oldEdgeType,
        to: newEdgeType,
      },
    );
  };

  const handleStrokeWidthInputFocus = () => {
    setOldEdgeStrokeWidth(selectedEdge?.style?.strokeWidth?.toString() || '1');
  };

  const handleChangeStrokeWidth = (value) => {
    const inputVal = value;
    setStrokeWidthInput(inputVal);
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(30, parsed));

      const updatedEdge = {
        ...selectedEdge,
        style: { ...selectedEdge?.style, strokeWidth: clamped },
      };

      setSelectedEdges([updatedEdge]);
      updateEdge(selectedEdge.id, updatedEdge, { replace: true });
      return updatedEdge;
    }
  };

  const handleStrokeWidthInputBlur = () => {
    let value = parseFloat(strokeWidthInput);
    if (isNaN(value)) value = 1;
    const clamped = Math.max(1, Math.min(30, value));
    if (oldEdgeStrokeWidth === clamped.toString()) return;
    setStrokeWidthInput(clamped.toString());
    const updatedEdge = handleChangeStrokeWidth(clamped);
    // Update history
    const finalNodes = getNodes();
    const finalEdges = getEdges().map((e) =>
      e.id === updatedEdge.id ? updatedEdge : e,
    );
    pushToHistory(
      finalNodes,
      finalEdges,
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_EDGE.name,
      {
        message: 'Changed the edge stroke width',
        type: 'arrow_style',
        edge_id: [selectedEdge?.id],
        from: oldEdgeStrokeWidth,
        to: clamped.toString(),
      },
    );
    setOldEdgeStrokeWidth(null);
  };

  useEffect(() => {
    setStrokeWidthInput(selectedEdge?.style?.strokeWidth?.toString() || '1');
  }, [selectedEdge]);

  return (
    <motion.div
      className={styles['edge-edit-ct']}
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      key="edge-modal"
    >
      <div className={styles['edge-edit-header']}>EDGE STYLE</div>
      <div className={styles['edge-edit-tool-ct']}>
        <div className={styles['edge-edit-tool']}>
          <div className={styles['tool-name']}>Color</div>
          <div className={styles['tool-content']}>
            <input
              value={tempColor}
              type="color"
              className={styles['eet-color-input']}
              onFocus={handleEdgeColorPickerFcous}
              onChange={handleEdgePathColorChange}
              onBlur={handleColorPickerClose}
            />
            <input
              value={tempColor}
              type="text"
              className={styles['eet-color-hex-input']}
              readOnly
            />
          </div>
        </div>
        <div className={styles['edge-edit-tool']}>
          <div className={styles['tool-name']}>Stroke Style</div>
          <div className={styles['ss-tool-content']}>
            {EDGE_STROKES.map((stroke, index) => (
              <div
                key={index}
                className={`${styles['edge-stroke']} ${selectedEdge?.style?.strokeDasharray === stroke.value && styles['selected']}`}
                onClick={() => handleChangeStrokeStyle(stroke)}
                data-tooltip-id="edge-edit-modal-tooltip"
                data-tooltip-content={stroke.toolTip.content}
                data-tooltip-place={stroke.toolTip.place}
              >
                <Image src={stroke.icon} alt={`${stroke.name} stroke`} />
              </div>
            ))}
          </div>
        </div>
        <div className={styles['edge-edit-tool']}>
          <div className={styles['tool-name']}>Arrow Style</div>
          <div className={styles['as-tool-content']}>
            {ARROW_STYLES.map((arrow, index) => {
              const isSelected =
                (!selectedEdge?.markerEnd && index === 0) ||
                selectedEdge?.markerEnd === arrow.name;
              return (
                <div
                  key={index}
                  className={`${styles['edge-arrow']} ${isSelected && styles['selected']}`}
                  onClick={() => handleChangeArrowStyle(arrow)}
                  data-tooltip-id="edge-edit-modal-tooltip"
                  data-tooltip-content={arrow.toolTip.content}
                  data-tooltip-place={arrow.toolTip.place}
                >
                  {arrow.icon !== null && (
                    <Image src={arrow.icon} alt={`${arrow.name} stroke`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles['edge-edit-tool']}>
          <div className={styles['tool-name']}>Edge Type</div>
          <div className={styles['as-tool-content']}>
            {EDGE_TYPES.map((type, index) => {
              const isSelected =
                (!selectedEdge?.type && index === 0) ||
                selectedEdge?.type === type.type;
              return (
                <div
                  key={index}
                  className={`${styles['edge-type']} ${isSelected && styles['selected']}`}
                  onClick={() => handleChangeEdgeType(type)}
                  data-tooltip-id="edge-edit-modal-tooltip"
                  data-tooltip-content={type.name}
                  data-tooltip-place={'top'}
                >
                  {type.icon !== null && (
                    <Image src={type.icon} alt={`${type.name} edge`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles['edge-edit-tool']}>
          <div className={styles['tool-name']}>Stroke Width</div>
          <div className={styles['as-tool-content']}>
            <input
              type="number"
              className={styles['edge-stroke-width-input']}
              value={strokeWidthInput}
              onFocus={handleStrokeWidthInputFocus}
              onChange={(e) => handleChangeStrokeWidth(e.target.value)}
              onBlur={handleStrokeWidthInputBlur}
            />
          </div>
        </div>
      </div>

      <Tooltip
        id="edge-edit-modal-tooltip"
        style={{
          backgroundColor: '#000000',
          color: '#FFFFFF',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '12px',
          fontWeight: '600',
          textAlign: 'left',
          // borderRadius: '20px',
          padding: '5px',
          zIndex: 1000,
          // width: "200px"
        }}
        noArrow
        delayShow={100}
        className={styles['custom-tooltip-animation']}
      />
    </motion.div>
  );
};

EdgeEditModal.propTypes = {
  roadmapId: PropTypes.string.isRequired,
  selectedEdge: PropTypes.object.isRequired,
  setSelectedEdges: PropTypes.func.isRequired,
  edges: PropTypes.array.isRequired,
  setEdges: PropTypes.func.isRequired,
};

export default EdgeEditModal;
