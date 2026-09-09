'use client';

import { useEffect } from 'react';
import classes from './AssessmentInstructions.module.css';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useOrganizationStore } from '@/store/organizationStore';
import { allocateExam, getExamDetails as getExamDetailsApi } from '@/service/assessmentAttempt.service';
import { useContext } from 'react';
import { QuestionContext } from '@/context/QuestionContext';
import Button from '../ui/Button';
import Header from './Header';

const AssessmentInstructions = ({ assessmentId }) => {
  // http://localhost:3000/assessment/skill-gap-assessment/f9cca8eb-9db5-4a84-945b-4a83f1c20088?p=7fef7eb8-7841-4e00-80c0-d10a8185dd1f

  const organizationId = useOrganizationStore((s) => s.organizationId);

  const { setTestDetails } = useContext(QuestionContext);

  const pathName = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter()
  // const

  const [assessmentDetails, setAssessmentDetails] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaderFlag, setLoaderFlag] = useState(false);
  const [error, setError] = useState(null);

  function getAssessmentType(pathName) {
    if (pathName.includes('/roadmap-learning-assessment/'))
      return 'roadmap_learning_assessment';
    else if (pathName.includes('/skill-gap-assessment/'))
      return 'skill_gap_assessment';
  }

   async function handleStartAssessment() {
    try {
      const reqData = {
        "organization_id": searchParams.get('o') || searchParams.get('org') || "",
        "project_id": searchParams.get('p') || "",
        "assessment_id": assessmentId,
        "assessment_type": getAssessmentType(pathName),
        "roadmap_id": searchParams.get('r')
      }

      const data = await allocateExam(reqData);
      const testDetails = {
        test_details: data,
        test_id: data.allocation_id,
        test_name: data.exam_name,
      };
      const exam_name = data.exam_name

      testDetails.test_details.original_duration =
        data.exam_duration_in_seconds;
      setTestDetails(testDetails); //this contex api store the all question along with the time and points and all
      sessionStorage.setItem("test_details", JSON.stringify(testDetails));
      localStorage.setItem("test_status", "ongoing");
      sessionStorage.setItem("is_original_test_tab", true);

      const enterFullScreen = async () => {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
          await document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
          await document.documentElement.msRequestFullscreen();
        }
      };

      setLoading(true);
      setLoaderFlag(true);
      await enterFullScreen();
      setTimeout(() => {
        setLoaderFlag(true);
        setLoading(false); // After 2 seconds, set loading to false to show the content

        let path = `/assessment/attempt?exam_name=${exam_name}&total_questions=${data.total_questions}&test_id=${data.allocation_id
          }&test_name=${encodeURIComponent(data.test_name)}`

        const roadmap_id = searchParams.get('r') || null
        const node_id = searchParams.get('n') || null
        const project_id = searchParams.get('p') || null

        if(roadmap_id && node_id) {
          path += `&r=${roadmap_id}&n=${node_id}`
        }
        if(project_id) {
          path += `&p=${project_id}`
        }
        router.replace(
          path,
          // {
          //   replace: true,
          //   state: {
          //     backfromresultdashboardurl: `/evaluate-profile?exam_name=${encodeURIComponent(
          //       exam_name
          //     )}`,
          //   },
          // }
        );
      }, 500);
      
    }catch (error) {
      console.error(error);
      setError(error?.response?.data.message || null)
    }
  }

  useEffect(() => {
    const getExamDetails = async () => {
      try {
        const data = {
          project_id: searchParams.get('p') || "",
          assessment_id: assessmentId,
          assessment_type: getAssessmentType(pathName),
          roadmap_id: searchParams.get('r'),
        };

        const responseData = await getExamDetailsApi(data);
        setAssessmentDetails(responseData);
        setShowInstructions(true)
      } catch (error) {
        console.error(error.message);
      }
    };

    getExamDetails();
  }, []);

  return (
    <div>
      <Header assessmentDetails={assessmentDetails} />
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
                fontFamily: "var(--font-montserrat), serif",
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
              {
                assessmentDetails?.exam_instruction.map((ins, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        color: '#121212',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        lineHeight: '1',
                      }}
                    >
                      →
                    </span>
                    <span
                      style={{
                        fontSize: '18px',
                        color: '#121212',
                        lineHeight: '1.5',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {ins}
                    </span>
                  </li>
                ))
              }              
            </ul>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Button
                onClick={handleStartAssessment}
                className={classes.startExamBtn}
                style={{
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                I am ready to start the assessment
              </Button>
            </div>

           {error &&  <span className={classes['error-span']}>{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentInstructions;
