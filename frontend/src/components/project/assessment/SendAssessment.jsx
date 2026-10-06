'use client';

import React, { useState } from 'react';
import classes from './SendAssessment.module.css';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { grantAssessmentAccess } from '@/service/assessment.service';

const candidateData = [
  {
    id: 1,
    name: 'Arjun Mehta',
    email: 'arjun.mehta@company.com',
    status: 'Matched',
  },
  {
    id: 2,
    name: 'Priya Sharma',
    email: 'priya.sharma@company.com',
    status: 'Matched',
  },
  {
    id: 3,
    name: 'Rahul Verma',
    email: 'rahul.verma@company.com',
    status: 'Matched',
  },
  { id: 4, name: 'Sneha Gupta', email: 'sneha.gupta@', status: 'Invalid' },
  {
    id: 5,
    name: 'Vikram Singh',
    email: 'vikram.singh@company.com',
    status: 'Matched',
  },
  {
    id: 6,
    name: 'Ananya Patel',
    email: 'ananya.patel@invalid',
    status: 'Invalid',
  },
  {
    id: 7,
    name: 'Deepak Kumar',
    email: 'deepak.kumar@company.com',
    status: 'Matched',
  },
  { id: 8, name: 'Kavita Joshi', email: 'kavita.joshi', status: 'Invalid' },
  {
    id: 9,
    name: 'Rohan Nair',
    email: 'rohan.nair@company.com',
    status: 'Matched',
  },
  {
    id: 10,
    name: 'Meera Reddy',
    email: 'meera.reddy@company.com',
    status: 'Matched',
  },
];

const InvalidIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: '4px' }}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="#22C55E"
    stroke="#22C55E"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="9 12 11 14 15 10" stroke="#FFFFFF"></polyline>
  </svg>
);

const allowdEmailDomains = ['setuschool.com', 'gmail.com'];

const ShifuSendAssessment = ({projectId, assessmentId}) => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'browse'
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const fileInputRef = useRef(null);
  const fileReaderRef = useRef(null);

  // Validate email format and domain
  const validateEmail = (email, validDomains = []) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return false;
    }

    const domain = email.split('@')[1].toLowerCase();

    return validDomains.some(
      (validDomain) => validDomain.toLowerCase() === domain,
    );
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSendAssessment = async () => {
    if (isSending) return;
    try {
      setIsSending(true);
      const data = {
        assessment_id: assessmentId,
        candidates: candidates.filter((c) => c.status === 'matched'),
      };

      const responseData = await grantAssessmentAccess(data);
      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleBackToHome = () => {
    setShowSuccessModal(false);
    router.push('/dashboard');
  };

  const handleClose = () => {
    setShowSuccessModal(false);
  }

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // Abort any previous CSV processing
    if (fileReaderRef.current) {
      fileReaderRef.current.abort();
      fileReaderRef.current = null;
    }

    // Immediately clear the previous upload
    setCandidates([]);
    setIsFileUploaded(false);

    processCSVFile(file);

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Process CSV file
  const processCSVFile = (file) => {
    const reader = new FileReader();

    fileReaderRef.current = reader;

    reader.onload = (e) => {
      const content = e.target?.result;

      if (typeof content !== 'string') {
        return;
      }

      const rows = content
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);

      if (rows.length < 2) {
        setCandidates([]);
        setIsFileUploaded(false);
        return;
      }

      const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());

      const nameIndex = headers.indexOf('name');
      const emailIndex = headers.indexOf('email');

      if (nameIndex === -1 || emailIndex === -1) {
        setCandidates([]);
        setIsFileUploaded(false);

        alert('Name and email columns are required!');

        return;
      }

      const newUsers = [];
      const processedEmails = new Set();

      rows.slice(1).forEach((row) => {
        const columns = row.split(',').map((col) => col.trim());

        const name = columns[nameIndex];
        const email = columns[emailIndex]?.toLowerCase();

        if (!name || !email) {
          return;
        }

        // Prevent duplicates inside the uploaded file
        if (processedEmails.has(email)) {
          return;
        }

        // Don't add logged-in user's email
        if (userDetails?.email?.toLowerCase() === email) {
          return;
        }

        processedEmails.add(email);

        newUsers.push({
          name,
          email,
          status: validateEmail(email, allowdEmailDomains)
            ? 'matched'
            : 'invalid',
        });
      });

      // Replace the previous file completely
      setCandidates(newUsers);

      // Only show uploaded state after processing finishes
      setIsFileUploaded(true);

      fileReaderRef.current = null;
    };

    reader.onerror = () => {
      setCandidates([]);
      setIsFileUploaded(false);
      fileReaderRef.current = null;

      alert('Unable to read the CSV file.');
    };

    reader.onabort = () => {
      fileReaderRef.current = null;
    };

    reader.readAsText(file);
  };

  const handleSampleCSVDownload = () => {
    const link = document.createElement('a');
    link.href = '/assessment-access/sample.csv';
    link.download = 'assessment-access-sample-csv.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validCandidates = candidates.filter(
    (candidate) => candidate.status === 'matched',
  ).length;
  const totalCandidate = candidates.length;

  return (
    <div className={classes.container}>
      {/* Page Header */}
      <div className={classes.headerRow}>
        <div className={classes.headerTextGroup}>
          <h1 className={classes.pageTitle}>Send assessment to candidates</h1>
          <p className={classes.pageSubtitle}>
            You're SPOC across 2 business units · 3,580 employees, synced live
            from HRMS. Upload a named list for a precise send, or browse by
            business unit and service line below.
          </p>
        </div>
        <button className={classes.sendBtn} onClick={handleSendAssessment} disabled={validCandidates === 0 || isSending}>
          {isSending ? 'Sending Assessment...' : 'Send Assessment to Candidates'}
        </button>
      </div>

      {/* Tab Switcher */}
      <div className={classes.tabContainer}>
        <button
          className={`${classes.tabButton} ${activeTab === 'browse' ? classes.activeTab : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse and select from the organization
        </button>
        <button
          className={`${classes.tabButton} ${activeTab === 'upload' ? classes.activeTab : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload a candidate list
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' ? (
        <div className={classes.uploadSection}>
          <div className={classes.contentCard}>
            <div className={classes.cardHeader}>
              <svg
                className={classes.uploadIcon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <h2 className={classes.cardTitle}>Upload a candidate list</h2>
            </div>
            <p className={classes.cardDescription}>
              The fastest way to send to an exact, named set. CSV of employee
              emails — Shifu matches each row against the org roster regardless
              of business unit or service line.
            </p>
            <div className={classes.cardActions}>
              <button className={classes.sampleBtn} onClick={handleSampleCSVDownload}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
                Sample CSV
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className={classes.fileInput}
                accept=".csv"
                onChange={handleFileChange}
              />
              <button
                className={classes.chooseFileBtn}
                onClick={handleFileUpload}
              >
                Choose file (candidates.csv)
              </button>
            </div>

            {/* Success Message appears after upload */}
            {isFileUploaded && (
              <div className={classes.uploadSummary}>
                <span className={classes.summaryGreen}>
                  ✓ {validCandidates} of {totalCandidate} matched by email and
                  added to the send list
                </span>
                <span className={classes.summaryDivider}> · </span>
                <span className={classes.summaryRed}>
                  {totalCandidate - validCandidates} not found in the org roster
                </span>
              </div>
            )}
          </div>

          {/* Candidates Table appears after upload */}
          {isFileUploaded && (
            <div className={classes.candidatesContainer}>
              <div className={classes.candidatesHeader}>
                <h3 className={classes.candidatesTitle}>Candidates</h3>
                <span className={classes.candidatesCount}>97 candidates</span>
              </div>

              <div className={classes.tableWrapper}>
                <table className={classes.candidatesTable}>
                  <thead>
                    <tr>
                      <th width="25%">Name</th>
                      <th width="55%">Email</th>
                      <th width="20%">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate, idx) => (
                      <tr
                        key={idx}
                        className={
                          candidate.status === 'invalid'
                            ? classes.rowInvalid
                            : ''
                        }
                      >
                        <td>{candidate.name}</td>
                        <td>{candidate.email}</td>
                        <td>
                          {candidate.status === 'matched' ? (
                            <span className={classes.statusMatched}>
                              Matched
                            </span>
                          ) : (
                            <span className={classes.statusInvalid}>
                              <InvalidIcon /> Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={classes.comingSoonCard}>
          <div className={classes.comingSoonIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D4B254"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h2 className={classes.comingSoonTitle}>Coming Soon</h2>
          <p className={classes.comingSoonText}>
            We're currently building out the organization browser. For now,
            please use the CSV upload method to send your assessments!
          </p>
        </div>
      )}

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className={classes.modalOverlay} onClick={handleClose}>
          <div className={classes.modalContent}>
            <div className={classes.modalHeader}>
              <CheckCircleIcon />
              <h3 className={classes.modalTitle}>Email Sent Successfully</h3>
            </div>
            <button className={classes.homeBtn} onClick={handleBackToHome}>
              Back To Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShifuSendAssessment;
