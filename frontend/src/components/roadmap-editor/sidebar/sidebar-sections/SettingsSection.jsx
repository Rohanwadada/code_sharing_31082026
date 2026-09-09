import { useCallback, useContext, useEffect } from 'react';
import styles from './SettingsSection.module.css';
import { Select } from '@/components/ui/Select';
import { RoadmapContext } from '@/context/RoadmapContext';
import { emitCustomEvent } from '@/utils/helper';
import { useParams } from 'next/navigation';

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified delay has elapsed since the last time it was called.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds before executing the function.
 * @returns {Function} - A debounced version of the input function.
 *
 * @example
 * const debouncedSearch = debounce(() => console.log('Search API called'), 300);
 * window.addEventListener('input', debouncedSearch);
 */
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

export const SettingsSection = () => {
  const { roadmapId } = useParams();

  const {
    roadmapTitle,
    setRoadmapTitle,
    roadmapDescription,
    setRoadmapDescription,
    roadmapLevel,
    setRoadmapLevel,
    roadmapVisibility,
    setRoadmapVisibility,
  } = useContext(RoadmapContext);

  const updateRoadmap = (payload) => {
    emitCustomEvent('roadmap::update', payload);
  };

  const debouncedUpdate = useCallback(
    debounce((payload) => {
      updateRoadmap(payload);
    }, 500),
    [roadmapId],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    console.log(name, value);

    switch (name) {
      case 'title':
        setRoadmapTitle(value);
        break;
      case 'description':
        setRoadmapDescription(value);
        break;
      case 'level':
        setRoadmapLevel(value);
        break;
      case 'visibility':
        setRoadmapVisibility(value);
        break;
    }
  };

  useEffect(() => {
    const payload = {
      r_title: roadmapTitle,
      r_desc: roadmapDescription,
      r_l: roadmapLevel,
    };
    debouncedUpdate(payload);
  }, [roadmapDescription, roadmapLevel]);

  // separete useEffect for roadmap visibility change denotation because in backend it will trigger other downstream functions
  useEffect(() => {
    const payload = {
      r_title: roadmapTitle,
      r_desc: roadmapDescription,
      r_l: roadmapLevel,
      visibility: roadmapVisibility,
      change: 'visibility',
    };
    debouncedUpdate(payload);
  }, [roadmapVisibility]);

  return (
    <form className={styles['component-container']}>
      <div className={styles['section-head']}>Settings</div>
      <div className={styles['section-input-ct']}>
        <div className={styles['section-input-name']}>Roadmap Name</div>
        <input
          name="title"
          className={styles['section-input']}
          type="text"
          value={roadmapTitle}
          onChange={handleChange}
        />
      </div>
      <div className={styles['section-input-ct']}>
        <div className={styles['section-input-name']}>Roadmap Description</div>
        {/* <input className={styles['section-input']} type="text" /> */}
        <textarea
          name="description"
          className={`${styles['section-input']} ${styles['textarea']}`}
          id=""
          value={roadmapDescription}
          onChange={handleChange}
        ></textarea>
      </div>
      <div className={styles['section-input-ct']}>
        <div className={styles['section-input-name']}>Level</div>
        <select
          name="level"
          className={`${styles['section-input']} ${styles['select']}`}
          value={roadmapLevel}
          onChange={handleChange}
        >
          <option value="" disabled>
            Select Level
          </option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
    </form>
  );
};
