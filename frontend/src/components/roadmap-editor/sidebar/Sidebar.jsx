import React, { useContext, useMemo } from 'react';
import styles from './Sidebar.module.css';
import componentIcon from '@/assets/components-icon.svg';
import predefinedModuleIcon from '@/assets/search-icon.svg';
import arrangeOrderIcon from '@/assets/arrange-order-icon.svg';
import componentIconActive from '@/assets/components-icon-active.svg';
import predefinedModuleIconActive from '@/assets/search-icon-black.svg';
import arrangeOrderIconActive from '@/assets/arrange-order-icon-active.svg';
import settingsIcon from '@/assets/settings-module-icon.svg';
import magicStickIcon from '@/assets/magic-stick.svg';
import ComponentSection from './sidebar-sections/ComponentSection';
import PredefinedModuleSection from './sidebar-sections/PredefinedModuleSection';
import ModuleSequencingSection from './sidebar-sections/ModuleSequencingSection';
import { SettingsSection } from './sidebar-sections/SettingsSection';
import { Tooltip } from 'react-tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { useRoadmapEditorSidebarStore } from '@/store/roadmapEditorSidebarStore';
import Image from 'next/image';
import { ADMIN_ROLE } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';

// Animation Variants
const modalVariants = {
  hidden: {
    x: -200,
    zIndex: -1,
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
  visible: {
    x: 0,
    zIndex: -1,
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Sidebar component that allows users to navigate between different sections.
 *
 * The sidebar includes three sections:
 * - **Components**
 * - **Predefined Modules**
 * - **Rearrange Modules**
 *
 * Each section has an associated icon and tooltip. Clicking a section toggles its content.
 *
 * @component
 *
 * @example
 * return <Sidebar />;
 *
 * @returns {JSX.Element} The rendered Sidebar component.
 */
const Sidebar = () => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const activeSection = useRoadmapEditorSidebarStore((s) => s.activeSection);
  const setActiveSection = useRoadmapEditorSidebarStore(
    (s) => s.setActiveSection,
  );
  const setActiveSectionWidth = useRoadmapEditorSidebarStore(
    (s) => s.setActiveSectionWidth,
  );

  // const isAdmin = userDetails?.role === ADMIN_ROLE;
  const isAdmin = true;

  const sidebarSections = useMemo(
    () => [
      {
        name: 'components-section',
        normalIcon: componentIcon,
        activeIcon: componentIconActive,
        component: ComponentSection,
        allowedRoles: ['admin', 'learner'],
        toolTip: {
          content: 'Components',
          place: 'right',
        },
      },
      {
        name: 'predefined-module-section',
        normalIcon: predefinedModuleIcon,
        activeIcon: predefinedModuleIconActive,
        component: PredefinedModuleSection,
        allowedRoles: ['admin'],
        toolTip: {
          content: 'Predefined Modules',
          place: 'right',
        },
      },
      {
        name: 'arrange-order-section',
        normalIcon: arrangeOrderIcon,
        activeIcon: arrangeOrderIconActive,
        component: ModuleSequencingSection,
        allowedRoles: ['admin'],
        toolTip: {
          content: 'Rearrange Modules',
          place: 'right',
        },
      },
      {
        name: 'settings-section',
        normalIcon: settingsIcon,
        activeIcon: settingsIcon,
        component: SettingsSection,
        allowedRoles: ['admin', 'learner'],
        toolTip: {
          content: 'Settings',
          place: 'right',
        },
      },
    ],
    [],
  );

  /**
   * Filter sections based on role
   */
  const availableSections = useMemo(() => {
    const role = isAdmin ? 'admin' : 'learner';

    return sidebarSections.filter((section) =>
      section.allowedRoles.includes(role),
    );
  }, [sidebarSections, isAdmin]);

  /**
   * Changes or toggles the active sidebar section.
   *
   * @param {Object} section - The section object to activate or deactivate.
   */
  const changeOrToggleActiveSection = (section) => {
    if (activeSection && section.name === activeSection?.name) {
      setActiveSection(null);
      setActiveSectionWidth(0);
    } else {
      setActiveSection(section);
      let sectionSidth = 205;
      if (section.name === 'predefined-module-section') {
        sectionSidth = 290;
      } else if (section.name === 'ai-roadmap') {
        sectionSidth = 400;
      }
      setActiveSectionWidth(sectionSidth);
    }
  };

  return (
    <>
      <div className={styles['main-container']}>
        {/* Small sidebar with section icons */}
        <div className={styles['sidebar-small']}>
          <div className={styles['sections-container']}>
            {availableSections.map((section, index) => (
              <div
                key={index}
                className={`${styles['section']}`}
                onClick={() => changeOrToggleActiveSection(section)}
              >
                <Image
                  data-tooltip-id="sidebar-tooltip"
                  data-tooltip-content={section.toolTip.content}
                  data-tooltip-place={section.toolTip.place}
                  className={styles['section-image']}
                  src={
                    activeSection?.name === section.name
                      ? section.activeIcon
                      : section.normalIcon
                  }
                  alt={section.name}
                />

                {activeSection?.name === section.name && (
                  <motion.div
                    layoutId="active-section"
                    className={styles['active-section']}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Render selected section content */}
        <AnimatePresence mode="wait">
          <motion.div
            className={styles['section-content']}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            key={activeSection?.name || 'component-section'}
          >
            {activeSection && <activeSection.component />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Tooltip for sidebar icons */}
      <Tooltip
        id="sidebar-tooltip"
        style={{
          backgroundColor: '#000000',
          color: '#FFFFFF',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '10px',
          fontWeight: '500',
          textAlign: 'center',
          // borderRadius: '20px',
          padding: '5px',
          zIndex: 1000,
        }}
        noArrow
        className={styles['custom-tooltip-animation']}
      />
    </>
  );
};

export default Sidebar;
