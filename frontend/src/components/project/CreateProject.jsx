'use client';

import React, { useState } from 'react';
import classes from './CreateProject.module.css';
import { useRouter } from 'next/navigation';

const CreateProject = () => {
  const [selectedOption, setSelectedOption] = useState(null);
  const router = useRouter();

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    router.push('/project/create-assessment');
  };

  return (
    <div className={classes.container}>
      <h1 className={classes.pageTitle}>Create a project</h1>

      <div className={classes.contentCard}>
        <h2 className={classes.questionTitle}>What do you want to create?</h2>
        <p className={classes.questionDesc}>
          This decides what learners go through and what shows up on the project
          card.
        </p>

        <div className={classes.optionsContainer}>
          {/* Option 1: Skill gap assessment */}
          <div
            className={`${classes.optionCard} ${
              selectedOption === 'assessment' ? classes.selected : ''
            }`}
            onClick={() => handleOptionSelect('assessment')}
          >
            <h3 className={classes.optionTitle}>Skill gap assessment</h3>
            <p className={classes.optionDesc}>
              Learners take an assessment; each person gets their own
              personalised roadmap from their scores.
            </p>
          </div>

          {/* Option 2: Roadmap only */}
          <div
            className={`${classes.optionCard} ${
              selectedOption === 'roadmap' ? classes.selected : ''
            }`}
            onClick={() => handleOptionSelect('roadmap')}
          >
            <h3 className={classes.optionTitle}>Roadmap only</h3>
            <p className={classes.optionDesc}>
              No assessment — craft one roadmap and assign the exact same thing
              to everyone directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
