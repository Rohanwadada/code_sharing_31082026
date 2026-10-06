'use client';

import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
} from 'react';

// Assets
import dakshImg from '@/assets/asset-daksh/dakshimg.png';
import previousIcon from '@/assets/assessment-attempt/left.svg';
import closeIcon from '@/assets/assessment-attempt/close.svg';
import hintIcon from '@/assets/assessment-attempt/hint.svg';
import loader from '@/assets/assessment-attempt/loader.gif';
import alertIcon from '@/assets/assessment-attempt/gear.svg';
import gifIcon from '@/assets/assessment-attempt/warning.gif';
import questionIcon from '@/assets/assessment-attempt/questions.svg';
import totalPointsIcon from '@/assets/assessment-attempt/total-points.svg';
import timeLeftIcon from '@/assets/assessment-attempt/time-left.svg';
import next from '@/assets/assessment-attempt/next.svg';

// CSS Module
import classes from './Questions.module.css';

// Contexts & Modules
import { QuestionContext } from '@/context/QuestionContext';
import { useUserActivity } from '@/context/UserActivityContext';
// import { SERVER_URL } from "../index.js";
import { eventBus } from '@/components/assessment-attempt/Modal';
import FeedbackForm from '@/components/assessment-attempt/FeedbackForm.jsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useSecurity } from './Security';
import { evaluateExam } from '@/service/assessmentAttempt.service';
import Header from './Header';

const SERVER_URL = process.env.NEXT_PUBLIC_API_SERVER_URL;

const cleanCode = (code) => {
  if (!code) return null;
  const trimmed = String(code).trim();
  if (['null', 'none', 'nan', 'undefined', 'null\n'].includes(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed;
};

const cleanHint = (hint) => {
  if (!hint) return null;
  const trimmed = String(hint).trim();
  if (['null', 'none', 'nan', 'undefined', 'null\n'].includes(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed;
};

const Questions = ({
  ref,
  // setShowModal,
  // setModalMessage,
  // setCloseModal,
  // setActivateEventListner,
}) => {
  // Expose submission method via ref for tab-switching auto submit
  useImperativeHandle(ref, () => ({
    submitTest: async () => {
      return await handleConfirmSubmit('Toggle switching');
    },
  }));

  const {
    setShowModal,
    setModalMessage,
    setCloseModal,
    setActivateEventListner,
  } = useSecurity();

  // const [activateEventListner, setActivateEventListner] = useState(false);

  const userDetails = useAuthStore((s) => s.userDetails);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Parameters
  const subject_name = searchParams.get('exam_name');
  const test_Id = searchParams.get('test_id');
  const testName = searchParams.get('exam_name');
  const test_type = searchParams.get('t');
  const total_questions = searchParams.get('total_questions');

  // State Management
  const [showInstructions, setShowInstructions] = useState(true);
  const [showModal, setIsShowModal] = useState(false);
  const [isQuestions, setIsQuestions] = useState([]);
  const [viewMode, setViewMode] = useState('test'); // 'test' | 'questions'
  const [currentIndex, setCurrentIndex] = useState(() => {
    const storedCurrentIndex = sessionStorage.getItem('current_question_index');
    return storedCurrentIndex ? Number(storedCurrentIndex) : 0;
  });

  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isCountAttempted, setIsCountAttempted] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isSubmitPopupVisible, setIsSubmitPopupVisible] = useState(false);
  const [currentHints, setCurrentHints] = useState([]);
  const initialTimeRef = useRef(null);
  const [submitMode, setSubmitMode] = useState('');
  const [isExamActive, setIsExamActive] = useState(false);

  const [timers, setTimers] = useState(() => {
    const storedTimer = sessionStorage.getItem('test_timer');
    return storedTimer ? JSON.parse(storedTimer) : {};
  });

  const [activeQuestion, setActiveQuestion] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  // const { logActivity } = useUserActivity();
  const [examStartTime, setExamStartTime] = useState(null);
  const [examEndTime, setExamEndTime] = useState(null);
  const [showChild, setShowChild] = useState(false);

  const { testDetails, setTestDetails } = useContext(QuestionContext) ?? {
    testDetails: null,
    setTestDetails: () => { },
  };

  // Sync test details
  useEffect(() => {
    setTestDetails(
      (prev) => prev ?? JSON.parse(sessionStorage.getItem('test_details')),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize timer
  useEffect(() => {
    const storedSeconds = sessionStorage.getItem('exam_timer_seconds');
    if (storedSeconds !== null && Number(storedSeconds)) {
      console.log('In not null seconds.....');
      console.log(Number(storedSeconds));
      setSeconds(Number(storedSeconds));
    } else {
      console.log('In null  seconds.....');
      const testDetailsStored = JSON.parse(
        sessionStorage.getItem('test_details'),
      );
      const duration =
        testDetailsStored?.test_details?.exam_duration_in_seconds;
      console.log('Test duration in seconds first: ', duration);
      if (duration) {
        console.log('Test duration in seconds: ', duration);
        setSeconds(duration);
      }
    }

    handleStartAssessment();
  }, []);

  // Set Exam Start Time and Event Bus Listener
  useEffect(() => {
    setExamStartTime(new Date().toLocaleTimeString());
    const handleSubmitEvent = (message) => handleConfirmSubmit(message);
    eventBus.on('submitEvent', handleSubmitEvent);

    return () => {
      eventBus.off('submitEvent', handleSubmitEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track question active start time
  useEffect(() => {
    if (activeQuestion !== null) {
      setStartTime(Date.now());
    }
  }, [activeQuestion]);

  // Ref for original duration
  useEffect(() => {
    if (initialTimeRef.current === null) {
      initialTimeRef.current = testDetails?.test_details?.original_duration;
    }
  }, [seconds, testDetails]);

  const lastTickRef = useRef(Date.now());

  // Countdown Timer Logic
  useEffect(() => {
    let timer;
    if (isExamActive && seconds > 0) {
      console.log('seconds gt 0 ......', seconds);
      timer = setInterval(() => {
        const now = Date.now();
        const diffInSeconds = Math.floor((now - lastTickRef.current) / 1000);

        if (diffInSeconds >= 1) {
          setSeconds((prevSeconds) => {
            const updatedSeconds = prevSeconds - diffInSeconds;
            sessionStorage.setItem('exam_timer_seconds', updatedSeconds);
            saveTestProgress(isQuestions);
            return updatedSeconds > 0 ? updatedSeconds : 0;
          });
          lastTickRef.current = now;
        }
      }, 1000);
    } else if (isExamActive && seconds <= 0) {
      const autoSubmitExam = async () => {
        await handleConfirmSubmit('Auto Submission');
      };
      autoSubmitExam();
    }

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExamActive, seconds, isQuestions]);

  useEffect(() => {
    console.log('Seconds value changed: ', seconds);
  }, [seconds]);

  // Format and load questions
  useEffect(() => {
    const questions = testDetails?.test_details?.allocated_questions;

    if (questions?.length > 0) {
      const formattedQuestions = questions.map((q, index) => ({
        code: cleanCode(q.question_code || q.code),
        id: index + 1,
        question_id: q.question_id || null,
        question: q.question_text || q.question || `Question ${index + 1}`,
        options: q.options || [],
        attempted: q.attempted || false,
        hints: cleanHint(q.question_hints),
        marks: q.question_marks || '1',
        type: q.type,
        competency: q.competency,
        subcompetency: q.subcompetency,
        visited: index === 0 ? true : q.visited || false,
        complexity_level: q.complexity_level,
      }));

      setIsQuestions(formattedQuestions);
      setSelectedOptions(() => {
        const storedSelectedOptions =
          sessionStorage.getItem('selected_options');
        if (storedSelectedOptions) {
          return JSON.parse(storedSelectedOptions);
        }
        return Array(questions.length).fill(null);
      });

      setLoading(false);
      saveTestProgress(formattedQuestions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testDetails]);

  const handleStartAssessment = () => {
    setShowInstructions(false);
    setIsExamActive(true);
  };

  const generateAnswersArray = () => {
    return isQuestions.map((question, index) => {
      const selectedOptionIndex = selectedOptions[index];
      const selectedOption =
        selectedOptionIndex !== null && selectedOptionIndex !== undefined
          ? question.options[selectedOptionIndex]
          : null;

      const timeSpent = timers[index] || 0;
      const milliseconds = Math.floor((timeSpent % 1) * 1000);
      const seconds = Math.floor(timeSpent % 60);
      const minutes = Math.floor((timeSpent / 60) % 60);
      const hours = Math.floor(timeSpent / 3600);

      const formattedTime = `${String(hours).padStart(2, '0')}:${String(
        minutes,
      ).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(
        milliseconds,
      ).padStart(3, '0')}`;

      return {
        id: question.question_id,
        selected_option: selectedOption,
        time_taken: formattedTime,
        attempted: question.attempted,
        visited: question.visited,
        marks: question.marks,
        competency: question?.competency,
        subcompetency: question?.subcompetency,
      };
    });
  };

  const submitTest = async (payload, testId) => {
    setIsSubmitDisabled(true);
    const apiUrl = `${SERVER_URL}/evaluate-exam`;

    try {
      // const response = await fetch(apiUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      const data = await evaluateExam(payload);

      /* if (!response.ok) {
        // logActivity({
        //   event: 'submit_test',
        //   submit_status: 'failed',
        //   email: JSON.parse(localStorage.getItem('user')).email,
        //   total_time: payload['total_time'],
        //   submission_mode: payload['submission_mode'],
        //   selected_subject: payload['selected_subject'],
        //   attempted_questions: payload['attempted_questions'],
        //   total_questions: payload['total_questions'],
        //   answers: payload['answers'],
        //   source_page: `${pathname}`,
        //   event_timeline: new Date().toLocaleString(),
        // });

        if (
          response.status === 400 &&
          data.error === 'Test already submitted!!'
        ) {
          localStorage.removeItem('test_status');
          sessionStorage.clear();
          setModalMessage(data.error);
          setShowModal(true);
          console.log("1................")
          
          setCloseModal(() => () => router.push('/'));
          return;
        }
        // throw new Error(`Error: ${response.status} ${response.statusText}`);
      } */

      // logActivity({
      //   event: 'submit_test',
      //   submit_status: 'successful',
      //   email: JSON.parse(localStorage.getItem('user')).email,
      //   total_time: payload['total_time'],
      //   submission_mode: payload['submission_mode'],
      //   selected_subject: payload['selected_subject'],
      //   attempted_questions: payload['attempted_questions'],
      //   total_questions: payload['total_questions'],
      //   answers: payload['answers'],
      //   source_page: `${pathname}`,
      //   event_timeline: new Date().toLocaleString(),
      // });

      sessionStorage.clear();
      localStorage.removeItem('test_status');

      // exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      router.replace('/');
      router.push(`/assessment/result/${testId}`);
      return data;
    } catch (error) {
      console.error('Error submitting test:', error.message);
      if (error?.response) {
        if (
          error.response.status === 400 &&
          data.error === 'Test already submitted!!'
        ) {
          localStorage.removeItem('test_status');
          sessionStorage.clear();
          setModalMessage(data.error);
          setShowModal(true);
          console.log('1................');

          setCloseModal(() => () => router.push('/'));
          return;
        }
      }
    } finally {
      setIsSubmitDisabled(false);
    }
  };

  const handleConfirmSubmit = async (submissionType) => {
    navigateToQuestion(currentIndex);
    const EndTime = new Date().toLocaleTimeString();
    setExamEndTime(EndTime);

    if (submissionType === 'Auto Submission') {
      setSubmitMode(submissionType);
      setIsExamActive(false);
      try {
        const user = userDetails;
        const email = user?.email;

        if (email) {
          const payload = {
            user_email: email,
            testimonial_text: 'auto submission',
            rating: 0,
            captured_form: `setu-assessment_${test_type}_test_${testName}_mcq`,
            roadmap_id: searchParams.get('r') || null,
            node_id: searchParams.get('n') || null,
            project_id: searchParams.get('p') || null,
          };

          await fetch(`${SERVER_URL}/add-testimonial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      setSubmitMode(submissionType);
      setIsExamActive(false);
    }

    const answersArray = generateAnswersArray();
    const payload = {
      email: userDetails.email,
      total_time: formatTime(initialTimeRef.current - seconds),
      submission_mode: submissionType,
      selected_subject: subject_name,
      test_id: test_Id,
      submitted: true,
      attempted_questions: isCountAttempted,
      total_questions: isQuestions.length,
      examStartTime: examStartTime,
      examEndTime: EndTime,
      roadmap_id: searchParams.get('r') || null,
      node_id: searchParams.get('n') || null,
      project_id: searchParams.get('p') || null,
    };

    if (answersArray.length > 0) {
      payload.answers = answersArray;
    }

    try {
      await submitTest(payload, test_Id);
      setIsSubmitPopupVisible(false);
    } catch (error) {
      console.error('Error submitting test:', error);
    }
  };

  // Auto submission on refresh/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isExamActive) return;

      try {
        const answersArray = generateAnswersArray();
        const user = userDetails;
        const email = user?.email;
        if (!email) return;

        const EndTime = new Date().toLocaleTimeString();
        const payload = {
          email,
          total_time: formatTime(initialTimeRef.current - seconds),
          submission_mode: 'Refresh OR Tab/Browser close',
          selected_subject: subject_name,
          test_id: test_Id,
          submitted: true,
          attempted_questions: isCountAttempted,
          total_questions: total_questions,
          examStartTime: examStartTime,
          examEndTime: EndTime,
          answers: answersArray,
        };

        // fetch(`${SERVER_URL}/evaluate-exam`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(payload),
        //   keepalive: true,
        // });

        const data = evaluateExam(payload);

        sessionStorage.setItem('submit_on_reload', 'true');
        localStorage.removeItem('test_status');
      } catch (error) {
        console.error('Auto submission failed:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isExamActive,
    selectedOptions,
    isQuestions,
    seconds,
    timers,
    initialTimeRef,
    test_Id,
    subject_name,
    total_questions,
    isCountAttempted,
  ]);

  useEffect(() => {
    const shouldRedirect =
      sessionStorage.getItem('submit_on_reload') === 'true';
    if (shouldRedirect) {
      sessionStorage.removeItem('submit_on_reload');
      router.push(`/assessment/attempt?exam_name=${testName}&total_questions=${total_questions}&test_id=${allocation_id
        }&test_name=${encodeURIComponent(testName)}`);
    }
  }, [router, test_Id]);

  const handleSubmitClick = () => setIsSubmitPopupVisible(true);
  const handleClosePopup = () => setIsSubmitPopupVisible(false);

  const handleShowHints = (questionIndex) => {
    const questionHints = isQuestions[questionIndex]?.hints || null;
    if (questionHints !== null) {
      setCurrentHints(questionHints);
      setIsPopupVisible(true);
      setIsShowModal(true);
    }
  };

  const hidePopup = () => {
    setIsPopupVisible(false);
    setIsShowModal(false);
  };

  const handleOptionClick = (index, option, currentIndex) => {
    const currentTime = Date.now();
    if (activeQuestion === currentIndex && startTime) {
      const timeSpent = (currentTime - startTime) / 1000;
      setTimers((prevTimers) => ({
        ...prevTimers,
        [currentIndex]: (prevTimers[currentIndex] || 0) + timeSpent,
      }));
    }

    isQuestions[currentIndex].attempted = true;
    countAttempted();

    const updatedSelections = [...selectedOptions];
    updatedSelections[currentIndex] = index;
    setSelectedOptions(updatedSelections);

    setStartTime(Date.now());
    saveTestProgress(isQuestions);
    sessionStorage.setItem(
      'selected_options',
      JSON.stringify(updatedSelections),
    );
  };

  const navigateToQuestion = (questionIndex) => {
    if (activeQuestion !== null && startTime) {
      const timeSpent = (Date.now() - startTime) / 1000;
      setTimers((prevTimers) => ({
        ...prevTimers,
        [activeQuestion]: (prevTimers[activeQuestion] || 0) + timeSpent,
      }));
    }
    setActiveQuestion(questionIndex);
    setStartTime(Date.now());
  };

  const countAttempted = () => {
    let count = 0;
    for (let i = 0; i < isQuestions.length; i++) {
      if (isQuestions[i].attempted === true) {
        count++;
      }
    }
    setIsCountAttempted(count);
  };

  useEffect(() => {
    setProgress(
      Math.ceil((isCountAttempted / (isQuestions.length || 1)) * 100),
    );
  }, [isCountAttempted, isQuestions]);

  useEffect(() => {
    countAttempted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuestions]);

  const nextQuestion = () => {
    if (currentIndex < isQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      sessionStorage.setItem('current_question_index', nextIdx);
      navigateToQuestion(nextIdx);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      sessionStorage.setItem('current_question_index', prevIdx);
      navigateToQuestion(prevIdx);
    }
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const formattedSeconds =
      remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;

    if (hours > 0) {
      const formattedHours = hours < 10 ? `0${hours}` : hours;
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }
    return `${formattedMinutes}:${formattedSeconds}`;
  };

  const saveTestProgress = (questions) => {
    const updatedQuestions = questions.map((q) => {
      const options = q.options || [];
      return {
        ...q,
        options,
        option_1: options[0],
        option_2: options[1],
        option_3: options[2],
        option_4: options[3],
      };
    });

    const test_details = sessionStorage.getItem('test_details');
    if (test_details) {
      let updatedTestDetails = JSON.parse(test_details);
      updatedTestDetails.test_details.allocated_questions = updatedQuestions;
      updatedTestDetails.test_details.duration = seconds;
      sessionStorage.setItem('exam_timer_seconds', seconds);
      sessionStorage.setItem(
        'test_details',
        JSON.stringify(updatedTestDetails),
      );
    }
  };

  useEffect(() => {
    if (isQuestions.length !== 0) {
      isQuestions[currentIndex].visited = true;
      saveTestProgress(isQuestions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    sessionStorage.setItem('test_timer', JSON.stringify(timers));
  }, [timers]);

  useLayoutEffect(() => {
    const { status, message } = getTestStatus();
    if (!status) {
      console.log('2................');
      setModalMessage(message);
      setCloseModal(() => () => router.push('/'));
    } else {
      if (userDetails) {
        setActivateEventListner(true);
        navigateToQuestion(0);
        const timer = setTimeout(() => setLoading(false), 2000);
        return () => clearTimeout(timer);
      } else {
        console.log('3................');
        router.push('/login');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTestStatus = () => {
    try {
      const testStatus = localStorage.getItem('test_status');
      const isOriginalTestTab = sessionStorage.getItem('is_original_test_tab');

      if (testStatus == null)
        return { status: false, message: 'Test Not found' };
      if (isOriginalTestTab == null)
        return {
          status: false,
          message: 'Test is Going on another tab!! Please complete it',
        };
      if (testStatus === 'ongoing' && isOriginalTestTab === 'true') {
        return { status: true, message: 'Test running' };
      }
      return { status: false, message: 'Unexpected error occurred' };
    } catch (error) {
      console.error(error);
      return { status: false, message: 'Unexpected error occurred' };
    }
  };

  const questionVisited = (index) => {
    setCurrentIndex(index);
    sessionStorage.setItem('current_question_index', index);
    setViewMode('test');
    navigateToQuestion(index);
  };

  // Table & Smart Content Formatting helpers
  function formatMisalignedTable(rawText) {
    const tables = rawText.split(/\n\s*\n/);
    return tables
      .map((table) => {
        const lines = table
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.includes('|'));

        const rows = lines.map((line) =>
          line.split('|').map((cell) => cell.trim()),
        );

        const colWidths = [];
        rows.forEach((row) => {
          row.forEach((cell, i) => {
            colWidths[i] = Math.max(colWidths[i] || 0, cell.length);
          });
        });

        const separator = colWidths.map((w) => '-'.repeat(w)).join(' | ');
        const formattedLines = rows.map((row) =>
          row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | '),
        );

        if (formattedLines.length > 1) {
          formattedLines.splice(1, 0, separator);
        }
        return formattedLines.join('\n');
      })
      .join('\n\n');
  }

  function normalizeText(text) {
    return (text || '').replace(/\\n/g, '\n').trim();
  }

  function isProbablyTable(text) {
    const pipeCount = (text.match(/\|/g) || []).length;
    return pipeCount >= 10;
  }

  function formatSmartContent(rawText) {
    const text = normalizeText(rawText);
    if (isProbablyTable(text)) {
      return formatMisalignedTable(text);
    }
    return text;
  }

  const TableFromText = React.memo(function TableFromText({ text }) {
    const tableBlocks = text.split(/\n\s*\n/);
    return (
      <div style={{ width: '100%', overflowY: 'auto', maxHeight: '300px' }}>
        {tableBlocks.map((block, tableIndex) => {
          const lines = block
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.includes('|'));

          const rows = lines
            .map((line) => {
              const cells = line.split('|').map((cell) => cell.trim());
              while (cells.length && cells[cells.length - 1] === '') {
                cells.pop();
              }
              return cells;
            })
            .filter((row) => !row.every((cell) => /^-*$/.test(cell)));

          if (rows.length === 0) return null;
          const header = rows[0];
          const body = rows.slice(1);

          return (
            <div
              key={tableIndex}
              style={{ marginBottom: '15px', overflowX: 'auto' }}
            >
              <table
                style={{
                  borderCollapse: 'collapse',
                  fontFamily: 'Courier New, monospace',
                  width: '100%',
                }}
              >
                <thead>
                  <tr>
                    {header.map((cell, idx) => (
                      <th
                        key={idx}
                        style={{
                          border: '1px solid #ccc',
                          padding: '6px 8px',
                          backgroundColor: '#f0f0f0',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          style={{
                            border: '1px solid #ddd',
                            padding: '6px 8px',
                            fontSize: '13px',
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  });

  const renderedCode = useMemo(() => {
    const rawCode = isQuestions[currentIndex]?.code;
    const code = cleanCode(rawCode);
    if (!code) return null;

    if (isProbablyTable(code)) {
      return <TableFromText text={code} />;
    } else {
      return (
        <pre className={classes.contextCodeBlock}>
          <code>{formatSmartContent(code)}</code>
        </pre>
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuestions, currentIndex]);

  const hendleReturnToTest = () => {
    setViewMode('test')
  }

  return (
    <div className={classes.container}>
      <Header
        assessmentDetails={{ exam_name: subject_name }}
        showSubmitButton={true}
        onSubmit={handleSubmitClick}
        showReturnToTest={viewMode === 'questions'}
        onReturnToTest={hendleReturnToTest}
      />
      {showChild ? (
        <FeedbackForm
          onApiCallComplete={() => handleConfirmSubmit('Manual Submission')}
          examName={testName}
          examType={test_type}
        />
      ) : (
        <div
          className={classes.mcqExamContainer}
          style={{
            // minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* HEADER */}
          {/*<header className={classes.mcqExamHeader}>
            <div className={classes.headerInner}>
              <div className={classes.examHeaderLeft}>
                <Image
                  src={dakshImg}
                  alt="Daksh Logo"
                  className={classes.examLogo}
                />
                <h1 className={classes.examTitle}>{subject_name}</h1>
              </div>

              <div
                style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
              >
                {viewMode === 'questions' && (
                  <button
                    onClick={() => setViewMode('test')}
                    className={classes.returnToTestBtn}
                  >
                    Return to Test
                  </button>
                )}
                <button
                  onClick={handleSubmitClick}
                  className={classes.submitExamBtn}
                >
                  Submit the test
                </button>
              </div>
            </div>
          </header>*/}

          {/* MAIN CONTENT AREA */}
          <div
            className={classes.testScreenLayout}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: '40px',
              // minHeight: 'calc(100vh - 94px)',
            }}
          >
            {/* SUBNAV STATUS BAR — only in test view */}
            {viewMode === 'test' && (
              <div
                className={classes.examStatusBar}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  margin: '32px 0 24px 0',
                  boxSizing: 'border-box',
                }}
              >
                {/* Left Status Area (68% width) */}
                <div
                  className={classes.statusLeft}
                  style={{
                    width: '68%',
                    flex: '0 0 68%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    className={classes.progressBarOutline}
                    style={{ width: '100%', maxWidth: '100%' }}
                  >
                    <div
                      className={classes.progressBarFill}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div
                    className={classes.statusMetaRow}
                    style={{ width: '100%', maxWidth: '100%' }}
                  >
                    <p
                      onClick={() => setViewMode('questions')}
                      className={classes.questionsCountText}
                      title="Click to view all questions overview"
                    >
                      {isCountAttempted}/{isQuestions.length}{' '}
                      <span>questions</span> attempted
                    </p>
                    <span className={classes.timerBadge}>
                      {formatTime(seconds)} left
                    </span>
                  </div>
                </div>

                {/* Right Navigation Area (29.5% width) */}
                <div
                  className={classes.statusRight}
                  style={{
                    width: '29.5%',
                    flex: '0 0 29.5%',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={prevQuestion}
                    disabled={currentIndex <= 0}
                    className={classes.navArrowBtn}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <div
                      style={{
                        transform: 'rotate(180deg)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        src={next}
                        alt=""
                        className={classes.navArrowIcon}
                      />
                    </div>
                    Previous
                  </button>
                  <button
                    onClick={nextQuestion}
                    disabled={currentIndex >= isQuestions.length - 1}
                    className={classes.navArrowBtn}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    Next
                    <Image src={next} alt="" className={classes.navArrowIcon} />
                  </button>
                </div>
              </div>
            )}

            {/* VIEW MODE: TEST OR QUESTIONS */}
            {viewMode === 'test' ? (
              <div
                className={classes.examSplitPanel}
                style={{
                  flex: 1,
                  minHeight: 'calc(100vh - 230px)',
                  alignItems: 'stretch',
                }}
              >
                {/* LEFT CONTEXT PANE */}
                <div
                  className={classes.contextPane}
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div className={classes.contextPaneInner}>
                    <ol
                      className={classes.contextTitleList}
                      start={currentIndex + 1}
                    >
                      <li>
                        <span className={classes.contextTitle}>
                          {isQuestions[currentIndex]?.question}

                        </span>
                      </li>
                    </ol>

                    {/* Code Snippet / Table block */}
                    {renderedCode}

                  </div>

                  {/* FOOTER ROW */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                      paddingTop: '16px',
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#7a8099',
                      }}
                    >
                      [{isQuestions[currentIndex]?.marks || 1} points]
                    </span>

                    {cleanHint(isQuestions[currentIndex]?.hints) && (
                        <button
                          type="button"
                          onClick={() => handleShowHints(currentIndex)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            backgroundColor: '#fdf8ea',
                            border: '1px solid #c9a84c',
                            borderRadius: '20px',
                            padding: '6px 14px',
                            marginRight: '20px',
                            cursor: 'pointer',
                            height: '32px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <Image
                            src={hintIcon}
                            alt="Hint"
                            style={{
                              width: '16px',
                              height: '16px',
                              display: 'block',
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#c9a84c',
                              lineHeight: 1,
                            }}
                          >
                            View Hint
                          </span>
                        </button>
                      )}
                  </div>
                </div>

                {/* RIGHT OPTIONS PANE */}
                <div
                  className={classes.optionsPane}
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <h3 className={classes.optionsHeadline}>Choose an answer</h3>
                  <div className={classes.optionsWrapper}>
                    {isQuestions[currentIndex]?.options.map((option, index) => {
                      const isSelected =
                        selectedOptions[currentIndex] === index;
                      return (
                        <div
                          key={index}
                          onClick={() =>
                            handleOptionClick(index, option, currentIndex)
                          }
                          className={`${classes.optionRow} ${isSelected ? classes.optionRowSelected : ''}`}
                        >
                          <div className={classes.radioSelectorOuter}>
                            {isSelected && (
                              <div className={classes.radioSelectorInner}></div>
                            )}
                          </div>
                          <span className={classes.optionTextContent}>
                            {option}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* VIEW MODE: FIGMA QUESTIONS OVERVIEW */
              <div
                className={classes.qMainContent}
                style={{ marginTop: '40px' }}
              >
                {/* 1. TOP STATS OVERVIEW CARD */}
                <div className={classes.statsOverviewCard}>
                  <div className={classes.statBlock}>
                    <div className={classes.statIconWrapper}>
                      <Image
                        src={questionIcon}
                        alt="Questions"
                        className={classes.statIcon}
                      />
                    </div>
                    <div className={classes.statTextGroup}>
                      <span className={classes.statNumber}>
                        {isQuestions.length}
                      </span>
                      <span className={classes.statLabel}>questions</span>
                    </div>
                  </div>

                  <div className={classes.statDividerLine}></div>

                  <div className={classes.statBlock}>
                    <div className={classes.statIconWrapper}>
                      <Image
                        src={totalPointsIcon}
                        alt="Points"
                        className={classes.statIcon}
                      />
                    </div>
                    <div className={classes.statTextGroup}>
                      <span className={classes.statNumber}>
                        {testDetails?.test_details?.total_marks || 0}
                      </span>
                      <span className={classes.statLabel}>Points total</span>
                    </div>
                  </div>

                  <div className={classes.statDividerLine}></div>

                  <div className={classes.statBlock}>
                    <div className={classes.statIconWrapper}>
                      <Image
                        src={timeLeftIcon}
                        alt="Time Left"
                        className={classes.statIcon}
                      />
                    </div>
                    <div className={classes.statTextGroup}>
                      <span className={classes.statNumber}>
                        {formatTime(seconds)}
                      </span>
                      <span className={classes.statLabel}>Left</span>
                    </div>
                  </div>
                </div>

                {/* 2. STATUS LEGEND BAR */}
                <div className={classes.legendStatusBar}>
                  <div className={classes.legendItem}>
                    <div
                      className={`${classes.legendBox} ${classes.boxUnseen}`}
                    ></div>
                    <span className={classes.legendText}>Unseen</span>
                  </div>
                  <div className={classes.legendItem}>
                    <div
                      className={`${classes.legendBox} ${classes.boxUnattempted}`}
                    ></div>
                    <span className={classes.legendText}>Unattempted</span>
                  </div>
                  <div className={classes.legendItem}>
                    <div
                      className={`${classes.legendBox} ${classes.boxAttempted}`}
                    ></div>
                    <span className={classes.legendText}>Attempted</span>
                  </div>
                  <div className={classes.legendItem}>
                    <div
                      className={`${classes.legendBox} ${classes.boxCurrent}`}
                    ></div>
                    <span className={classes.legendText}>Current</span>
                  </div>
                </div>

                {/* 3. QUESTIONS NUMBER GRID */}
                <div className={classes.questionsGridContainer}>
                  {isQuestions.map((q, idx) => {
                    const qNum = idx + 1;
                    let badgeStatusClass = classes['badgeStatus-unseen'];
                    if (currentIndex === idx) {
                      badgeStatusClass = classes['badgeStatus-current'];
                    } else if (q.visited) {
                      if (q.attempted) {
                        badgeStatusClass = classes['badgeStatus-attempted'];
                      } else {
                        badgeStatusClass = classes['badgeStatus-unattempted'];
                      }
                    }

                    return (
                      <button
                        key={qNum}
                        className={`${classes.qNumberBadge} ${badgeStatusClass}`}
                        onClick={() => questionVisited(idx)}
                      >
                        {qNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* WIDER INSTRUCTIONS POPUP OVERLAY */}
          {showInstructions && (
            <div className={classes.instructionsModalOverlay}>
              <div
                className={classes.instructionsCard}
                style={{
                  width: '95%',
                  maxWidth: '850px', // Increased width
                  padding: '45px 55px',
                  borderRadius: '24px',
                }}
              >
                <h2
                  className={classes.instructionsTitle}
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    marginBottom: '24px',
                    fontFamily: "'DM Serif Display', serif",
                    color: '#0f1117',
                    borderBottom: 'none',
                    paddingBottom: 0,
                  }}
                >
                  Instructions
                </h2>

                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '10px 0 30px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                  }}
                >
                  <li
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        color: '#c9a84c',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        lineHeight: '1',
                      }}
                    >
                      →
                    </span>
                    <span
                      style={{
                        fontSize: '15px',
                        color: '#3a3f50',
                        lineHeight: '1.5',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      You have {isQuestions.length} questions to complete in{' '}
                      {Math.round((seconds || 2400) / 60)} minutes.
                    </span>
                  </li>
                  <li
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        color: '#c9a84c',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        lineHeight: '1',
                      }}
                    >
                      →
                    </span>
                    <span
                      style={{
                        fontSize: '15px',
                        color: '#3a3f50',
                        lineHeight: '1.5',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Complete the test in one attempt—start only when you can
                      dedicate {Math.round((seconds || 2400) / 60)} minutes
                      without interruptions.
                    </span>
                  </li>
                  <li
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        color: '#c9a84c',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        lineHeight: '1',
                      }}
                    >
                      →
                    </span>
                    <span
                      style={{
                        fontSize: '15px',
                        color: '#3a3f50',
                        lineHeight: '1.5',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      The test evaluates major competencies and sub-competencies
                      relevant to your role.
                    </span>
                  </li>
                  <li
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        color: '#c9a84c',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        lineHeight: '1',
                      }}
                    >
                      →
                    </span>
                    <span
                      style={{
                        fontSize: '15px',
                        color: '#3a3f50',
                        lineHeight: '1.5',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Think through the scenarios and choose the best options.
                    </span>
                  </li>
                  <li
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        color: '#c9a84c',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        lineHeight: '1',
                      }}
                    >
                      →
                    </span>
                    <span
                      style={{
                        fontSize: '15px',
                        color: '#3a3f50',
                        lineHeight: '1.5',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Remember, it’s just a test—relax and enjoy the process!
                    </span>
                  </li>
                </ul>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  <button
                    onClick={handleStartAssessment}
                    className={classes.startExamBtn}
                    style={{
                      width: 'auto',
                      minWidth: '300px',
                      padding: '0 28px',
                      height: '46px',
                      marginTop: '10px',
                      backgroundColor: '#c9a84c',
                      color: '#000000',
                      fontWeight: 600,
                      fontSize: '14px',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    I am ready to start the assessment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUBMIT CONFIRMATION POPUP */}
          {isSubmitPopupVisible && (
            <div className={classes.instructionsModalOverlay}>
              <div
                className={classes.instructionsCard}
                style={{ maxWidth: '520px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <Image src={gifIcon} alt="" width="50" />
                </div>
                <h2
                  className={classes.instructionsTitle}
                  style={{
                    textAlign: 'center',
                    fontSize: '24px',
                    borderBottom: 'none',
                    paddingBottom: 0,
                  }}
                >
                  Submit Assessment
                </h2>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    backgroundColor: '#f7f5f0',
                    padding: '15px',
                    borderRadius: '10px',
                    margin: '15px 0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                    }}
                  >
                    <Image src={alertIcon} alt="" width="18" />
                    <p style={{ margin: 0 }}>
                      Unattempted questions:{' '}
                      <strong style={{ color: '#d32f2f' }}>
                        {isQuestions.length - isCountAttempted}
                      </strong>
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                    }}
                  >
                    <Image src={alertIcon} alt="" width="18" />
                    <p style={{ margin: 0 }}>
                      Time remaining:{' '}
                      <strong style={{ color: '#d32f2f' }}>
                        {formatTime(seconds)}
                      </strong>
                    </p>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '15px',
                    textAlign: 'center',
                    margin: '10px 0 20px 0',
                  }}
                >
                  Are you sure you want to submit the test?
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '15px',
                  }}
                >
                  <button
                    onClick={handleClosePopup}
                    style={{
                      background: '#ebebeb',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 20px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flex: 1,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    No, continue
                  </button>
                  {/* <button
                      // onClick={() => setShowChild(true)}
                      onClick={handleConfirmSubmit("Manual Submission")}
                      disabled={isSubmitDisabled}
                      className={classes.startExamBtn}
                      style={{ width: "160px", marginTop: 0 }}
                    >
                      {!isSubmitDisabled ? "Yes, Submit" : "Submitting..."}
                    </button> */}

                  <button
                    className={classes['confirm-button']}
                    onClick={() => handleConfirmSubmit('Manual Submission')}
                    disabled={isSubmitDisabled}
                  >
                    {!isSubmitDisabled ? 'Yes, Submit' : 'Submitting...'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HINTS MODAL */}
          {showModal && isPopupVisible && (
            <div className={classes.instructionsModalOverlay}>
              <div
                className={classes.instructionsCard}
                style={{ maxWidth: '520px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #ebebeb',
                    paddingBottom: '10px',
                  }}
                >
                  <h3
                    style={{ margin: 0, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Question Hint
                  </h3>
                  <Image
                    src={closeIcon}
                    alt="Close"
                    style={{ cursor: 'pointer', width: '20px' }}
                    onClick={hidePopup}
                  />
                </div>
                <div style={{ marginTop: '15px' }}>
                  {currentHints ? (
                    Array.isArray(currentHints) ? (
                      currentHints.map((hint, hintIndex) => (
                        <p
                          key={hintIndex}
                          style={{
                            fontSize: '14px',
                            lineHeight: 1.5,
                            color: '#3a3f50',
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {hintIndex + 1}. {hint}
                        </p>
                      ))
                    ) : (
                      <p
                        style={{
                          fontSize: '14px',
                          lineHeight: 1.5,
                          color: '#3a3f50',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        1. {currentHints}
                      </p>
                    )
                  ) : (
                    <p>No hints available for this question.</p>
                  )}
                </div>
                <button
                  onClick={hidePopup}
                  className={classes.submitExamBtn}
                  style={{ width: '100%', marginTop: '20px' }}
                >
                  Back to Test
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Questions;
