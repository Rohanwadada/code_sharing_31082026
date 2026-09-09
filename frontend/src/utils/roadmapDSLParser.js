import { createNewNode } from './helper.js';

const getNodeAdditionalStyles = (type) => {
  if (['subtopic', 'assignmentNode'].includes(type)) {
    return { style: { width: 350, height: 100 } };
  } else if (type === 'subtopicGroup') {
    return { style: { width: 750, height: 150 } };
  } else if (['topic', 'topicGroup', 'learningAnchor'].includes(type)) {
    return { style: { width: 550, height: 150 } };
  } else if (type === 'title') {
    return {
      style: { width: 850, height: 150 },
      measured: { width: 850, height: 150 },
    };
  }
  return { style: { width: 350, height: 150 } };
};

const getNodeKnowledgeLevel = (levelValue) => {
  if (levelValue === '1') return 'must_know';
  else if (levelValue === '2') return 'good_to_know';
  else if (levelValue === '3') return 'suggested_learning';
  return 'must_know';
};

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

const addToMap = (map, key, value) => {
  const existing = map.get(key) || [];
  existing.push(value);
  map.set(key, existing);
};

const parseSemanticNode = (line) => {
  const match = line.match(/^@([rtm])\.([a-zA-Z_]+)(?::\s*(.+))?$/);

  if (!match) return null;

  return {
    scope: match[1], // r | t | m
    type: match[2], // assessment | project | ...
    label: match[3] || match[2],
  };
};

export const getReactflowDiagramFromRoadmapDSL = (dsl) => {
  const lines = dsl.split('\n').filter(Boolean);

  const nodes = [];
  const edges = [];

  let currentTitleNode = null;
  let currentTopicNode = null;
  let currentSubtopicGroupNode = null;
  const spineNodes = [];
  let topicSubtopicGroupMap = new Map();

  let yOffset = 0;
  let yGap = 800;

  let moduleNumber = 1;

  // node creation
  for (const line of lines) {
    if (line.startsWith('# ')) {
      const label = line.replace('# ', '').trim();
      const nodePosition = { x: (550 - 850) / 2, y: yOffset };
      const additionalNodeStyle = getNodeAdditionalStyles('title');
      let newTitleNode = createNewNode(
        'title',
        '',
        nodePosition,
        false,
        true,
        false,
        additionalNodeStyle,
      );
      newTitleNode.data.label = label;

      // update the default style for ai roadmap only. so we are not directly changing the default of `title` node as this will effect the nodes in editing canvas
      const newStyles = {
        fontSize: '44px',
        color: '#ffffff',
        backgroundColor: '#cd0100',
      };
      newTitleNode = {
        ...newTitleNode,
        data: {
          ...newTitleNode.data,
          style: { ...newTitleNode.style, ...newStyles },
        },
      };

      currentTitleNode = newTitleNode;

      // changed the gap from 800 -> 600 to reduce the gap between title and first topic node
      yOffset += 600;
      nodes.push(newTitleNode);
    } else if (line.startsWith('## ')) {
      const label = line.replace('## ', '').trim();
      const nodePosition = { x: 0, y: yOffset };
      console.log("[DEBUG]: new topicGroup node position: ", nodePosition)
      const additionalNodeStyle = getNodeAdditionalStyles('topic');
      const newTopicNode = createNewNode(
        'topicGroup',
        '',
        nodePosition,
        false,
        true,
        false,
        additionalNodeStyle,
      );
      newTopicNode.data.label = label;
      currentTopicNode = newTopicNode;
      spineNodes.push(newTopicNode);

      console.log("[DEBUG]: Created topic group: ", yOffset,  " ", newTopicNode )

      yOffset += yGap;
      nodes.push(newTopicNode);
    } else if (line.startsWith('### ')) {
      const label = line.replace('### ', '').trim();
      const nodePosition = { x: 0, y: currentTopicNode.position.y };
      const additionalNodeStyle = getNodeAdditionalStyles('subtopicGroup');
      const newSubtopicGroupNode = createNewNode(
        'subtopicGroup',
        '',
        nodePosition,
        false,
        true,
        false,
        additionalNodeStyle,
      );
      newSubtopicGroupNode.data.label = `${moduleNumber}. ${label}`;
      currentSubtopicGroupNode = newSubtopicGroupNode;
      nodes.push(newSubtopicGroupNode);
      addToMap(
        topicSubtopicGroupMap,
        currentTopicNode.id,
        newSubtopicGroupNode.id,
      );
      moduleNumber++;
    } else if (line.startsWith('- ')) {
      const match = line
        .replace('- ', '')
        .trim()
        .match(/^(.+?)\s*\[(\d+)\]\s*$/);
      const [, label, level] = match;
      const nodePosition = { x: 0, y: 0 };
      const additionalNodeStyle = getNodeAdditionalStyles('subtopic');
      let newSubtopicNode = createNewNode(
        'subtopic',
        '',
        nodePosition,
        false,
        true,
        false,
        additionalNodeStyle,
      );

      const knLevel = getNodeKnowledgeLevel(level);
      const knStyles = getStylesByKNLType(knLevel);
      newSubtopicNode = {
        ...newSubtopicNode,
        data: {
          ...newSubtopicNode.data,
          label: label,
          knl_type: knLevel,
          style: { ...newSubtopicNode?.data?.style, ...knStyles },
        },
        parentId: currentSubtopicGroupNode.id,
        extent: 'parent',
        connectable: true,
        draggable: true,
        position: {
          ...newSubtopicNode.position,
          x: currentSubtopicGroupNode.style.width * 0.05,
        },
        style: { width: currentSubtopicGroupNode.style.width * 0.9 },
      };

      // newSubtopicNode.data.label = label;
      // newSubtopicNode.parentId = currentSubtopicGroupNode.id;
      // newSubtopicNode.extent = 'parent';
      // newSubtopicNode.connectable = true;
      // newSubtopicNode.draggable = true;
      // newSubtopicNode.position = {...newSubtopicNode.position, x: currentSubtopicGroupNode.style.width * 0.05}
      // newSubtopicNode.style = { width: currentSubtopicGroupNode.style.width * 0.9 };
      nodes.push(newSubtopicNode);
    } else if (line.startsWith('@')) {
      const semantic = parseSemanticNode(line);

      const nodeType = getSemanticNodeType(semantic.type);

      const additionalNodeStyle = getNodeAdditionalStyles(nodeType);

      let semanticNode = createNewNode(
        nodeType,
        '',
        { x: 0, y: 0 },
        false,
        true,
        false,
        additionalNodeStyle,
      );

      semanticNode.data.label = semantic.label;
      semanticNode.data.semanticType = semantic.type;
      semanticNode.data.semanticScope = semantic.scope;

      if (semantic.scope === 'm') {
        semanticNode = {
          ...semanticNode,
          parentId: currentSubtopicGroupNode.id,
          extent: 'parent',
          connectable: true,
          draggable: true,
          position: {
            x: currentSubtopicGroupNode.style.width * 0.05,
            y: 0,
          },
          style: {
            width: currentSubtopicGroupNode.style.width * 0.9,
          },
        };
      } else if (semantic.scope === 't') {
        semanticNode = {
          ...semanticNode,
          parentId: currentTopicNode.id,
          extent: 'parent',
          connectable: true,
          draggable: true,
          position: {
            x: 20,
            y: 20,
          },
          style: {
             width: currentTopicNode.style.width * 0.9,
           }
        };
      } else if (semantic.scope === 'r') {
        console.log("[DEBUG]: Semantic spine node: ", semantic.label, " ", yOffset)
        semanticNode.position = {
          x: 0,
          y: yOffset,
        };
        
        semanticNode.style = {
          width: currentTopicNode.style.width,
          height: currentTopicNode.style.height,
        }

        yOffset += yGap;

        spineNodes.push(semanticNode);
      }

      nodes.push(semanticNode);
      continue;
    }
  }
  console.log("[DEBUG]: Spine node after node creation: ",spineNodes )

  // edge creation
  // first create edge between topic and title to first topic
  const orderedSpine = [
    currentTitleNode,
    ...spineNodes.sort((a, b) => a.position.y - b.position.y),
  ];

  console.log("[DEBUG]: Spine node after sorting: ",orderedSpine )
  

  for (let i = 0; i < orderedSpine.length - 1; ++i) {
    const sourceNode = orderedSpine[i];
    const targetNode = orderedSpine[i + 1];
    const sourceHandle = sourceNode.type === 'title' ? 'b' : 'b1';
    const targetHandle = 't2';
    const newEdge = {
      id: `xy_edge_ai__${sourceNode.id}${sourceHandle}__${targetNode.id}${targetHandle}`,
      source: sourceNode.id,
      target: targetNode.id,
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
      type: 'straight',
      style: {
        stroke: '#000000',
        strokeWidth: 2,
        strokeDasharray: '0',
      },
    };
    edges.push(newEdge);
  }

  let topicIdx = 0;
  for (const [key, value] of topicSubtopicGroupMap.entries()) {
    const topicId = key;
    const subtopiGroupIds = value;
    let idx = 0;
    const sourceNode = nodes.find((node) => node.id === topicId);
    while (idx < subtopiGroupIds.length) {
      const targetNode = nodes.find((node) => node.id === subtopiGroupIds[idx]);

      const splitPoint =
        topicIdx % 2 === 0
          ? Math.floor(subtopiGroupIds.length / 2)
          : Math.ceil(subtopiGroupIds.length / 2);

      const isLeft = idx < splitPoint;
      const sourceHandle = isLeft ? 'l1' : 'r1';
      const targetHandle = isLeft ? 'r2' : 'l2';

      if (sourceNode && targetNode) {
        const newEdge = {
          id: `xy_edge_ai__${sourceNode.id}${sourceHandle}__${targetNode.id}${targetHandle}`,
          source: sourceNode.id,
          target: targetNode.id,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
          type: 'default',
          style: {
            stroke: '#000000',
            strokeWidth: 2,
            strokeDasharray: '0',
          },
        };
        edges.push(newEdge);

        // update the position of the subtopicGroup node according to the number of subtopicGroup connected to topic
        targetNode.position = {
          x: isLeft ? -1100 : 900,
          y: sourceNode.position.y,
        };
      }
      idx++;
    }
    topicIdx++;
  }

  // create the `learningAnchor` node and attach it after the last topic node
  const nodePosition = { x: 0, y: yOffset };
  const additionalNodeStyle = getNodeAdditionalStyles('learningAnchor');
  let learningAnchorNode = createNewNode(
    'learningAnchor',
    '',
    nodePosition,
    false,
    true,
    false,
    additionalNodeStyle,
  );
  learningAnchorNode.data.label = 'Keep Learning . . .';

  // update the default style
  const newStyles = {
    fontSize: '44px',
    fontFamily: 'cursive',
    color: '#000000',
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
  };
  learningAnchorNode = {
    ...learningAnchorNode,
    data: {
      ...learningAnchorNode.data,
      style: { ...learningAnchorNode.style, ...newStyles },
    },
  };

  yOffset += yGap;

  nodes.push(learningAnchorNode);
  // add edge
  const sourceNode = spineNodes[spineNodes.length-1];
  const targetNode = learningAnchorNode;
  const sourceHandle = 'b1';
  const targetHandle = 't';
  const newEdge = {
    id: `xy_edge_ai__${sourceNode.id}${sourceHandle}__${targetNode.id}${targetHandle}`,
    source: sourceNode.id,
    target: targetNode.id,
    sourceHandle: sourceHandle,
    targetHandle: targetHandle,
    type: 'straight',
    style: {
      stroke: '#000000',
      strokeWidth: 2,
      strokeDasharray: '15 15',
    },
  };
  edges.push(newEdge);

  const topicNodes = nodes
    .filter(
      (n) =>
        n.type === 'topic' ||
        n.type === 'topicGroup' ||
        n.type === 'learningAnchor' ||
        (n.type === 'assignmentNode' && !n?.parentId)
    )
    .sort((a, b) => a.position.y - b.position.y);

  console.log("[DEBUG]: Spine node after parsing: ",topicNodes )
  // console.log("[DEBUG]: Spine node after parsing_2: ",orderedSpine )

  return { nodes, edges };
};

const getSemanticNodeType = (semanticType) => {
  switch (semanticType) {
    case 'assessment':
      return 'assignmentNode';
    case 'project':
      return 'assignmentNode';
    default:
      return 'assignmentNode';
  }
};
