//corrected
"use client"

import { createContext, useState } from "react";

export const QuestionContext = createContext();

export const QuestionProvider = ({ children }) => {
  const [testDetails, setTestDetails] = useState(() => {
    const testdetails = sessionStorage.getItem("test_details");
    if (testdetails) {
      return JSON.parse(testdetails);
    }
    return {};
  });
  

  return (
    <QuestionContext.Provider value={{ testDetails, setTestDetails }}>
      {children}
    </QuestionContext.Provider>
  );
};
