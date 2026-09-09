"use client"

import React from 'react';
import classes from './Header.module.css';
import shifuIcon from '@/assets/shifu-logo.svg';
import Image from 'next/image';
import Button from '../ui/Button';
import { useRouter } from 'next/navigation';

const Header = ({
  assessmentDetails,
  showSubmitButton,
  onSubmit,
  showReturnToTest,
  onReturnToTest,
}) => {
  const router = useRouter();

  const handleGotoHome = () => {
    router.push('/');
  };

  return (
    <header className={classes['header']}>
      <div className={classes['header-left']}>
        <Image src={shifuIcon} alt="" onClick={handleGotoHome} />
        {assessmentDetails && (
          <p>{assessmentDetails?.exam_name || 'Unknown Exam'}</p>
        )}
      </div>
      <div className={classes['header-right']}>
        {showReturnToTest && (
          <Button
            onClick={onReturnToTest}
            className={classes['return-to-test-btn']}
          >
            Return to Test
          </Button>
        )}
        {showSubmitButton && (
          <Button className={classes['submit-btn']} onClick={onSubmit}>
            Submit the assessment{' '}
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
