import { useState } from 'react';
import RoadmapCard from './RoadmapCard';
import Pagination from './Pagination';
import styles from './RoadmapGrid.module.css';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { motion } from 'framer-motion';

const PAGE_SIZE = 12;

const RoadmapGrid = ({
  roadmaps,
  onEditClick,
  onCloneClick,
  onDeleteClick,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(roadmaps.length / PAGE_SIZE);

  // Reset to first page when the filtered results change (tab switch, search, delete)
  const safePage = Math.min(currentPage, totalPages) || 1;

  const paginatedRoadmaps = roadmaps.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <>
      <LayoutGroup>
        <motion.div
          key={safePage}
          className={styles['grid-ct']}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.25,
          }}
        >
          <AnimatePresence mode="popLayout">
            {paginatedRoadmaps.map((roadmap, idx) => (
              <RoadmapCard
                key={roadmap.id}
                cardData={roadmap}
                onEditClick={onEditClick}
                onCloneClick={onCloneClick}
                onDeleteClick={onDeleteClick}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </>
  );
};

export default RoadmapGrid;
