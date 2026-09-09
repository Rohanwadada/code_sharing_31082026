import { useState } from 'react';
import AssessmentCard from './AssessmentCard';
import Pagination from './Pagination';
import styles from './RoadmapGrid.module.css';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { motion } from 'framer-motion';

const PAGE_SIZE = 12;

const AssessmentGrid = ({ assessments }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(assessments.length / PAGE_SIZE);
  const safePage = Math.min(currentPage, totalPages) || 1;

  const paginatedAssessments = assessments.slice(
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
          transition={{ duration: 0.25 }}
        >
          <AnimatePresence mode="popLayout">
            {paginatedAssessments.map((assessment) => (
              <AssessmentCard
                key={assessment.assessment_id}
                cardData={assessment}
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

export default AssessmentGrid;
