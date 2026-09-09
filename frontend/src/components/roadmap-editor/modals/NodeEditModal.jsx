import { useEffect, useState } from 'react';
import styles from './NodeEditModal.module.css';
import React from 'react';
import ContentTab from './node-edit-tabs/ContentTab';
import PropertiesTab from './node-edit-tabs/PropertiesTab';
import useNodePermissions from '@/hooks/useNodePermissions';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const MODAL_TABS = [
  {
    name: 'Properties',
    keyName: 'properties',
  },
  { name: 'Content & Links', keyName: 'contentAndLinks' },
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
 * NodeEditModal Component
 *
 * This modal allows users to edit properties and content of a selected node in the roadmap.
 * It includes a tab system to switch between "Properties" and "Content & Links" sections.
 *
 * Props:
 * @param {object} selectedNode : The currently selected node being edited.
 * @param {array} nodes : List of all nodes in the roadmap.
 * @param {Function} setNodes : Updates the nodes state when modifications are made.
 * @param {String} roadmapId : Unique identifier of the roadmap.
 * @param {Function} setSelectedNode : Updates the currently selected node.
 *
 * Dependencies:
 * - useNodePermissions: Custom hook that determines the tabs accessible based on permissions.
 * - useState: Manages component state for active tabs.
 * - useEffect: Ensures tab permissions are respected when the selected node changes.
 *
 * @component
 * @returns {JSX.Element} The Node edit modal UI.
 *
 */
const NodeEditModal = ({
  selectedNode,
  nodes,
  setNodes,
  roadmapId,
  setSelectedNode,
}) => {
  const [activeTab, setActiveTab] = useState(MODAL_TABS[0]);

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  const { allowedTabs, hasPermission } = useNodePermissions(selectedNode);
  useEffect(() => {
    if (!allowedTabs.includes(activeTab.keyName)) {
      setActiveTab(MODAL_TABS[0]);
    }
  }, [selectedNode?.id]);

  return (
    <motion.div
      className={styles['node-edit-ct']}
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      key="node-modal"
    >
      <div className={styles['tab-system']}>
        {MODAL_TABS.map(
          (tab, index) =>
            allowedTabs.includes(tab.keyName) && (
              <div
                key={index}
                className={`${styles['tabs']} ${activeTab.name === tab.name ? styles['active-tab'] : ''}`}
                onClick={() => handleTabClick(tab)}
              >
                {activeTab.name === tab.name && (
                  <motion.div
                    // layoutId="active-pill"
                    className={styles['active']}
                    // transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
                  />
                )}
                <div className={styles['tab-name']}>{tab.name}</div>
              </div>
            ),
        )}
      </div>

      <div className={styles['tab-content']}>
        {/* properties */}
        {activeTab.name === 'Properties' && (
          <PropertiesTab
            selectedNode={selectedNode}
            nodes={nodes}
            setNodes={setNodes}
            setSelectedNode={setSelectedNode}
            hasPermission={hasPermission}
          />
        )}

        {/* content & links */}
        {activeTab.name === 'Content & Links' && (
          <ContentTab
            selectedNode={selectedNode}
            roadmapId={roadmapId}
            hasPermission={hasPermission}
          />
        )}
      </div>
    </motion.div>
  );
};

NodeEditModal.propTypes = {
  selectedNode: PropTypes.object,
  nodes: PropTypes.array.isRequired,
  setNodes: PropTypes.func.isRequired,
  roadmapId: PropTypes.string.isRequired,
  setSelectedNode: PropTypes.func.isRequired,
};

export default NodeEditModal;
