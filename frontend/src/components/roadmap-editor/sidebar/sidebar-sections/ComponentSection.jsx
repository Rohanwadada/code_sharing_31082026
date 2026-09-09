import React from 'react';
import titleComponentIcon from '@/assets/title-component-icon.svg';
import topicComponentIcon from '@/assets/topic-component-icon.svg';
import moduleComponentIcon from '@/assets/module-component-icon.svg';
import assignmentIcon from '@/assets/assignment-Icon.svg';
import connectorComponentIcon from '@/assets/connector-component-icon.svg';
import verticalLineComponentIcon from '@/assets/vertical-line-component-icon.svg';
import horizontalLineComponentIcon from '@/assets/horizontal-line-component-icon.svg';
import addNumComponentIcon from '@/assets/add-num-component-icon.svg';
import styles from './ComponentSection.module.css';
import Image from 'next/image';

/**
 * ComponentSection - A draggable component selector for building a roadmap.
 *
 * This component provides a list of predefined components (e.g., Title, Topic, Module)
 * that users can drag and drop into the roadmap editor.
 *
 * @component
 *
 * @example
 * return <ComponentSection />;
 *
 * @returns {JSX.Element} The rendered ComponentSection component.
 */
const ComponentSection = () => {
  /**
   * List of available draggable components with their corresponding node names and icons.
   */
  const availableComponents = [
    {
      name: 'Title',
      nodeName: 'title',
      icon: titleComponentIcon,
      dragable: true,
    },
    {
      name: 'Topic',
      nodeName: 'topicGroup',
      icon: topicComponentIcon,
      dragable: true,
    },
    {
      name: 'Module',
      nodeName: 'subtopicGroup',
      icon: moduleComponentIcon,
      dragable: true,
    },
    // {
    //   name: 'Connector',
    //   nodeName: 'connector',
    //   icon: connectorComponentIcon,
    //   dragable: false,
    // },
    // {
    //   name: 'Vertical Line',
    //   nodeName: 'verticalLine',
    //   icon: verticalLineComponentIcon,
    //   dragable: false,
    // },
    // {
    //   name: 'Horizontal line',
    //   nodeName: 'horizontalLine',
    //   icon: horizontalLineComponentIcon,
    //   dragable: false,
    // },
    // {
    //   name: 'Add Num',
    //   nodeName: 'addNum',
    //   icon: addNumComponentIcon,
    //   dragable: false,
    // },
  ];

  /**
   * Handles the drag start event when a user starts dragging a component.
   *
   * @param {DragEvent} event - The drag event.
   * @param {string} nodeType - The type of node being dragged.
   */
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('dragType', 'single-node-drag');
    event.dataTransfer.setData('dragData', nodeType);
  };

  return (
    <div className={styles['component-container']}>
      {/* Header Section */}
      <div className={styles['component-container-head']}>
        <p className={styles['component-container-head-p1']}>Components</p>
        <p className={styles['component-container-head-p2']}>Drag & Drop</p>
      </div>

      {/* List of Drag & Drop Components */}
      <div className={styles['components']}>
        {availableComponents.map((component) => (
          <div
            key={component.nodeName}
            className={styles['component-card']}
            onDragStart={(event) => onDragStart(event, component.nodeName)}
            draggable={component.dragable}
          >
            <Image
              src={component.icon}
              alt={`${component.name} component`}
              className={styles['component-card-img']}
              draggable={false}
            />
            <div className={styles['component-card-name']}>
              {component.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComponentSection;
