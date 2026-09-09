// Description: This file contains functions to generate an SVG representation of a roadmap graph. Not user right now but needed later for debugging.

export const generateSvg = (
  roadmap_graph,
  targetWidth = 800,
  targetHeight = 600,
  padding = 40,
) => {
  const { minX, minY, scale, graphWidth, graphHeight } =
    getInitialScalingValues(
      roadmap_graph?.nodes,
      targetWidth,
      targetHeight,
      padding,
    );
  let edgeSVG = '';
  let nodeSVG = '';

  roadmap_graph.edges.forEach((edge) => {
    const sourceNode = roadmap_graph.nodes.find(
      (node) => node.id === edge.source,
    );
    const targetNode = roadmap_graph.nodes.find(
      (node) => node.id === edge.target,
    );

    if (sourceNode && targetNode) {
      const { sourceX, sourceY } = getEdgeSourcePoints(
        sourceNode,
        edge.sourceHandle,
      );
      const { targetX, targetY } = getEdgeTargetPoints(
        targetNode,
        edge.targetHandle,
      );

      const scaledSource = transformCoordinates(
        sourceX,
        sourceY,
        minX,
        minY,
        targetWidth,
        targetHeight,
        scale,
        graphWidth,
        graphHeight,
      );
      const scaledTarget = transformCoordinates(
        targetX,
        targetY,
        minX,
        minY,
        targetWidth,
        targetHeight,
        scale,
        graphWidth,
        graphHeight,
      );

      const { controlX1, controlY1, controlX2, controlY2 } =
        calculateControlPoints(
          scaledSource.x,
          scaledSource.y,
          scaledTarget.x,
          scaledTarget.y,
          edge.sourceHandle,
          edge.targetHandle,
        );

      edgeSVG += `
          <path 
            d="M ${scaledSource.x},${scaledSource.y} 
               C ${controlX1},${controlY1} 
                 ${controlX2},${controlY2} 
                 ${scaledTarget.x},${scaledTarget.y}"
            fill="none" 
            stroke="#2b78e4" 
            stroke-width="${2 * scale}" 
            data-edge-id="${edge.id}" 
            stroke-linecap="round" 
            stroke-linejoin="round"
          />
        `;
    }
  });

  // Generate nodes with transformed coordinates
  roadmap_graph.nodes.forEach((node) => {
    const pos = transformCoordinates(
      node.position.x,
      node.position.y,
      minX,
      minY,
      targetWidth,
      targetHeight,
      scale,
      graphWidth,
      graphHeight,
    );
    const scaledWidth = node.measured.width * scale;
    const scaledHeight = node.measured.height * scale;

    nodeSVG += `
        <g data-node-id="${node.id}" data-type="${node.type}" data-title="${
          node.data.label
        }">
          <rect 
            x="${pos.x}" 
            y="${pos.y}" 
            width="${scaledWidth}" 
            height="${scaledHeight}" 
            rx="${5 * scale}" 
            fill="#ffe599" 
            stroke="black" 
            stroke-width="${2.7 * scale}"
            style="--hover-color: #f3c950"
          />
          <text 
            x="${pos.x + scaledWidth / 2}" 
            y="${pos.y + scaledHeight / 2}" 
            text-anchor="middle" 
            dominant-baseline="middle" 
            font-size="${25 * scale}" 
            font-family="sans-serif"
            fill="#000000"
          >
            <tspan>${node.data.label}</tspan>
          </text>
        </g>
      `;
  });

  // Generate final SVG with defined viewbox
  const svgContent = `
      <svg width="100%" height="100%" viewBox="0 0 ${targetWidth} ${targetHeight}" xmlns="http://www.w3.org/2000/svg">
        <g class="edges">
          ${edgeSVG}
        </g>
        <g class="nodes">
          ${nodeSVG}
        </g>
      </svg>
    `;

  return svgContent;
};

export const getEdgeSourcePoints = (sourceNode, sourceHandle) => {
  const sourceNodePositionX = sourceNode.position.x;
  const sourceNodePositionY = sourceNode.position.y;
  let sourceX = 0;
  let sourceY = 0;
  switch (sourceHandle?.[0]) {
    case 't':
      sourceX = sourceNodePositionX + sourceNode.measured.width / 2;
      sourceY = sourceNodePositionY;
      break;
    case 'l':
      sourceX = sourceNodePositionX;
      sourceY = sourceNodePositionY + sourceNode.measured.height / 2;
      break;
    case 'r':
      sourceX = sourceNodePositionX + sourceNode.measured.width;
      sourceY = sourceNodePositionY + sourceNode.measured.height / 2;
      break;
    case 'b':
      sourceX = sourceNodePositionX + sourceNode.measured.width / 2;
      sourceY = sourceNodePositionY + sourceNode.measured.height;
      break;
  }
  return { sourceX, sourceY };
};

export const getEdgeTargetPoints = (targetNode, targetHandle) => {
  const targetNodePositionX = targetNode.position.x;
  const targetNodePositionY = targetNode.position.y;
  let targetX = 0;
  let targetY = 0;

  switch (targetHandle?.[0]) {
    case 't':
      targetX = targetNodePositionX + targetNode.measured.width / 2;
      targetY = targetNodePositionY;
      break;
    case 'l':
      targetX = targetNodePositionX;
      targetY = targetNodePositionY + targetNode.measured.height / 2;
      break;
    case 'r':
      targetX = targetNodePositionX + targetNode.measured.width;
      targetY = targetNodePositionY + targetNode.measured.height / 2;
      break;
    case 'b':
      targetX = targetNodePositionX + targetNode.measured.width / 2;
      targetY = targetNodePositionY + targetNode.measured.height;
      break;
  }
  return { targetX, targetY };
};

export const calculateControlPoints = (
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandle,
  targetHandle,
) => {
  // Calculate distances
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  let controlX1, controlY1, controlX2, controlY2;

  // Handle combinations for source and target
  switch (sourceHandle?.[0]) {
    case 't': // Top handle
      switch (targetHandle?.[0]) {
        case 't': // Top to Top
          controlX1 = sourceX;
          controlY1 = sourceY - distance * 0.2;
          controlX2 = targetX;
          controlY2 = targetY - distance * 0.2;
          break;
        case 'b': // Top to Bottom
          controlX1 = sourceX;
          controlY1 = sourceY - distance * 0.2;
          controlX2 = targetX;
          controlY2 = targetY + distance * 0.2;
          break;
        case 'l': // Top to Left
        case 'r': // Top to Right
          controlX1 = sourceX;
          controlY1 = sourceY - distance * 0.2;
          controlX2 =
            targetX +
            (targetHandle[0] === 'l' ? -distance * 0.2 : distance * 0.2);
          controlY2 = targetY;
          break;
      }
      break;

    case 'b': // Bottom handle
      switch (targetHandle?.[0]) {
        case 't': // Bottom to Top
          controlX1 = sourceX;
          controlY1 = sourceY + distance * 0.2;
          controlX2 = targetX;
          controlY2 = targetY - distance * 0.2;
          break;
        case 'b': // Bottom to Bottom
          controlX1 = sourceX;
          controlY1 = sourceY + distance * 0.2;
          controlX2 = targetX;
          controlY2 = targetY + distance * 0.2;
          break;
        case 'l': // Bottom to Left
        case 'r': // Bottom to Right
          controlX1 = sourceX;
          controlY1 = sourceY + distance * 0.2;
          controlX2 =
            targetX +
            (targetHandle[0] === 'l' ? -distance * 0.2 : distance * 0.2);
          controlY2 = targetY;
          break;
      }
      break;

    case 'l': // Left handle
      switch (targetHandle?.[0]) {
        case 't': // Left to Top
        case 'b': // Left to Bottom
          controlX1 = sourceX - distance * 0.2;
          controlY1 = sourceY;
          controlX2 = targetX;
          controlY2 =
            targetY +
            (targetHandle[0] === 't' ? -distance * 0.2 : distance * 0.2);
          break;
        case 'l': // Left to Left
          controlX1 = sourceX - distance * 0.2;
          controlY1 = sourceY;
          controlX2 = targetX - distance * 0.2;
          controlY2 = targetY;
          break;
        case 'r': // Left to Right
          controlX1 = sourceX - distance * 0.2;
          controlY1 = sourceY;
          controlX2 = targetX + distance * 0.2;
          controlY2 = targetY;
          break;
      }
      break;

    case 'r': // Right handle
      switch (targetHandle?.[0]) {
        case 't': // Right to Top
        case 'b': // Right to Bottom
          controlX1 = sourceX + distance * 0.2;
          controlY1 = sourceY;
          controlX2 = targetX;
          controlY2 =
            targetY +
            (targetHandle[0] === 't' ? -distance * 0.2 : distance * 0.2);
          break;
        case 'l': // Right to Left
          controlX1 = sourceX + distance * 0.2;
          controlY1 = sourceY;
          controlX2 = targetX - distance * 0.2;
          controlY2 = targetY;
          break;
        case 'r': // Right to Right
          controlX1 = sourceX + distance * 0.2;
          controlY1 = sourceY;
          controlX2 = targetX + distance * 0.2;
          controlY2 = targetY;
          break;
      }
      break;
  }

  return { controlX1, controlY1, controlX2, controlY2 };
};

export const getInitialScalingValues = (
  nodes,
  targetWidth,
  targetHeight,
  padding,
) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Calculate bounds including node dimensions
  nodes.forEach((node) => {
    if (node.parentId === undefined) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + node.measured.width);
      maxY = Math.max(maxY, node.position.y + node.measured.height);
    }
  });

  // Add padding to bounds
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  // Calculate the graph dimensions
  const graphWidth = maxX - minX;
  const graphHeight = maxY - minY;

  // Calculate scale factors to fit the target dimensions
  const scaleX = targetWidth / graphWidth;
  const scaleY = targetHeight / graphHeight;

  // Use the smaller scale factor to maintain aspect ratio
  const scale = Math.min(scaleX, scaleY);
  return { minX, minY, scale, graphWidth, graphHeight };
};

export const transformCoordinates = (
  x,
  y,
  minX,
  minY,
  targetWidth,
  targetHeight,
  scale,
  graphWidth,
  graphHeight,
) => {
  // First normalize to origin
  const normalizedX = x - minX;
  const normalizedY = y - minY;

  // Then scale and center within target viewport
  const scaledX = normalizedX * scale;
  const scaledY = normalizedY * scale;

  // Center the graph if there's extra space
  const extraWidth = targetWidth - graphWidth * scale;
  const extraHeight = targetHeight - graphHeight * scale;

  return {
    x: scaledX + extraWidth / 2,
    y: scaledY + extraHeight / 2,
  };
};
