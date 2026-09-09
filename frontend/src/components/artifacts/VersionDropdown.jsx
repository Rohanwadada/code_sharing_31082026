import React, { useState } from 'react';
import styles from './VersionDropdown.module.css';
import { useArtifactStore } from '@/store/artifactStore';
import { motion } from 'framer-motion';

const animationVariants = {
  hidden: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.2,
      ease: 'easeInOut',
    },
  },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: 0.25,
      ease: 'easeOut',
      when: 'beforeChildren',
      staggerChildren: 0.04,
    },
  },
};

const itemVariant = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

export const VersionDropdown = ({ currentArtifactId, data, onChange }) => {
  const handleChange = (e, selectedAId) => {
    onChange(selectedAId);
  };

  return (
    <motion.div
      layout
      className={styles['dropdown']}
      initial="hidden"
      animate="visible"
      // exit="hidden"
      variants={animationVariants}
    >
      <div className={styles['dropdown-inner']}>
        {data &&
          data.map((item) => (
            <motion.div
              key={item.a_id}
              className={`${styles['dropdown-item']} ${currentArtifactId === item.a_id ? styles['selected'] : ''}`}
              onClick={(e) => handleChange(e, item.a_id)}
              initial="hidden"
              animate="visible"
              // exit="hidden"
              variants={itemVariant}
            >
              <span>{item.title}</span>
              <span
                className={styles['version']}
              >{`V${item.version_tag + 1}`}</span>
            </motion.div>
          ))}
      </div>
    </motion.div>
  );
};

export default VersionDropdown;
