import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from './PredefinedModuleSection.module.css';
import { useParams } from 'next/navigation';
import searchIcon from '@/assets/search-icon.svg';
import { RoadmapContext } from '@/context/RoadmapContext';
import addToBagIcon from '@/assets/component-add-to-bag-icon.svg';
import componentBagTickIcon from '@/assets/component-bag-tick.svg';
import { useNotification } from '@/hooks/useNotification';
import { getNodeTypeText } from '@/utils/helper';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import {
  searchRoadmapSnippets,
  addComponentToBag as addComponentToBagApi,
} from '@/service/roadmapBlock.service';

function debounce(func, delay) {
  let timer;
  const debouncedFn = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };

  // Add a cancel method to the debounced function
  debouncedFn.cancel = function () {
    clearTimeout(timer);
  };

  return debouncedFn;
}

const PredefinedModuleSection = () => {
  const userDetails = useAuthStore((s) => s.userDetails);
  const { setSelectedComponent, componentBagData, setComponentBagData } =
    useContext(RoadmapContext);

  const { showNotification, showComponentAddedAlert } = useNotification();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [components, setComponents] = useState([]);

  // Ref for search
  const searchRef = useRef(null);

  const { roadmapId } = useParams();

  // Handle search input change
  const handleSearchChange = (e) => {
    const input = e.target.value;
    setSearchInput(input);
  };

  const searchComponents = async (query) => {
    if (query.trim().length < 3) {
      setComponents([]);
      return;
    }
    try {
      const responseData = await searchRoadmapSnippets(query, roadmapId);
      setComponents(
        (responseData?.snippets || []).sort((a, b) => {
          // First, sort by exact_match (true first)
          if (b.exact_match !== a.exact_match) {
            return b.exact_match - a.exact_match;
          }

          // Define the priority order for types
          const typeOrder = {
            title: 1,
            topic: 2,
            topicGroup: 2,
            subtopicGroup: 3,
            subtopic: 4,
            assignmentNode: 5,
          };

          return (typeOrder[a.node.type] || 6) - (typeOrder[b.node.type] || 6);
        }),
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handlePreviewClick = (component) => {
    setSelectedComponent(component);
  };

  const checkComponentPresentInBag = (component) => {
    const existingComponent = componentBagData.find(
      (c) => c.node.id === component.node.id && c.r_id === component.r_id,
    );
    return existingComponent ? true : false;
  };

  const handleAddToBag = async (event, component) => {
    event.stopPropagation();
    const existingComponent = componentBagData.find(
      (c) => c.node.id === component.node.id && c.r_id === component.r_id,
    );
    console.log(existingComponent);
    if (!existingComponent) {
      const verdict = await addComponentToBag(component);
      if (verdict) {
        setComponentBagData((prev) => [...prev, component]);
        showComponentAddedAlert(
          `Added ${component.node.data.label} to Component Bag`,
        );
      }
    }
  };

  const addComponentToBag = async (component) => {
    try {
      const responseData = await addComponentToBagApi(component);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const onDragStart = (event, roadmapSnippet) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('dragType', 'predefined-roadmap-component-drag');
    event.dataTransfer.setData('dragData', JSON.stringify(roadmapSnippet));

    // const currentElement = event.currentTarget;

    // // clone
    // const dragImage = currentElement.cloneNode(true);

    // const computedStyle = window.getComputedStyle(currentElement);
    // for (let key of computedStyle) {
    //   dragImage.style[key] = computedStyle.getPropertyValue(key);
    // }

    // dragImage.style.position = 'absolute';
    // dragImage.style.top = "-1000px";
    // dragImage.style.opacity = '1';
    // dragImage.style.pointerEvents = 'none';
    // document.body.appendChild(dragImage);

    // event.dataTransfer.setDragImage(dragImage, 0, 0);

    // setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  useEffect(() => {
    searchComponents(debouncedQuery);
  }, [debouncedQuery, userDetails?.email, roadmapId]);

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  return (
    <div className={styles['component-container']}>
      <div className={styles['top-ct']}>
        <div className={styles['heading-ct']}>
          <span className={styles['heading-top']}>Search Components</span>
          <span className={styles['heading-bottom']}>
            Drag and drop the structures you want
          </span>
        </div>
        <div className={styles['search-ct']}>
          <Image src={searchIcon} alt="search-icon" />
          <input
            type="text"
            placeholder="Search components"
            value={searchInput}
            onChange={handleSearchChange}
            ref={searchRef}
          />
        </div>
      </div>
      <div className={styles['search-results-ct']}>
        {components.length !== 0 && (
          <span className={styles['best-matches']}>Best Matches</span>
        )}
        <div className={styles['search-result-outer']}>
          <div className={styles['search-result-inner']}>
            {components.map((c, index) => {
              const isComponentInBag = checkComponentPresentInBag(c);
              return (
                <div
                  key={index}
                  className={styles['search-result']}
                  component-type={c.node?.type || 'subtopic'}
                  onClick={() => handlePreviewClick(c)}
                  onDragStart={(event) => onDragStart(event, c)}
                  draggable={true}
                >
                  <div className={styles['component-info']}>
                    <span className={styles['component-name']}>
                      {c.node.data?.label || 'Untitled Node'}
                    </span>
                    <span className={styles['component-text']}>
                      {getNodeTypeText(
                        c.node?.type || 'Node do not have any type',
                      )}
                    </span>
                  </div>
                  <button
                    className={`${styles['add-to-bag']} ${isComponentInBag ? styles['in-bag'] : styles['not-in-bag']}`}
                    onClick={(e) => handleAddToBag(e, c)}
                  >
                    <Image
                      src={
                        isComponentInBag ? componentBagTickIcon : addToBagIcon
                      }
                      alt="add_to_bag_icon"
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredefinedModuleSection;
