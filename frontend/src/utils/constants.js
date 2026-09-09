/**
 * @description This file contains constants used throughout the application.
 */

// Font size map for all node types
export const FONT_SIZE_MAP = {
  S: '32px',
  M: '36px',
  L: '38px',
  XL: '40px',
  XXL: '44px',
};

// Default styles of each type of node
export const DEFAULT_STYLES = {
  title: {
    borderColor: 'transparent',
    fontSize: '32px',
    color: '#000000',
    backgroundColor: 'transparent',
  },
  topic: {
    borderColor: '#BEBEBE',
    fontSize: '32px',
    color: '#ffffff',
    // backgroundColor: "#fdff00",
    backgroundColor: '#1849D6',
    // width: "300px"
  },
  subtopic: {
    borderColor: '#000000',
    fontSize: '32px',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  subtopicGroup: {
    borderColor: '#BEBEBE',
    fontSize: '32px',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  topicGroup: {
    borderColor: '#BEBEBE',
    fontSize: '32px',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  paragraph: {
    backgroundColor: '#ffffff',
    borderColor: '#000000',
    fontSize: '32px',
    color: '#000000',
    padding: '10px',
    textAlign: 'center',
    justifyContent: 'center',
  },
  assignmentNode: {
    borderColor: '#000000',
    fontSize: '32px',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  learningAnchor: {
    fontSize: '32px',
    color: '#000000',
    backgroundColor: '#ffffff',
    fontStyle: 'italic',
  },
};

// Default node labels for each type of node
// These labels are used when creating a new node of that type.
export const DEFAULT_NODE_LABELS = {
  title: 'Your Title Here',
  topic: 'Topic Name',
  subtopic: 'Sub-Topic',
  subtopicGroup: 'Heading',
  topicGroup: 'Heading',
  paragraph: 'Your Paragraph here',
  assignmentNode: 'Assignment',
  learningAnchor: 'Keep Learning',
};

// Default header style for group type of nodes
export const DEFAULT_HEADER_STYLES = {
  subtopicGroup: {
    fontSize: '32px',
    color: '#ffffff',
    backgroundColor: '#313030',
  },
  topicGroup: {
    fontSize: '32px',
    color: '#ffffff',
    backgroundColor: '#1849D6',
  },
  default: {
    fontSize: '32px',
    color: '#000000',
    backgroundColor: '#ffe4c4',
  },
};

// Default edge style for all edges
export const DEFAULT_EDGE_STYLE = {
  type: 'step',
  style: { stroke: '#000000', strokeWidth: 2, strokeDasharray: '0' },
  // markerEnd: 'arrow-marker',
};

// Node color map. This is used to show the color available as a background color for the node.
export const NODE_COLOR_MAP = [
  '#000000',
  '#161616',
  '#BEBEBE',
  '#FFC728',
  '#04134C',
  '#102785',
  '#1508D4',
  '#3867F3',
  '#0E9715',
  '#71DF02',
  '#02DFD8',
  '#FFCF0D',
  '#FF780C',
  '#FFA902',
  '#DF0001',
  '#CD0100',
  '#A50221',
  '#FFFFFF',
];

// All allowed node types in the application
export const ALLOWED_NODE_TYPES = {
  common: ['title', 'topic', 'subtopic', 'assignmentNode', 'learningAnchor'],
  group: ['subtopicGroup', 'topicGroup'],
  special: ['paragraph'],
};

// Node type specific permissions in Node Edit Modal
// This is used to show/hide the properties in the node edit modal based on the node type.
export const NODE_PERMISSIONS = {
  title: {
    allowedTabs: ['properties'],
    properties: [
      'label',
      'position',
      'dimension',
      'fontSize',
      'backgroundColor',
    ],
  },
  topic: {
    allowedTabs: ['properties'],
    properties: [
      'label',
      'position',
      (node) => (node?.parentId ? 'dimension.height' : 'dimension'),
      'fontSize',
      'backgroundColor',
    ],
  },
  subtopic: {
    allowedTabs: ['properties', 'contentAndLinks'],
    properties: [
      'label',
      'position',
      (node) => (node?.parentId ? 'dimension.height' : 'dimension'),
      'nodeStyleByKnowledegeLevelChanger',
      'nodeTypeChanger',
      'fontSize',
      'backgroundColor',
    ],
  },
  paragraph: {
    allowedTabs: ['properties'],
    properties: [
      'label',
      'position',
      'dimension',
      'fontSize',
      'paragraphStyle',
    ],
  },
  assignmentNode: {
    allowedTabs: ['properties', 'contentAndLinks'],
    properties: [
      'label',
      'position',
      (node) => (node?.parentId ? 'dimension.height' : 'dimension'),
      'nodeStyleByKnowledegeLevelChanger',
      'nodeTypeChanger',
      'fontSize',
      'backgroundColor',
    ],
  },
  topicGroup: {
    allowedTabs: ['properties'],
    properties: [
      'label',
      'position',
      'dimension.width',
      'fontSize',
      'backgroundColor',
      'rearrangeLayout',
    ],
    contentAndLinks: ['titleEditor', 'descriptionEditor'],
  },
  subtopicGroup: {
    allowedTabs: ['properties'],
    properties: [
      'label',
      'position',
      'dimension.width',
      'fontSize',
      'backgroundColor',
      'rearrangeLayout',
    ],
    contentAndLinks: ['titleEditor', 'descriptionEditor'],
  },
};

export const ADMIN_ROLE = 'admin';

export const USER_ROADMAP_HISTORY_ACTIONS = {
  BASE_ENTRY: {
    name: 'BASE_ENTRY',
    message: 'Base entry to history stack for initial render',
  },
  ADD_EDGE: {
    name: 'NEW_EDGE',
    message: 'Added a new edge',
  },
  UPDATE_EDGE: {
    name: 'UPDATE_EDGE',
    message: 'Updated an edge',
  },
  DELETE_EDGE: {
    name: 'DELETE_EDGE',
    message: 'Deleted an edge',
  },
  ADD_NODE: {
    name: 'NEW_NODE',
    message: 'Added a new node',
  },
  UPDATE_NODE: {
    name: 'UPDATE_NODE',
    message: 'Updated a node',
  },
  DELETE_NODE: {
    name: 'DELETE_NODE',
    message: 'Deleted a node',
  },
  ADD_SNIPPET: {
    name: 'ADD_SNIPPET',
    message: 'Added a roadmap snippet',
  },
  PASTE: {
    name: 'PASTE',
    message: 'Pasted some copied elements',
  },
  UNDO: {
    name: 'UNDO',
    message: 'Undo was performed',
  },
  REDO: {
    name: 'REDO',
    message: 'Redo was performed',
  },
};

// Change title of the web page according to the component
export const changePageTitle = (title = 'SETU Roadmaps') => {
  document.title = `${title} | Shifu`;
};

export const getTimestampInKolkata = () => {
  const d = new Date(),
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  const p = Object.fromEntries(
    fmt.formatToParts(d).map(({ type, value }) => [type, value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}.${d.getMilliseconds().toString().padStart(3, '0')}000`;
};
