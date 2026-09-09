import PropTypes from 'prop-types';
import { useContext, useEffect, useRef, useState } from 'react';
import editIcon from '@/assets/edit-icon.svg';
import styles from './RoadmapTitleEditor.module.css';
import { RoadmapContext } from '@/context/RoadmapContext';
import Image from 'next/image';

/**
 * RoadmapTitleEditor Component
 *
 * This component allows users to view and edit the title of a roadmap.
 * Users can toggle between viewing and editing modes. When editing, they can
 * input a new title and submit it to update the roadmap.
 *
 * Props:
 * @param {string} roadmapId - Unique identifier for the roadmap (not used directly but may be relevant for further extensions).
 *
 * State:
 * @state {boolean} showTitleEditForm - Controls whether the edit form is visible.
 * @state {string} tempTitle - Holds the temporary title while editing.
 * @state uses RoadmapContext to get the title of the roadmap and changing the title. (@see RoadmapContext)
 */
const RoadmapTitleEditor = ({ roadmapId }) => {
  const { roadmapTitle, setRoadmapTitle } = useContext(RoadmapContext);
  const [showTitleEditForm, setShowTitleEditForm] = useState(false);
  const [roadmapTitleInput, setRoadmapTitleInput] = useState('');
  const roadmapTitleInputRef = useRef(null);

  /**
   * Handles the submission of the new title.
   * Prevents updating if the title is empty or unchanged.
   *
   * @param {Event} event - Form submit event.
   */
  const handleTitleChange = async (event) => {
    event.preventDefault();

    setRoadmapTitle(roadmapTitleInput);
    setShowTitleEditForm(false);
  };

  useEffect(() => {
    if (showTitleEditForm) {
      roadmapTitleInputRef.current?.focus();
    }
  }, [showTitleEditForm]);

  useEffect(() => {
    setRoadmapTitleInput(roadmapTitle);
  }, [roadmapTitle]);

  return (
    <div className={styles['title-change-ct']}>
      {showTitleEditForm ? (
        <form
          onSubmit={handleTitleChange}
          className={styles['title-change-form']}
        >
          <input
            type="text"
            name="roadmap_title"
            id="roadmap_title"
            value={roadmapTitleInput}
            onChange={(event) => setRoadmapTitleInput(event.target.value)}
            ref={roadmapTitleInputRef}
          />
          <button type="submit" className={styles['submit-btn']}>
            Done
          </button>
        </form>
      ) : (
        <div className={styles['panel-btn']}>
          <div className={styles['title']}>
            {/* {roadmapTitle.length > 27
              ? roadmapTitle.slice(0, 27) + '....'
              : roadmapTitle}{' '} */}
            {roadmapTitle}
          </div>

          <button
            className={styles['edit-btn']}
            onClick={() => {
              setShowTitleEditForm(!showTitleEditForm);
            }}
          >
            <Image
              src={editIcon}
              className={styles['edit-icon']}
              alt="edit-icon"
            />
          </button>
        </div>
      )}
    </div>
  );
};

RoadmapTitleEditor.propTypes = {
  roadmapId: PropTypes.string.isRequired,
};

export default RoadmapTitleEditor;
