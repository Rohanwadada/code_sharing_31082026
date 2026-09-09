'use client';

import React, { useState, useRef } from 'react';
import classes from './UploadCompetency.module.css';
import sampleFormat from '@/assets/assessment/sample-format.svg';
import dropdownCollapse from '@/assets/assessment/dropdown-collapse.svg';
import competencyStructureIcon from '@/assets/assessment/competency-structure.svg';
import fileUpload from '@/assets/assessment/file-upload.svg';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { uploadCompetency } from '@/service/assessment.service';
import { useAssessmentFormationStore } from '@/store/assessmentFormationStore';
import { useProjectStore } from '@/store/projectStore';

const UploadCompetency = ({ projectId }) => {
  const currentProjectName = useProjectStore((s) => s.currentProjectName);

  const router = useRouter();
  const project = null;
  const fileInputRef = useRef(null);
  const selectedFile = useRef(null);
  const setAssessmentFormationDetails = useAssessmentFormationStore(
    (state) => state.setAssessmentFormationDetails,
  );

  // States: 'idle' | 'attached' | 'analyzing' | 'complete' | 'error'
  const [uploadState, setUploadState] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileDetails, setUploadedFileDetails] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  // Collapse/Expand State for right panel
  const [isFormatExpanded, setIsFormatExpanded] = useState(false);

  function formatFileSize(sizeBytes) {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    let value = sizeBytes;

    for (const unit of ['KB', 'MB', 'GB']) {
      value /= 1024;
      if (value < 1024) {
        return `${value.toFixed(1)} ${unit}`;
      }
    }

    return `${value.toFixed(1)} TB`;
  }

  const processFile = (file) => {
    if (!file) return;
    selectedFile.current = file;
    setUploadedFileDetails({ filename: file.name, size: file.size });
    setUploadState('attached');
    setUploadProgress(0);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = null;
    processFile(file);
  };

  // updated
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploadState === 'analyzing') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleAnalyzeClick = async () => {
    if (!selectedFile.current) return;

    setUploadState('analyzing');
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 200);

    try {
      const data = await uploadCompetency(selectedFile.current);

      clearInterval(interval);
      setUploadProgress(100);
      setUploadState('complete');
      setAssessmentFormationDetails({ ...data, source: 'question-upload' });

      setTimeout(() => {
        router.push(`/project/${projectId}/assessment/review-competency`);
      }, 500);
    } catch (error) {
      clearInterval(interval);
      console.error('Failed to analyze questions:', error);
      setUploadState('attached');
    }
  };

  const handleSampleCSVDownload = () => {
    const link = document.createElement('a');
    link.href = '/competency-upload/sample-format.xlsx';
    link.download = 'competency-upload-sample-format.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={classes['upload-page']}>
      <header className={classes['header']}>
        <div>
          <div className={classes['page-title']}>
            <p>Upload</p>
            <span className={classes['highlight']}>Competency</span>
            <span className={classes['info-icon']}>
              {' '}
              <Image src={competencyStructureIcon} alt="" />{' '}
            </span>
          </div>
          <div className={classes['info-tags-container']}>
            <div className={classes['info-tag-group']}>
              <span>Project:</span>
              <span className={classes['info-tag']}>
                {currentProjectName || 'Unknown Project'}
              </span>
            </div>
            {/* <div className={classes["info-tag-group"]}>
              <span>Experience Level:</span>
              <span className={classes["info-tag-desg"]}>Mid Senior</span>
            </div>*/}
          </div>
        </div>
        <button
          className={`${classes['btn-analyze']} ${uploadState === 'attached' ? classes['btn-analyze-active'] : ''}`}
          disabled={uploadState !== 'attached'}
          onClick={handleAnalyzeClick}
        >
          Analyze Competency
        </button>
      </header>

      <div className={classes['content-grid']}>
        {/* Left Column: Dropzone & Progress */}
        <div className={classes['left-col']}>
          {/* updated */}
          <div
            className={`${classes['dropzone']} ${uploadState === 'analyzing' ? classes['dropzone-disabled'] : ''} ${isDragging ? classes['dropzone-active'] : ''}`}
            onClick={() =>
              uploadState !== 'analyzing' && fileInputRef.current.click()
            }
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (uploadState !== 'analyzing') {
                e.dataTransfer.dropEffect = 'copy';
                setIsDragging(true);
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (uploadState !== 'analyzing') {
                setIsDragging(true);
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <div className={classes['folder-icon']}>
              <Image src={fileUpload} alt="" />
            </div>
            <h3 className={classes['dropzone-title']}>Upload Your Files</h3>
            <p className={classes['dropzone-sub']}>
              <span className={classes['text-gold']}>Click to upload file</span>{' '}
              or drag and drop
            </p>
            <p className={classes['dropzone-hint']}>
              Supported: CSV, XLSX
            </p>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept=".csv,.xlsx"
            />
          </div>
        </div>

        {/* Right Column: Format Requirements */}
        <div className={classes['right-col']}>
          <div className={classes['format-card']}>
            <h3 className={classes['format-title']}>Competency Format</h3>
            <p className={classes['format-sub']}>
              competency sub competency definition
            </p>

            <button
              className={classes['btn-sample']}
              onClick={handleSampleCSVDownload}
            >
              <span className={classes['download-icon']}>
                <Image src={sampleFormat} alt="" />{' '}
              </span>{' '}
              Sample Format
            </button>
          </div>
        </div>
      </div>

      {uploadState === 'analyzing' && (
        <div className={classes['upload-status-card']}>
          <div className={classes['status-header']}>
            <span className={classes['status-title']}>ANALYZING</span>
            <span className={classes['status-percentage']}>
              {uploadProgress}%
            </span>
          </div>
          <div className={classes['progress-track']}>
            <div
              className={classes['progress-fill']}
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {uploadState !== 'idle' && (
        <div className={classes['success-banner']}>
          <div className={classes['file-info']}>
            <span className={classes['file-name']}>
              {uploadedFileDetails.filename || 'Uploaded File'}
            </span>
            <span className={classes['file-meta']}>
              {formatFileSize(uploadedFileDetails.size)}
            </span>
          </div>
          {uploadState === 'complete' && (
            <div className={classes['success-badge']}>
              <span className={classes['check-circle']}>✓</span> Uploaded
              Successfully
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadCompetency;
