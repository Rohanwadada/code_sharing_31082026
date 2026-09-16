'use client';

import React, { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoadmapPrompt } from '@/service/promptSharing.service';
import { useThreadStore } from '@/store/threadStore';

export const PromptSharingContext = createContext();

export const PromptSharingProvider = ({ children }) => {
  const [whoIsThisFor, setWhoIsThisFor] = useState('Organization');
  const [whatToCreate, setWhatToCreate] = useState('roadmap');
  const [roleDescriptionText, setRoleDescriptionText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);

  const router = useRouter();

  const handleGeneratePromptAndNavigate = async (projectId = null, options = {}, file = null) => {
    try {
      setIsGenerating(true);
      const reqOptions = {
        who_is_this_for: options.who_is_this_for || whoIsThisFor,
        what_to_create: options.what_to_create || whatToCreate,
        role_description_text: options.role_description_text || roleDescriptionText,
      };
      const reqFile = file || uploadedFile;

      const resData = await generateRoadmapPrompt(reqOptions, reqFile);
      setGeneratedData(resData);

      if (resData && resData.prompt) {
        // Automatically populate the query input for EmptyState / Chat UI
        useThreadStore.getState().setQueryInput(resData.prompt);
      }

      if (projectId) {
        router.push(`/project/${projectId}/thread`);
      } else {
        router.push('/threads');
      }
      return resData;
    } catch (err) {
      console.error('Error generating roadmap prompt:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const resetPromptSharingState = () => {
    setWhoIsThisFor('Organization');
    setWhatToCreate('roadmap');
    setRoleDescriptionText('');
    setUploadedFile(null);
    setIsGenerating(false);
    setGeneratedData(null);
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
        generatedData,
        setGeneratedData,
        handleGeneratePromptAndNavigate,
        resetPromptSharingState,
      }}
    >
      {children}
    </PromptSharingContext.Provider>
  );
};

export const usePromptSharingContext = () => {
  const context = useContext(PromptSharingContext);
  if (!context) {
    throw new Error('usePromptSharingContext must be used within a PromptSharingProvider');
  }
  return context;
};
