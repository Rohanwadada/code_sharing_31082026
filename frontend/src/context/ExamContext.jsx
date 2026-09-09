'use client';

import { createContext, useContext, useState } from 'react';

const ExamContext = createContext();

export const ExamProvider = ({ children }) => {
  const [examData, setExamData] = useState(null);

  return (
    <ExamContext.Provider value={{ examData, setExamData }}>
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => useContext(ExamContext);
