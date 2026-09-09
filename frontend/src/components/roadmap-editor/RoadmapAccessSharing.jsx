import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './RoadmapAccessSharing.module.css';
import searchIcon from '@/assets/access-management/search.svg';
import closeIcon from '@/assets/access-management/x.svg';
import uploadIcon from '@/assets/access-management/upload.svg';
import userAvatar from '@/assets/access-management/user-avatar.svg';
import userIcon from '@/assets/access-management/user.svg';
import questionMarkIcon from '@/assets/access-management/question-mark-icon-help.svg';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { v4 as uuidv4 } from 'uuid';
import { useNotification } from '@/hooks/useNotification';
import { useConfirm } from '@/context/ConfirmationContext';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import Button from '../ui/Button';
import {
  getSharedRoadmapData,
  grantAccess,
  revokeAccess,
  searchRoadmapByTitle,
} from '@/service/roadmapAccess.service';

function debounce(func, delay) {
  let timer;
  const debouncedFn = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };

  // Add a cancel method to the debounced function
  debouncedFn.cancel = function () {
    clearTimeout(timer);
  };

  return debouncedFn;
}

const TABS = [
  { name: 'Grant Access', value: 'grant' },
  { name: 'Already Shared With', value: 'shared' },
  { name: 'Grant Editor access', value: 'editor_access' },
];

// Animation variants
const animationVariants = {
  backdrop: {
    hidden: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
  },
  modal: {
    hidden: {
      // y: 20,
      scale: 0.95,
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
    visible: {
      // y: 0,
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
  },
};

/**
 *
 * @returns {JSX.Element}
 * @description This component is used to manage the access of roadmaps. It allows users to search for roadmaps, grant access to other users, and view the users with whom the roadmap has already been shared.
 * @component
 * @example
 * <RoadmapAccessSharing />
 */
const RoadmapAccessSharing = ({
  source = 'dashboard',
  currentRoadmap = {},
  onCancel,
}) => {
  const userDetails = useAuthStore((s) => s.userDetails);
  const {
    showNotification,
    showLoadingNotification,
    resolveNotification,
    rejectNotification,
  } = useNotification();

  // State for the roadmap search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // State for the tabs
  const [activeTab, setActiveTab] = useState('grant');

  // State for emails
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState([]);
  const [showAddEmailButton, setShowAddEmailButton] = useState(false);
  const [emailSearchInput, setEmailSearchInput] = useState('');
  const [notifyPeopleChecked, setNotifyPeopleChecked] = useState(false);

  // State for shared users
  const [sharedUsers, setSharedUsers] = useState([]);
  const [sharedUserSearchInput, setSharedUserSearchInput] = useState('');
  const [sharedUserRoleFilterName, setSharedUserRoleFilterName] =
    useState('all');

  // State for editor access tab
  const [editorEmailInput, setEditorEmailInput] = useState('');
  const [editorEmails, setEditorEmails] = useState([]);
  const [editorEmailSearchInput, setEditorEmailSearchInput] = useState('');
  const [notifyEditorChecked, setNotifyEditorChecked] = useState(false);

  // State for api calling indecator
  const [isApiCalling, setIsApicalling] = useState(false);

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Ref for file input
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

  // Ref for search
  const searchRef = useRef(null);

  // API call to get dearch result against query
  const getSearchResult = async (query) => {
    try {
      const responseData = await searchRoadmapByTitle(query);
      const searchResult = responseData?.result || [];
      if (searchResult.length !== 0) {
        setSearchResults(searchResult);
        setShowSearchResults(true);
      }
    } catch (error) {
    } finally {
    }
  };

  /**
   * Debounced function to handle search input change
   * @param {string} query - The search query entered by the user.
   */
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.trim() !== '') {
        getSearchResult(query);
      }
    }, 500),
    [],
  );

  // Handle search input change
  const handleSearchChange = async (e) => {
    cleanup();
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === '') {
      // Cancel any pending debounced call
      if (searchRef.current && searchRef.current.cancel) {
        searchRef.current.cancel();
      }
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    debouncedSearch(query);
  };

  // Handle roadmap selection
  const handleRoadmapSelect = (roadmap) => {
    setSelectedRoadmap(roadmap);
    setSearchQuery(roadmap.title);
    setShowSearchResults(false);
  };

  const cleanup = () => {
    setSelectedRoadmap(null);
    setActiveTab('grant');
    setEmails([]);
    setSharedUsers([]);
    setEmailSearchInput('');
    setSharedUserSearchInput('');
    setSharedUserRoleFilterName('all');
    setFilterMenuOpen(false);
  };

  // Handle email input change
  const handleEmailInputChange = (e) => {
    setEmailInput(e.target.value.toLowerCase());
    setShowAddEmailButton(
      validateEmail(e.target.value) && userDetails?.email !== e.target.value,
    );
  };

  // Handle email input keydown (Enter)
  const handleEmailInputKeyDown = (e) => {
    if (e.key === 'Enter' && emailInput.trim() !== '') {
      if (validateEmail(emailInput) && userDetails?.email !== emailInput) {
        addEmail(emailInput);
        setEmailInput('');
        setShowAddEmailButton(false);
      }
    }
  };

  // Validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Add email to the list
  const addEmail = (email) => {
    if (!emails.includes(email)) {
      setEmails([...emails, email]);
    }
  };

  // Remove email from the list
  const removeEmail = (email) => {
    setEmails(emails.filter((e) => e !== email));
  };

  // Handle CSV upload button click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddEmailClick = () => {
    if (validateEmail(emailInput) && userDetails?.email !== emailInput) {
      addEmail(emailInput);
      setEmailInput('');
      setShowAddEmailButton(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processCSVFile(file);
    }
    fileInputRef.current.value = '';
  };

  // Process CSV file
  const processCSVFile = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result;
      const rows = content
        .split('\n')
        .map((row) => row.trim())
        .filter((row) => row);

      if (rows.length < 2) return;
      const headers = rows[0].split(',').map((h) => h.trim());

      const emailIndex = headers.indexOf('email'); // Find index of "email" column

      if (emailIndex === -1) {
        showNotification('error', 'Email column not found!');
        return;
      }
      const newEmails = [];

      rows.slice(1).map((row) => {
        const columns = row.split(',').map((col) => col.trim());
        const email = columns[emailIndex].toLowerCase();
        if (
          email &&
          validateEmail(email) &&
          !emails.includes(email) &&
          userDetails?.email !== email
        ) {
          newEmails.push(email);
        }
      });

      if (newEmails.length > 0) {
        setEmails([...emails, ...newEmails]);
      }
    };

    reader.readAsText(file);
  };

  const handleSampleCSVDownload = () => {
    const link = document.createElement('a');
    link.href = '/access-management/sample-csv.csv';
    link.download = 'access-management-sample-user-csv-for-setu-roadmap.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.add(styles.dragOver);
    }
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    e.preventDefault();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove(styles.dragOver);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();

    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove(styles.dragOver);
    }

    const files = e.dataTransfer.files;

    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        processCSVFile(file);
      }
    }
  };

  // Handle done button click
  const handleDoneClick = async () => {
    // show notification to user
    const toastId = uuidv4();
    showLoadingNotification(toastId, 'Granting access. Please wait');

    try {
      setIsApicalling(true);

      const access = emails.reduce((res, email) => {
        res.push({
          email: email,
          level: 'viewer',
          sharing_mode: 'access_shared_by_admin',
        });
        return res;
      }, []);

      const responseData = await grantAccess(
        selectedRoadmap?.r_id,
        access,
        notifyPeopleChecked,
      );
      resolveNotification(toastId, `${responseData?.message}`);
      setEmails([]);
    } catch (error) {
      rejectNotification(toastId, 'Something went wrong. Please try again');
    } finally {
      setIsApicalling(false);
      setNotifyPeopleChecked(false);
    }
  };

  /**
   *
   * @param {Object} user is the user object containing user details
   * @description This function is used to revoke access from a user. It sends a request to the server to revoke access for the specified user and updates the shared users list accordingly.
   */
  const confirm = useConfirm();

  const handleUserAccessRevoke = async (user) => {
    const confirmed = await confirm({
      type: 'revoke-access-confirmation',
      title: 'Access Revoke Confirmation',
      message: `Are you sure you want to revoke access of <strong>${user.email}</strong> to <strong>${selectedRoadmap?.title} roadmap</strong>?`,
    });

    if (confirmed) {
      // show notification to user
      const toastId = uuidv4();
      showLoadingNotification(toastId, 'Revoking access. Please wait');

      try {
        const responseData = await revokeAccess(selectedRoadmap?.r_id, [
          user.email,
        ]);
        resolveNotification(toastId, `${responseData?.message}`);
        setSharedUsers((prev) => prev.filter((u) => u.email !== user.email));
      } catch (error) {
        rejectNotification(toastId, 'Something went wrong. Please try again');
      } finally {
      }
    }
  };

  // Editor Access tab
  // Handle email input change
  const handleEditorEmailInputChange = (e) => {
    setEditorEmailInput(e.target.value.toLowerCase());
  };

  // Handle email input keydown (Enter)
  const handleEditorEmailInputKeyDown = (e) => {
    if (e.key === 'Enter' && editorEmailInput.trim() !== '') {
      if (
        validateEmail(editorEmailInput) &&
        userDetails?.email !== editorEmailInput
      ) {
        addEditorEmail(editorEmailInput);
        setEditorEmailInput('');
      }
    }
  };

  const handleAddEditorEmailClick = () => {
    if (
      validateEmail(editorEmailInput) &&
      userDetails?.email !== editorEmailInput
    ) {
      addEditorEmail(editorEmailInput);
      setEditorEmailInput('');
    }
  };

  // Add editor email to the list
  const addEditorEmail = (email) => {
    if (!editorEmails.includes(email)) {
      setEditorEmails([...editorEmails, email]);
    }
  };

  // Remove editor email from the list
  const removeEditorEmail = (email) => {
    setEditorEmails(editorEmails.filter((e) => e !== email));
  };

  // Handle done button click
  const handleEditorAccessGranting = async () => {
    // show notification to user
    const toastId = uuidv4();
    showLoadingNotification(toastId, 'Granting editor access. Please wait');

    try {
      setIsApicalling(true);

      const access = editorEmails.reduce((res, email) => {
        res.push({
          email: email,
          level: 'editor',
          sharing_mode: 'collaboration',
        });
        return res;
      }, []);
      const responseData = await grantAccess(
        selectedRoadmap?.r_id,
        access,
        notifyEditorChecked,
      );
      resolveNotification(toastId, `${responseData?.message}`);
      setEditorEmails([]);
    } catch (error) {
      rejectNotification(toastId, 'Something went wrong. Please try again');
    } finally {
      setIsApicalling(false);
      setNotifyEditorChecked(false);
    }
  };

  const handleClickOnBackdrop = (e) => {
    e.stopPropagation();
    onCancel();
  };

  const visibleTabs = TABS.filter((tab, index) => {
    if (tab.value === 'editor_access') {
      return selectedRoadmap?.owner;
    }
    return true;
  });

  const filteredEmailList = useMemo(() => {
    if (!emailSearchInput) return emails;
    return emails.filter((email) =>
      email.toLowerCase().includes(emailSearchInput.toLowerCase()),
    );
  }, [emails, emailSearchInput]);

  const filteredEditorEmailList = useMemo(() => {
    if (!editorEmailSearchInput) return editorEmails;
    return editorEmails.filter((email) =>
      email.toLowerCase().includes(editorEmailSearchInput.toLowerCase()),
    );
  }, [editorEmails, editorEmailSearchInput]);

  const filteredSharedUserList = useMemo(() => {
    if (!sharedUserSearchInput && sharedUserRoleFilterName === 'all') {
      return sharedUsers;
    }
    return sharedUsers.filter((user) => {
      const result = user.email
        .toLowerCase()
        .includes(sharedUserSearchInput.toLowerCase());
      const matchesRole =
        sharedUserRoleFilterName === 'all'
          ? true
          : sharedUserRoleFilterName === 'editor'
            ? ['editor', 'owner'].includes(user.access)
            : user.access === sharedUserRoleFilterName;
      return result && matchesRole;
    });
  }, [sharedUsers, sharedUserSearchInput, sharedUserRoleFilterName]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const target = e.target;
      const searchContainer = document.getElementById('search-container');

      if (searchContainer && !searchContainer.contains(target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    searchRef.current = debouncedSearch;
    return () => {
      if (searchRef.current && searchRef.current.cancel) {
        searchRef.current.cancel();
      }
    };
  }, [debouncedSearch]);

  useEffect(() => {
    const getRoadmapAccessData = async () => {
      try {
        const responseData = await getSharedRoadmapData(selectedRoadmap?.r_id);
        setSharedUsers(responseData?.users || []);
      } catch (error) {
        console.log(error);
      } finally {
      }
    };
    if (activeTab === 'shared' && userDetails && selectedRoadmap) {
      getRoadmapAccessData();
    }
  }, [activeTab, userDetails, selectedRoadmap]);

  useEffect(() => {
    if (source === 'canvas') {
      setShowSearchBar(false);
      setSelectedRoadmap(currentRoadmap);
    }
  }, [source]);

  return (
    <>
      {/* <Header /> */}
      <motion.div
        className={styles.container}
        onClick={handleClickOnBackdrop}
        variants={animationVariants.backdrop}
        initial="hidden"
        animate="visible"
        exit="hidden"
        key="backdrop"
      >
        <motion.div
          className={styles.accessPage}
          onClick={(e) => e.stopPropagation()}
          variants={animationVariants.modal}
          initial="hidden"
          animate="visible"
          exit="hidden"
          key="modal"
        >
          <h1 className={styles.title}>Manage Roadmap Access</h1>

          {/* Roadmap Search */}
          {showSearchBar && (
            <div id="search-container" className={styles.searchContainer}>
              <div
                className={`${styles.searchInputWrapper} ${showSearchResults ? styles.searchInputWrapperBorderChange : ''}`}
              >
                {/* <Search className={styles.searchIcon} size={18} /> */}
                <Image
                  src={searchIcon}
                  alt="search-icon"
                  className={styles.searchIcon}
                />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search for a roadmap"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>

              {showSearchResults && searchResults.length > 0 && (
                <div className={styles.searchResultsParent}>
                  <div className={styles.searchResults}>
                    {searchResults.map((roadmap, index) => (
                      <div
                        key={index}
                        className={styles.searchResultItem}
                        onClick={() => handleRoadmapSelect(roadmap)}
                      >
                        {roadmap?.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <>
            {/* Tabs */}
            <div
              className={styles.tabs}
              style={{ width: visibleTabs.length === 3 ? '100%' : 'auto' }}
            >
              {visibleTabs.map((tab) => (
                <button
                  key={tab.value}
                  className={styles.tab}
                  onClick={() => setActiveTab(tab.value)}
                >
                  <span
                    className={`${styles.label} ${tab.value === activeTab ? styles.active : ''}`}
                  >
                    {tab.name}
                  </span>
                  {activeTab === tab.value && (
                    <motion.div
                      layoutId="active-tab"
                      className={styles.activeTab}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                        duration: 3,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
              {activeTab === 'grant' ? (
                <div className={styles.grantAccessTab}>
                  <div className={styles.emailInputContainer}>
                    <input
                      type="email"
                      className={styles.emailInput}
                      placeholder="Enter email address and press Enter"
                      value={emailInput}
                      onChange={handleEmailInputChange}
                      onKeyDown={handleEmailInputKeyDown}
                      disabled={!selectedRoadmap}
                    />
                    {showAddEmailButton && (
                      <Button
                        variant="primary"
                        size="sm"
                        className={styles.uploadButton}
                        onClick={handleAddEmailClick}
                        disabled={!selectedRoadmap}
                      >
                        <span>Add Email</span>
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      className={styles.uploadButton}
                      onClick={handleUploadClick}
                      disabled={!selectedRoadmap}
                      // tabIndex={0}
                    >
                      {/* <Upload size={16} /> */}
                      <Image
                        src={uploadIcon}
                        className={styles.icon}
                        alt="upload-icon"
                      />
                      <span>Upload CSV</span>
                    </Button>
                    {emails.length > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        className={styles.clearAllButton}
                        onClick={() => setEmails([])}
                      >
                        <span>Clear All</span>
                      </Button>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className={styles.fileInput}
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                  </div>

                  <div
                    ref={dropAreaRef}
                    className={styles.emailListContainer}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {emails.length > 0 && (
                      <div className={styles.accessUtilityWrapper}>
                        <AccessUtilityBanner
                          users={emails}
                          searchValue={emailSearchInput}
                          onSearchChange={(e) =>
                            setEmailSearchInput(
                              e.target.value.trim().toLowerCase(),
                            )
                          }
                          resultCount={
                            emailSearchInput !== ''
                              ? filteredEmailList.length
                              : null
                          }
                          filterMenuOpen={filterMenuOpen}
                          setFilterMenuOpen={setFilterMenuOpen}
                        />
                      </div>
                    )}
                    {emails.length > 0 ? (
                      <div>
                        <div className={styles.emailList}>
                          {filteredEmailList.map((email, index) => (
                            <div key={index} className={styles.emailItem}>
                              <div>
                                <span>{email}</span>
                              </div>
                              <button
                                className={styles.removeEmailButton}
                                onClick={() => removeEmail(email)}
                              >
                                {/* <X size={14} /> */}
                                <Image
                                  src={closeIcon}
                                  alt="close-icon"
                                  className={styles.icon}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.dropAreaMessage}>
                        <p>
                          Enter emails above or drag and drop a CSV file here
                        </p>
                        <p className={styles['dam-secondary']}>
                          <span>Click here to download</span>
                          <button
                            onClick={handleSampleCSVDownload}
                            className={styles.sampleCSVLink}
                          >
                            Sample CSV file
                          </button>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* <div className={styles.publicAccessCt}>
                    <div>
                      <label className={styles.publicAccessInner}>
                      <input type="checkbox" className={styles.publicAccessCheckbox} disabled={!selectedRoadmap} />
                      <span className={styles.checkmark}></span>
                      <span className={styles.publicAccessSpan1}>Publish on Course Page </span>
                      <span className={styles.publicAccessSpan2}>(anyone on the internet can view this)</span>
                      </label>
                    </div>
                    <button className={styles.copyLinkBtn} disabled={!selectedRoadmap}>
                      <Image src={copyLinkIcon} alt="" />
                      <span>Copy Public Link</span>
                    </button>
                  </div> */}
                  {emails.length > 0 && (
                    <>
                      <div className={styles.notifyCt}>
                        <input
                          type="checkbox"
                          name="notify"
                          id="notify"
                          className={styles.notifyCheckbox}
                          checked={notifyPeopleChecked}
                          onChange={(e) =>
                            setNotifyPeopleChecked(e.target.checked)
                          }
                        />
                        <p
                          className={styles.notifyText}
                          onClick={() =>
                            setNotifyPeopleChecked(!notifyPeopleChecked)
                          }
                        >
                          Notify People
                        </p>
                        <Image
                          src={questionMarkIcon}
                          alt="help"
                          className={styles.helpIcon}
                          data-tooltip-id="access-mgmt-tooltip"
                          data-tooltip-content="Checking this will send a confirmation email stating that they have granted access to the roadmap to above email IDs"
                          data-tooltip-place="top"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : activeTab === 'shared' ? (
                <div className={styles.sharedWithTab}>
                  <div className={styles.sharedWithTabInner}>
                    {sharedUsers.length != 0 && (
                      <AccessUtilityBanner
                        users={sharedUsers}
                        searchValue={sharedUserSearchInput}
                        onSearchChange={(e) =>
                          setSharedUserSearchInput(
                            e.target.value.trim().toLowerCase(),
                          )
                        }
                        resultCount={
                          sharedUserSearchInput !== ''
                            ? filteredSharedUserList.length
                            : null
                        }
                        hasFilter={true}
                        setSharedUserRoleFilterName={
                          setSharedUserRoleFilterName
                        }
                        sharedUserRoleFilterName={sharedUserRoleFilterName}
                        filterMenuOpen={filterMenuOpen}
                        setFilterMenuOpen={setFilterMenuOpen}
                      />
                    )}
                    {sharedUsers.length > 0 ? (
                      <div className={styles.sharedUsersList}>
                        {filteredSharedUserList.map((user, index) => (
                          <div key={index} className={styles.sharedUserItem}>
                            <div className={styles.userAvatar}>
                              <Image src={userAvatar} alt="user-icon" />
                            </div>
                            <div className={styles.userInfo}>
                              <div className={styles.userEmail}>
                                {user.email}
                                {user.access === 'owner' && (
                                  <span className={styles.userOwner}>
                                    owner
                                  </span>
                                )}
                              </div>
                            </div>
                            {user.access !== 'owner' &&
                              user.email !== userDetails.email && (
                                <button
                                  className={`${styles.revokeBtn} ${styles.cancel}`}
                                  onClick={() => handleUserAccessRevoke(user)}
                                >
                                  Revoke
                                </button>
                              )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.noSharedUsers}>
                        <p>
                          {!selectedRoadmap
                            ? `Please select a roadmap from search bar above`
                            : `This roadmap hasn't been shared with anyone yet.`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.grantAccessTab}>
                  <div className={styles.emailInputContainer}>
                    <input
                      type="email"
                      className={styles.emailInput}
                      placeholder="Enter email address and press Enter"
                      value={editorEmailInput}
                      onChange={handleEditorEmailInputChange}
                      onKeyDown={handleEditorEmailInputKeyDown}
                      disabled={!selectedRoadmap}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      className={styles.uploadButton}
                      onClick={handleAddEditorEmailClick}
                      disabled={!selectedRoadmap}
                    >
                      <span>Add Email</span>
                    </Button>
                    {editorEmails.length > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        className={styles.clearAllButton}
                        onClick={() => setEditorEmails([])}
                      >
                        <span>Clear All</span>
                      </Button>
                    )}
                  </div>

                  <div className={styles.emailListContainer}>
                    {editorEmails.length > 0 && (
                      <div className={styles.accessUtilityWrapper}>
                        <AccessUtilityBanner
                          users={editorEmails}
                          searchValue={editorEmailSearchInput}
                          onSearchChange={(e) =>
                            setEditorEmailSearchInput(
                              e.target.value.trim().toLowerCase(),
                            )
                          }
                          resultCount={
                            editorEmailSearchInput !== ''
                              ? filteredEditorEmailList.length
                              : null
                          }
                          filterMenuOpen={filterMenuOpen}
                          setFilterMenuOpen={setFilterMenuOpen}
                        />
                      </div>
                    )}
                    {editorEmails.length > 0 ? (
                      <div className={styles.emailList}>
                        {filteredEditorEmailList.map((email, index) => (
                          <div key={index} className={styles.emailItem}>
                            <div>
                              <span>{email}</span>
                            </div>
                            <button
                              className={styles.removeEmailButton}
                              onClick={() => removeEditorEmail(email)}
                            >
                              {/* <X size={14} /> */}
                              <Image
                                src={closeIcon}
                                alt=""
                                className={styles.icon}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.editorDropAreaMessage}>
                        <p>
                          Enter emails above to grant <strong>Editor</strong>{' '}
                          access
                        </p>
                        <p>
                          Note : Only <strong>Admins</strong> can get editor
                          access
                        </p>
                      </div>
                    )}
                  </div>

                  {editorEmails.length > 0 && (
                    <div className={styles.notifyCt}>
                      <input
                        type="checkbox"
                        name="notify"
                        id="notify-editor"
                        className={styles.notifyCheckbox}
                        checked={notifyEditorChecked}
                        onChange={(e) =>
                          setNotifyEditorChecked(e.target.checked)
                        }
                      />
                      <p className={styles.notifyText}>Notify People</p>
                      <Image
                        src={questionMarkIcon}
                        alt="help"
                        className={styles.helpIcon}
                        data-tooltip-id="access-mgmt-tooltip"
                        data-tooltip-content="Checking this will send the above email IDs a confirmation email stating that they have granted access to the roadmap"
                        data-tooltip-place="top"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
          <div
            className={styles.buttonCt}
            style={{
              justifyContent: activeTab === 'shared' ? 'center' : 'flex-end',
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              className={`${styles.btn} ${styles.cancel}`}
              onClick={onCancel}
            >
              <span>Cancel</span>
            </Button>
            {activeTab !== 'shared' && (
              <Button
                variant="primary"
                size="sm"
                className={`${styles.btn} ${styles.done}`}
                onClick={
                  activeTab === 'grant'
                    ? handleDoneClick
                    : handleEditorAccessGranting
                }
                disabled={
                  activeTab === 'grant'
                    ? emails.length === 0 || isApiCalling
                    : editorEmails.length === 0 || isApiCalling
                }
              >
                <span>Done</span>
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>

      <Tooltip
        id="access-mgmt-tooltip"
        style={{
          backgroundColor: '#000000',
          color: '#FFFFFF',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '12px',
          fontWeight: '600',
          padding: '5px',
          zIndex: 1001,
          width: '300px',
        }}
        noArrow
        delayShow={100}
        className={styles['custom-tooltip-animation']}
      />
    </>
  );
};

const AccessUtilityBanner = ({
  users,
  searchValue,
  onSearchChange,
  resultCount,
  setSharedUserRoleFilterName,
  sharedUserRoleFilterName,
  hasFilter = false,
  filterMenuOpen,
  setFilterMenuOpen,
}) => {
  const ROLES = ['All', 'Owner', 'Viewer', 'Editor'];
  const filterMenuAnimationVariants = {
    hidden: {
      maxHeight: 0,
      transition: {
        duration: 0.4,
      },
    },
    visible: {
      maxHeight: 300,
      transition: {
        duration: 0.4,
      },
    },
  };

  const getUserCountByLevel = (role) => {
    if (role === 'All') return users.length;
    else if (role === 'Editor')
      return users.filter((u) => ['owner', 'editor'].includes(u.access)).length;
    return users.filter((u) => u.access === role.toLowerCase()).length;
  };

  const handleRoleChange = (role) => {
    setSharedUserRoleFilterName(role.toLowerCase());
  };

  return (
    <>
      <div className={styles.accessUserCountCt}>
        <div className={styles.accessUserCountInner}>
          <Image
            src={userIcon}
            alt="user-icon"
            className={styles.accessUserUserIcon}
          />
          <div className={styles.accessUserCount}>{users.length}</div>
        </div>
        <div className={styles.userSearchCt}>
          <Image src={searchIcon} alt="search-icon" />
          <input
            type="text"
            className={styles.userSearchInput}
            placeholder="Search here...."
            value={searchValue}
            onChange={onSearchChange}
          />

          {resultCount !== null && <p>{resultCount} result</p>}
        </div>
        {hasFilter && (
          <button
            className={`${styles.roleFilterButtonCt} ${filterMenuOpen ? styles.open : ''}`}
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          >
            <Filter />
          </button>
        )}
      </div>
      <AnimatePresence>
        {hasFilter && filterMenuOpen && (
          <motion.div
            className={styles.roleFilterCt}
            variants={filterMenuAnimationVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {ROLES.map((role) => (
              <div
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`${styles.roleCt} ${sharedUserRoleFilterName === role.toLowerCase() ? styles.selected : ''}`}
              >
                {role} - {getUserCountByLevel(role)}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Filter = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        d="M3.75 7C3.75 6.80109 3.82902 6.61032 3.96967 6.46967C4.11032 6.32902 4.30109 6.25 4.5 6.25H19.5C19.6989 6.25 19.8897 6.32902 20.0303 6.46967C20.171 6.61032 20.25 6.80109 20.25 7C20.25 7.19891 20.171 7.38968 20.0303 7.53033C19.8897 7.67098 19.6989 7.75 19.5 7.75H4.5C4.30109 7.75 4.11032 7.67098 3.96967 7.53033C3.82902 7.38968 3.75 7.19891 3.75 7ZM6.25 12C6.25 11.8011 6.32902 11.6103 6.46967 11.4697C6.61032 11.329 6.80109 11.25 7 11.25H17C17.1989 11.25 17.3897 11.329 17.5303 11.4697C17.671 11.6103 17.75 11.8011 17.75 12C17.75 12.1989 17.671 12.3897 17.5303 12.5303C17.3897 12.671 17.1989 12.75 17 12.75H7C6.80109 12.75 6.61032 12.671 6.46967 12.5303C6.32902 12.3897 6.25 12.1989 6.25 12ZM9.25 17C9.25 16.8011 9.32902 16.6103 9.46967 16.4697C9.61032 16.329 9.80109 16.25 10 16.25H14C14.1989 16.25 14.3897 16.329 14.5303 16.4697C14.671 16.6103 14.75 16.8011 14.75 17C14.75 17.1989 14.671 17.3897 14.5303 17.5303C14.3897 17.671 14.1989 17.75 14 17.75H10C9.80109 17.75 9.61032 17.671 9.46967 17.5303C9.32902 17.3897 9.25 17.1989 9.25 17Z"
        fill="currentColor"
      />
    </svg>
  );
};

export default RoadmapAccessSharing;
