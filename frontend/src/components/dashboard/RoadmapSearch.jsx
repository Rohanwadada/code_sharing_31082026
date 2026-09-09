import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './RoadmapSearch.module.css';
import { substringSearch } from '@/utils/search';

// Default search keys for roadmap
const DEFAULT_SEARCH_KEYS = ['title', 'description'];

/**
 * Generic RoadmapSearch Component
 * @param {Object} props
 * @param {Array} props.roadmaps - Array of roadmaps to filter
 * @param {Function} props.onFilteredChange - Callback function that receives filtered roadmaps
 * @param {string} props.placeholder - Placeholder text for the input
 * @param {string} props.className - Additional CSS classes
 * @param {Array} props.searchKeys - Keys to search in (default: ['title', 'description'])
 * @param {boolean} props.autoOpen - Whether to open search automatically (default: false)
 */
const RoadmapSearch = ({
  roadmaps = [],
  onFilteredChange,
  placeholder = 'Search...',
  className = '',
  searchKeys = DEFAULT_SEARCH_KEYS,
  autoOpen = false,
}) => {
  const [toggleSearch, setToggleSearch] = useState(autoOpen);
  const [query, setQuery] = useState('');

  const searchRef = useRef(null);

  // Filter roadmaps based on query
  const filteredRoadmaps = useMemo(() => {
    if (!query.trim()) return roadmaps;

    const results = substringSearch(query, roadmaps, {
      keys: searchKeys,
    });
    return results.map((r) => r.item);
  }, [roadmaps, query, searchKeys]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const handleInputParentClick = (e) => {
    e.stopPropagation();
    if (searchRef?.current) {
      searchRef.current?.focus();
    }
  };

  // Notify parent component whenever filtered results change
  useEffect(() => {
    if (!onFilteredChange) return;

    onFilteredChange((prev) => {
      // Basic referential check is sufficient now that searchKeys are stable
      if (prev === filteredRoadmaps) return prev;
      return filteredRoadmaps;
    });
  }, [filteredRoadmaps, onFilteredChange]);

  useEffect(() => {
    if (toggleSearch && searchRef?.current) {
      searchRef.current?.focus();
    }
  }, [toggleSearch]);

  return (
    <div
      className={`${styles['search-input-container']} ${
        toggleSearch ? styles['open'] : ''
      } ${className}`}
      onClick={handleInputParentClick}
    >
      <SearchIcon size={20} className={styles['search-icon']} />
      <input
        type="text"
        value={query}
        ref={searchRef}
        placeholder={placeholder}
        onChange={handleInputChange}
        className={styles['search-input']}
      />
    </div>
  );
};

const SearchIcon = ({ size = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      {...props}
    >
      <path
        d="M17.5 17.5L12.5 12.5M14.1667 8.33333C14.1667 9.09938 14.0158 9.85792 13.7226 10.5657C13.4295 11.2734 12.9998 11.9164 12.4581 12.4581C11.9164 12.9998 11.2734 13.4295 10.5657 13.7226C9.85792 14.0158 9.09938 14.1667 8.33333 14.1667C7.56729 14.1667 6.80875 14.0158 6.10101 13.7226C5.39328 13.4295 4.75022 12.9998 4.20854 12.4581C3.66687 11.9164 3.23719 11.2734 2.94404 10.5657C2.65088 9.85792 2.5 9.09938 2.5 8.33333C2.5 6.78624 3.11458 5.30251 4.20854 4.20854C5.30251 3.11458 6.78624 2.5 8.33333 2.5C9.88043 2.5 11.3642 3.11458 12.4581 4.20854C13.5521 5.30251 14.1667 6.78624 14.1667 8.33333Z"
        stroke="#65758B"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default RoadmapSearch;
