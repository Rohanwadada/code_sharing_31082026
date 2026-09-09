import { useEffect, useState, useMemo, useCallback } from 'react';
import { useStore } from '@xyflow/react';
import { createPortal } from 'react-dom';
import styles from './HelperLines.module.css';

// It denotes the maximum allowable pixel distance between two node edges (or centers) for them to be considered aligned and for a helper line to be rendered
const ALIGN_THRESHOLD = 2;

// Define the padding that should be excluded from alignment calculations
const NODE_PADDING = 2;

/**
 * @component HelperLines
 *
 * This React component renders alignment and spacing guide lines ("helper lines")
 * when a node is being dragged in a flow editor (e.g., React Flow).
 *
 * It compares the position of the dragging node against all other nodes,
 * and calculates the nearest horizontal and vertical alignments within a defined threshold.
 *
 * These guides visually assist with snapping, alignment, and spacing during drag interactions.
 */
const HelperLines = () => {
  // Get nodes and viewport transformation
  const nodes = useStore((state) => state.nodes);
  const viewport = useStore((state) => state.transform);
  // Local state to store calculated alignment/spacing lines
  const [lines, setLines] = useState([]);

  // Determine the currently dragged node (only one should be actively dragging)
  const draggingNode = useMemo(() => nodes.find((n) => n.dragging), [nodes]);

  // Get reference to the canvas/container element used for absolute positioning
  const container = document.querySelector('.react-flow__renderer');

  /**
   * Transforms a coordinate based on the current viewport zoom and pan
   * @param {number} value - The original X or Y coordinate
   * @param {boolean} isX - If true, transforms X; otherwise transforms Y
   * @returns {number} - The transformed coordinate in viewport space
   */
  const transformToViewport = (value, isX = true) => {
    const [x, y, zoom] = viewport;
    return isX ? value * zoom + x : value * zoom + y;
  };

  /**
   * Computes the bounding edges of a node (left, center, right, top, etc.)
   * @param {object} node - Node object with position and dimensions
   * @returns {object} - Object containing named edge positions
   */
  const getNodeEdges = (node) => {
    const { x, y } = node.position;
    const w = node.measured?.width || node.width || 0;
    const h = node.measured?.height || node.height || 0;

    // Calculate content area by excluding padding
    const contentX = x + NODE_PADDING;
    const contentY = y + NODE_PADDING;
    const contentWidth = w - NODE_PADDING * 2;
    const contentHeight = h - NODE_PADDING * 2;

    return {
      left: contentX,
      centerX: contentX + contentWidth / 2,
      right: contentX + contentWidth,
      top: contentY,
      centerY: contentY + contentHeight / 2,
      bottom: contentY + contentHeight,
    };
  };

  /**
   * Calculates helper lines based on alignment and spacing between the dragging node and others.
   * @param {object} draggingNode - Currently dragged node
   * @param {Array} allNodes - List of all nodes in the canvas
   * @returns {Array} lines - An array of visual line descriptors
   */
  const calculateHelperLines = (draggingNode, allNodes) => {
    const draggingEdges = getNodeEdges(draggingNode);
    const alignments = {
      vertical: new Map(),
      horizontal: new Map(),
    };

    // Find all potential alignments with their distances
    for (const node of allNodes) {
      if (node.id === draggingNode.id || node.dragging || node?.parentId)
        continue;

      const otherEdges = getNodeEdges(node);

      // Check X-axis alignments (vertical lines)
      ['left', 'centerX', 'right'].forEach((dKey) => {
        const dVal = draggingEdges[dKey];

        ['left', 'centerX', 'right'].forEach((oKey) => {
          const oVal = otherEdges[oKey];
          const distance = Math.abs(dVal - oVal);

          if (distance <= ALIGN_THRESHOLD) {
            const key = `${oVal}`;
            const existing = alignments.vertical.get(key);

            if (!existing || distance < existing.distance) {
              alignments.vertical.set(key, {
                value: oVal,
                distance,
                nodeId: node.id,
                alignmentType: `${dKey}-${oKey}`,
                draggingEdge: dKey,
                targetEdge: oKey,
                // Calculate spacing between nodes
                spacing: Math.abs(
                  (dKey === 'centerX'
                    ? draggingEdges.centerY
                    : dKey === 'left'
                      ? draggingEdges.left
                      : draggingEdges.right) -
                    (oKey === 'centerX'
                      ? otherEdges.centerY
                      : oKey === 'left'
                        ? otherEdges.left
                        : otherEdges.right),
                ),
              });
            }
          }
        });
      });

      // Check Y-axis alignments (horizontal lines)
      ['top', 'centerY', 'bottom'].forEach((dKey) => {
        const dVal = draggingEdges[dKey];

        ['top', 'centerY', 'bottom'].forEach((oKey) => {
          const oVal = otherEdges[oKey];
          const distance = Math.abs(dVal - oVal);

          if (distance <= ALIGN_THRESHOLD) {
            const key = `${oVal}`;
            const existing = alignments.horizontal.get(key);

            if (!existing || distance < existing.distance) {
              alignments.horizontal.set(key, {
                value: oVal,
                distance,
                nodeId: node.id,
                alignmentType: `${dKey}-${oKey}`,
                draggingEdge: dKey,
                targetEdge: oKey,
                // Calculate spacing between nodes
                spacing: Math.abs(
                  (dKey === 'centerY'
                    ? draggingEdges.centerX
                    : dKey === 'top'
                      ? draggingEdges.top
                      : draggingEdges.bottom) -
                    (oKey === 'centerY'
                      ? otherEdges.centerX
                      : oKey === 'top'
                        ? otherEdges.top
                        : otherEdges.bottom),
                ),
              });
            }
          }
        });
      });
    }

    // Convert to line objects with enhanced info
    const lines = [];

    // Add vertical lines (limit to 2 closest)
    const verticalAlignments = Array.from(alignments.vertical.values())
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);

    verticalAlignments.forEach((alignment) => {
      lines.push({
        x: alignment.value,
        distance: Math.round(alignment.distance),
        spacing: Math.round(alignment.spacing),
        isCenterLine:
          alignment.draggingEdge === 'centerX' ||
          alignment.targetEdge === 'centerX',
        alignmentType: alignment.alignmentType,
        nodeId: alignment.nodeId,
      });
    });

    // Add horizontal lines (limit to 2 closest)
    const horizontalAlignments = Array.from(alignments.horizontal.values())
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);

    horizontalAlignments.forEach((alignment) => {
      lines.push({
        y: alignment.value,
        distance: Math.round(alignment.distance),
        spacing: Math.round(alignment.spacing),
        isCenterLine:
          alignment.draggingEdge === 'centerY' ||
          alignment.targetEdge === 'centerY',
        alignmentType: alignment.alignmentType,
        nodeId: alignment.nodeId,
      });
    });

    return lines;
  };

  // Watch for drag activity to recalculate alignment lines
  useEffect(() => {
    if (!draggingNode) {
      setLines([]);
      return;
    }

    const newLines = calculateHelperLines(draggingNode, nodes);
    setLines(newLines);
  }, [draggingNode]);

  // Early return if no container or no lines or no dragging node
  if (!container || !draggingNode || lines.length === 0) return null;

  return (
    <div className={styles.helperOverlay}>
      {lines.map((line, index) =>
        line.x !== undefined ? (
          <div key={`vertical-${line.x}-${index}`}>
            {/* Vertical line */}
            <div
              className={`${styles.verticalLine} ${line.isCenterLine ? styles.dashedLine : ''}`}
              style={{ left: `${transformToViewport(line.x, true)}px` }}
            />
            {/* Distance label for vertical line */}
            {draggingNode && (
              <>
                {/* <div
                  className={styles.distanceLabel}
                  style={{
                    left: `${transformToViewport(line.x, true) + 8}px`,
                    top: `${transformToViewport(draggingNode.position.y, false) - 20}px`,
                  }}
                >
                  {line.distance > 0 ? `${line.distance}px` : 'aligned'}
                </div> */}
                {/* Spacing label */}
                {/* <div
                  className={styles.spacingLabel}
                  style={{ 
                    left: `${transformToViewport(line.x, true) + 8}px`,
                    top: `${transformToViewport(draggingNode.position.y, false) + 20}px`
                  }}
                >
                  gap: {line.spacing}px
                </div> */}
              </>
            )}
          </div>
        ) : (
          <div key={`horizontal-${line.y}-${index}`}>
            {/* Horizontal line */}
            <div
              className={`${styles.horizontalLine} ${line.isCenterLine ? styles.dashedLine : ''}`}
              style={{ top: `${transformToViewport(line.y, false)}px` }}
            />
            {/* Distance label for horizontal line */}
            {draggingNode && (
              <>
                {/* <div
                  className={styles.distanceLabel}
                  style={{
                    left: `${transformToViewport(draggingNode.position.x, true) - 50}px`,
                    top: `${transformToViewport(line.y, false) + 8}px`,
                  }}
                >
                  {line.distance > 0 ? `${line.distance}px` : 'aligned'}
                </div> */}
                {/* Spacing label */}
                {/* <div
                  className={styles.spacingLabel}
                  style={{ 
                    left: `${transformToViewport(draggingNode.position.x, true) + 20}px`,
                    top: `${transformToViewport(line.y, false) + 8}px`
                  }}
                >
                  gap: {line.spacing}px
                </div> */}
              </>
            )}
          </div>
        ),
      )}
    </div>
  );
};

export default HelperLines;
