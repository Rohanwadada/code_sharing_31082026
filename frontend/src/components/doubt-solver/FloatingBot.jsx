import Image from 'next/image';
import React from 'react';
import shifuIcon from '@/assets/bot/thinking.png';
import { useDoubtSolverThreadStore } from '@/store/doubtSolverThreadStore';
import styles from './FloatingBot.module.css';

function FloatingBot() {
  const setIsOpen = useDoubtSolverThreadStore((s) => s.setIsOpen);

  const openDoubtSolverSection = () => {
    setIsOpen(true);
  };
  return (
    <div className={styles['main-ct']} onClick={openDoubtSolverSection}>
      <Image src={shifuIcon} width={34} height={34} alt="shifu-icon" />
    </div>
  );
}

export default FloatingBot;
