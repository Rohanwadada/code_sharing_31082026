'use client';

import React, { createContext, useContext, useState } from 'react';

export const PromptSharingContext = createContext(null);

export const PromptSharingProvider = ({ children }) => {
  const [whoIsThisFor, setWhoIsThisFor] = useState('Organization');
  const [whatToCreate, setWhatToCreate] = useState('roadmap');
  const [roleDescriptionText, setRoleDescriptionText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPromptData, setGeneratedPromptData] = useState(null);

  const resetPromptState = () => {
    setWhoIsThisFor('Organization');
    setWhatToCreate('roadmap');
    setRoleDescriptionText('');
    setUploadedFile(null);
    setIsGenerating(false);
    setGeneratedPromptData(null);
  };

  return (
    <PromptSharingContext.Provider
      value={{
        whoIsThisFor,
        setWhoIsThisFor,
        whatToCreate,
        setWhatToCreate,
        roleDescriptionText,
        setRoleDescriptionText,
        uploadedFile,
        setUploadedFile,
        isGenerating,
        setIsGenerating,
        generatedPromptData,
        setGeneratedPromptData,
        resetPromptState,
      }}
    >
      {children}
    </PromptSharingContext.Provider>
  );
};

export const usePromptSharingContext = () => {
  const context = useContext(PromptSharingContext);
  if (!context) {
    // Return fallback state if used outside provider
    return {
      whoIsThisFor: 'Organization',
      setWhoIsThisFor: () => {},
      whatToCreate: 'roadmap',
      setWhatToCreate: () => {},
      roleDescriptionText: '',
      setRoleDescriptionText: () => {},
      uploadedFile: null,
      setUploadedFile: () => {},
      isGenerating: false,
      setIsGenerating: () => {},
      generatedPromptData: null,
      setGeneratedPromptData: () => {},
      resetPromptState: () => {},
    };
  }
  return context;
};
