
import React, { useContext, useEffect, useRef, useState } from "react";
import classes from "./NewInstructionPagePfp.module.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";
import new_pwc from "../assets/new_pwc.svg";
import new_wipro from "../assets/new_wipro.svg";
import new_ibm from "../assets/new_ibm.svg";
import new_ey from "../assets/new_ey.svg";
import new_hathi from "../assets/new_hathi.svg";
import new_idfc_first_bank from "../assets/new_idfc_first_bank.svg";
import new_accenture from "../assets/new_accenture.svg";
import new_redington from "../assets/new_redington.svg";
import new_latentview from "../assets/new_latentview.svg";
import new_dafardecision from "../assets/new_dafardecision.svg";
import new_imarti from "../assets/new_imarti.svg";
import new_uniquesolutions from "../assets/new_uniquesolutions.svg";
import new_rategain from "../assets/new_rategain.svg";
import card_one from "../assets/card-one.svg";
import card_two from "../assets/card-two.svg";
import card_three from "../assets/card-three.svg";
import card_four from "../assets/card-four.svg";
import card_five from "../assets/card-five.svg";
import card_six from "../assets/card-six.svg";
import ratings_star from "../assets/ratings_star.svg";
import learners_people from "../assets/learners_people.svg";
import new_logo from "../assets/new_logo.svg";
import menu_icon from "../assets/menu.png";
import skills_img from "../assets/skills_img.svg";
import level_img from "../assets/level_img.svg";
import no_of_questions_img from "../assets/no_of_questions_img.svg";
import timer_img from "../assets/timer_img.svg";
import ProfileGraph from "./ProfileGraph";
import SETU_logo from "../assets/setu-logo-web.svg";
import { useLocation, useNavigate } from "react-router-dom";
import details_loader from "../assets/details-loder.gif";
import loader from "../assets/loader.gif";
import { SERVER_URL, IMAGEURL } from "../index.js";
import { QuestionContext } from "../context/QuestionContext";
import gifIcon from "../assets/warning.gif";
import setuShortIcon from "../assets/setu-logo-short.svg";
import back_arrow from "../assets/back_arrow.svg";
import challenge_sword from "../assets/challenge_sword.svg";
import profile_graph from "../assets/profile_graph.svg";
import color_ey from "../assets/color_ey.svg";
import color_pwc from "../assets/color_pwc.svg";
import color_accenture from "../assets/color_accenture.svg";
import color_idfc from "../assets/color_idfc.svg";
import color_rategain from "../assets/color_rategain.svg";
import color_nexturn from "../assets/color_nexturn.svg";
import color_ibm from "../assets/color_ibm.svg";
import color_latentview from "../assets/color_latentview.svg";
import coins from "../assets/coins.svg";
import button_bg from "../assets/button_bg.svg";

import profileIcon from "../assets/profile.svg";
import ins_timer from "../assets/ins_timer.svg";
import ins_bulb from "../assets/ins_bulb.svg";
import ShareButtons from "../component/ShareButtons";
import dakshImg from "../assets_daksh/dakshimg.png"

// const NewInstructionPagePfp = ({
//   setShowModal,
//   setModalMessage,
//   setActivateEventListner,
// }) => {
//   const logos_first = [
//     new_pwc,
//     new_wipro,
//     new_hathi,
//     new_accenture,
//     new_redington,
//     new_ey,
//     new_dafardecision,
//     new_ibm,
//     new_idfc_first_bank,
//     new_redington,
//     new_uniquesolutions,
//     new_latentview,
//     new_imarti,
//     new_rategain,
//     new_pwc,
//     new_wipro,
//     new_hathi,
//     new_accenture,
//     new_redington,
//     new_ey,
//     new_dafardecision,
//     new_ibm,
//     new_idfc_first_bank,
//     new_redington,
//     new_uniquesolutions,
//     new_latentview,
//     new_imarti,
//     new_rategain,
//   ];
//   const handleLanguageChange = (e) => {
//   const value = e.target.value;
//   setSelectedLanguage(value);
//   localStorage.setItem("selected_language", value);
// };

//   const navigate = useNavigate();
//   const location = useLocation();
//   const [loaderFlag, setLoaderFlag] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [focusedId, setFocusedId] = useState(location.state?.focusedId || null);
//   const searchParams = new URLSearchParams(location.search);
//   const exam_name = searchParams.get("exam_name");
//   const exam_type = searchParams.get("exam_type") || null;
//   const [examLimitDetails, setExamLimitDetails] = useState({});
//   // const [foundExam, setFoundExam] = useState(false);
//   const [subject, setSubject] = useState([]);
//   const [allocationId, setAllcationId] = useState(null);
//   const [showPopup, setShowPopup] = useState(false);
//   const [showInstructionPopup, setShowInstructionPopup] = useState(false);
//   const [examInstructions, setExamInstructions] = useState([]);
//   const [examDescription, setExamDescription] = useState("");
//   const [averageRating, setAverageRating] = useState(0);
//   const [noOfRatings, setNoOfRatings] = useState(0);
//   const [noOfLearners, setNoOfLearners] = useState(0);
//   const [noOfCompetencies, setNoOfCompetencies] = useState(0);
//   const [totalNoOfQuestions, setTotalNoOfQuestions] = useState(36);
//   const [examDuration, setExamDuration] = useState(0);
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [shareModalOpen, setShareModalOpen] = useState(false);
//   const shareUrl = `${window.location.origin}/practice-your-skill?&exam_name=${subject.exam_name}`;
//   const title = "I Took a Quiz – Here’s How I Did! 😊";
//   const text = "Hey, check this out!";
//   const menuRef = useRef(null);
//   const toggleinspopup = location.state?.toggleinspopup;
//   const [complexityMix, setComplexityMix] = useState({
//     easy: 30,
//     moderate: 30,
//     complex: 40,
//   });
//   const [questionCount, setQuestionCount] = useState(20);
//   const { setTestDetails } = useContext(QuestionContext);
//   const [userData, setUserData] = useState("");
//   const [windowWidth, setWindowWidth] = useState(window.innerWidth);
//   const [suborob, setSuborob] = useState("");
//   const [selectedLanguage, setSelectedLanguage] = useState(
//   localStorage.getItem("selected_language") || "en-US"
// );

//   useEffect(() => {
//     setLoaderFlag(false);
//     setActivateEventListner(true);
//     get_exam_details();
//     if (exam_type) {
//       setSuborob("Subjective");
//     } else {
//       setSuborob("Objective");
//     }

//     if (localStorage.getItem("user")) {
//       getExamLimit();
//     }
//     // fetchResults();
//   }, []);

//   useEffect(() => {
//     const handleResize = () => setWindowWidth(window.innerWidth);
//     window.addEventListener("resize", handleResize);

//     // Cleanup the event listener when component unmounts
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   useEffect(() => {
//     if (showInstructionPopup) {
//       document.body.style.overflow = "hidden";
//     } else {
//       document.body.style.overflow = "auto";
//     }

//     // Optional cleanup
//     return () => {
//       document.body.style.overflow = "auto";
//     };
//   }, [showInstructionPopup]);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (menuRef.current && !menuRef.current.contains(event.target)) {
//         setMenuOpen(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, []);

//   const get_exam_details = async () => {
//     try {
//       let payload = null;
//       if (exam_type) {
//         payload = {
//           exam_name: exam_name,
//           exam_type: exam_type,
//         };
//       } else {
//         payload = {
//           exam_name: exam_name,
//         };
//       }

//       //  this api fetching the one and one exam details with the exam_id
//       const response = await fetch(`${SERVER_URL}/get-exam`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await response.json();
//       setAverageRating(data.average_rating);
//       setNoOfRatings(data.number_of_ratings);
//       setNoOfLearners(data.number_of_learners_taken_exam);
//       setNoOfCompetencies(data.number_of_competencies);
//       setTotalNoOfQuestions(data.number_of_total_question);
//       setExamDuration(data.exam_duration);
//       setExamInstructions(data.exam_instruction);
//       setExamDescription(data.exam_description);

//       if (response.ok) {
//         setSubject(data);
//         setTimeout(() => {
//           setLoading(false); //after fetching the exam details loder gets false
//         }, 500);
//       } else {
//         console.error("Failed to fetch exam_details");
//       }
//     } catch (error) {
//       console.error("Error fetching exam_details........:", error);
//     }
//   };

//   async function getExamLimit() {
//     const user = JSON.parse(localStorage.getItem("user"));
//     const email = user?.email;

//     if (!email) {
//       throw new Error("User email not found in local storage.");
//     }

//     try {
//       const response = await fetch(`${SERVER_URL}/user-results/${email}`, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//         },
//       });

//       const result = await response.json();
//       setUserData(result.user_details);
//       console.log(result);
//       if (!response.ok) {
//         throw new Error(result.message || "Failed to fetch user results");
//       }
//       // number_of_attempts = getMaxCounterForExam(result.results, exam_name);
//       // console.log(getMaxCounterForExam(result.results, exam_name), exam_name);
//       setExamLimitDetails(result.results);
//       const foundExam = result.results.find(
//         (exam) => exam.exam_name === exam_name && exam.final_appearance
//       );
//       if (toggleinspopup && !foundExam) {
//         // setShowInstructionPopup(true);
//       } else if (toggleinspopup && foundExam) {
//         // setShowPopup(true);
//       }
//     } catch (error) {
//       console.error("Error fetching user results:", error.message);

//       return null; // Returns null in case of failure
//     }
//   }

//   const checkTestStatus = () => {
//     try {
//       const testStatus = localStorage.getItem("test_status");
//       const isOriginalTestTab = sessionStorage.getItem("is_original_test_tab");
//       if (!testStatus) return true;

//       if (testStatus === "ongoing" && isOriginalTestTab) {
//         return true;
//       }

//       return false;
//     } catch (error) {
//       console.error(error);
//       return false;
//     }
//   };

//   const profileBasedTest = async () => {

//     if (!checkTestStatus()) {

//       setModalMessage("Test is Going on another tab!! Please complete it");
//       setShowModal(true);
//       return;
//     }

//     if (
//       complexityMix.easy + complexityMix.moderate + complexityMix.complex ===
//       100
//     ) {
//       const user = JSON.parse(localStorage.getItem("user"));
//       const email = user?.email;
//       const payload = {
//         email: email,
//         exam_name: exam_name,
//       };

//       const response = await fetch(`${SERVER_URL}/allocate_exam`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       const data = await response.json();
//       if (response.status === 200) {
//         const testDetails = {
//           test_details: data,
//           test_id: data.allocation_id,
//           test_name: data.exam_name,
//         };

//         testDetails.test_details.original_duration =
//           data.exam_duration_in_seconds;
//         setTestDetails(testDetails); //this contex api store the all question along with the time and points and all
//         sessionStorage.setItem("test_details", JSON.stringify(testDetails));
//         localStorage.setItem("test_status", "ongoing");
//         sessionStorage.setItem("is_original_test_tab", true);

//         const enterFullScreen = async () => {
//           if (document.documentElement.requestFullscreen) {
//             await document.documentElement.requestFullscreen();
//           } else if (document.documentElement.mozRequestFullScreen) {
//             await document.documentElement.mozRequestFullScreen();
//           } else if (document.documentElement.webkitRequestFullscreen) {
//             await document.documentElement.webkitRequestFullscreen();
//           } else if (document.documentElement.msRequestFullscreen) {
//             await document.documentElement.msRequestFullscreen();
//           }
//         };

//         setLoading(true);
//         setLoaderFlag(true);
//         await enterFullScreen();
//         setTimeout(() => {
//           setLoaderFlag(true);
//           setLoading(false); // After 2 seconds, set loading to false to show the content
//           navigate(
//             `/questions?exam_name=${exam_name}&total_questions=${questionCount}&test_id=${
//               data.allocation_id
//             }&test_name=${encodeURIComponent(data.test_name)}&t=${
//               subject.exam_category
//             }`,
//             {
//               replace: true,
//               state: {
//                 backfromresultdashboardurl: `/evaluate-profile?exam_name=${encodeURIComponent(
//                   exam_name
//                 )}`,
//               },
//             }
//           );
//         }, 2000);
//       } else {
//         if (response.status === 403) {
//           //console.log("hdfjdfjdfjj")
//           // const data=await response.json()
//           setAllcationId(data.last_allocation_id);
//           setShowPopup(true);
//         }
//         // alert(`${data.error}`);
//       }
//     } else {
//       // alert("please sum up the value of percentage");
//     }
//   };

//   const onClose = () => {
//     setShowPopup(false);
//   };

//   const viewResult = () => {
//     navigate(`/result/${allocationId}`);
//   };

//   const navigateseniority = () => {
//     navigate(
//       `/experience-level?exam_name=${subject.exam_name}&exam_type=${"SAQ"}`
//     );
//   };

//   const handleStartTheTest = () => {
//     if (localStorage.getItem("user")) {
//       console.log(userData.user_name);
//       if (userData.user_name) {
//         const foundExam = examLimitDetails.find(
//           (exam) => exam.exam_name === exam_name && exam.final_appearance
//         );

//         if (foundExam) {
//           console.log("FOUND EXAM");
//           const foundAllocations = examLimitDetails
//             .filter(
//               (exam) => exam.exam_name === exam_name && exam.final_appearance
//             )
//             .map((exam) => exam.encrypted_allocation_id);
//           setAllcationId(foundAllocations);
//           setShowPopup(true);
//         } else {
//           window.scrollTo({
//             top: 0,
//             behavior: "smooth", // or "auto" for instant scroll
//           });
//           setShowInstructionPopup(true);
//         }
//       } else {
//         const redirectPath = "/completeprofile";
//         navigate(redirectPath, {
//           replace: true,
//           state: {
//             pathToRedirect: `/evaluate-profile?exam_name=${encodeURIComponent(
//               exam_name
//             )}`,
//           },
//         });
//       }
//     } else {
//       navigate("/login", {
//         state: {
//           from: `/evaluate-profile?exam_name=${encodeURIComponent(exam_name)}`,
//           toggleinspopup: true,
//         },
//       });
//     }
//   };

//   const handleMenuToggle = () => {
//     if (localStorage.getItem("user")) {
//       setMenuOpen((prev) => !prev);
//     }
//   };

//   const handleButtonClick = async (button) => {
//     if (button === "logout") {
//       const userData = JSON.parse(localStorage.getItem("user"));
//       if (!userData) {
//         console.error("No user data found. Please log in again.");
//         navigate("/");
//         return;
//       }

//       const logoutPayload = {
//         email: userData.email,
//         session_token: localStorage.getItem("session_token"),
//       };

//       try {
//         const response = await fetch(`${SERVER_URL}/logout`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(logoutPayload),
//         });

//         const data = await response.json();

//         if (!response.ok) {
//           console.error("Logout failed:", data.message || "Unknown error.");
//           return;
//         }

//         if (data.status === "success") {
//           setMenuOpen(false);
//           localStorage.removeItem("user");
//           localStorage.removeItem("session_token");
//           navigate(`/evaluate-profile?exam_name=${exam_name}`);
//         } else {
//           console.error(
//             "Logout error:",
//             data.message || "An error occurred during logout."
//           );
//         }
//       } catch (err) {
//         console.error("Logout Exception error:", err);
//       }
//     } else {
//       navigate("/");
//     }
//   };

//   const privacyPolicyRedirect = () => {
//     window.open("https://ai.setuschool.com/privacy_policy", "_blank");
//   };

//   const termsAndConditionsRedirect = () => {
//     window.open("https://ai.setuschool.com/terms_condition", "_blank");
//   };

//   const aboutUsRedirect = () => {
//     window.open("https://ai.setuschool.com/about", "_blank");
//   };

//   const blogsRedirect = () => {
//     window.open("https://ai.setuschool.com/all/blog", "_blank");
//   };

//   const contactUsRedirect = () => {
//     window.open("https://ai.setuschool.com/contact", "_blank");
//   };

//   const returnAndRefundPolicyRedirect = () => {
//     window.open("https://ai.setuschool.com/return_refund", "_blank");
//   };

import Toastify, { showToast } from "./Toastify.jsx"; // Import Toastify and showToast
const NewInstructionPagePfp = ({
  setShowModal,
  setModalMessage,
  setActivateEventListner,
}) => {
  const logos_first = [
    new_pwc,
    new_wipro,
    new_hathi,
    new_accenture,
    new_redington,
    new_ey,
    new_dafardecision,
    new_ibm,
    new_idfc_first_bank,
    new_redington,
    new_uniquesolutions,
    new_latentview,
    new_imarti,
    new_rategain,
    new_pwc,
    new_wipro,
    new_hathi,
    new_accenture,
    new_redington,
    new_ey,
    new_dafardecision,
    new_ibm,
    new_idfc_first_bank,
    new_redington,
    new_uniquesolutions,
    new_latentview,
    new_imarti,
    new_rategain,
  ];

  const navigate = useNavigate();
  const location = useLocation();
  const [loaderFlag, setLoaderFlag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [focusedId, setFocusedId] = useState(location.state?.focusedId || null);
  const searchParams = new URLSearchParams(location.search);
  const exam_name = searchParams.get("exam_name");
  const exam_type = searchParams.get("exam_type") || null;
  const [examLimitDetails, setExamLimitDetails] = useState({});
  const [remainingCredits, setRemainingCredits] = useState(0);
  // const [foundExam, setFoundExam] = useState(false);
  const [subject, setSubject] = useState([]);
  const [allocationId, setAllcationId] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showInstructionPopup, setShowInstructionPopup] = useState(false);
  const [examInstructions, setExamInstructions] = useState([]);
  const [examDescription, setExamDescription] = useState("");
  const [examCategory, setExamCategory] = useState("");
  const [averageRating, setAverageRating] = useState(0);
  const [noOfRatings, setNoOfRatings] = useState(0);
  const [noOfLearners, setNoOfLearners] = useState(0);
  const [noOfCompetencies, setNoOfCompetencies] = useState(0);
  const [totalNoOfQuestions, setTotalNoOfQuestions] = useState(36);
  const [examDuration, setExamDuration] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const shareUrl = `${window.location.origin}/practice-your-skill?&exam_name=${subject.exam_name}`;
  const title = "I Took a Quiz – Here’s How I Did! 😊";
  const text = "Hey, check this out!";
  const menuRef = useRef(null);
  const toggleinspopup = location.state?.toggleinspopup;
  const [complexityMix, setComplexityMix] = useState({
    easy: 30,
    moderate: 30,
    complex: 40,
  });
  const [questionCount, setQuestionCount] = useState(20);
  const { setTestDetails } = useContext(QuestionContext);
  const [userData, setUserData] = useState("");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [suborob, setSuborob] = useState("");
  const [userDetails, setUserDetails] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Keys to remove
    const keysToClear = [
      "currentIndex",
      "questionStartTime",
      "submittedQuestions",
      "recordedAnswers"
    ];

    keysToClear.forEach((key) => {
      localStorage.removeItem(key);
    });

    console.log("🧹 Cleared exam tracking keys from localStorage");
  }, []); // runs once when the component mounts


  useEffect(() => {
    setLoaderFlag(false);
    setActivateEventListner?.(true);
    get_exam_details();
    if (exam_type) {
      setSuborob("Subjective");
    } else {
      setSuborob("Objective");
    }

    if (localStorage.getItem("user")) {
      getExamLimit();
    }
    // fetchResults();
  }, []);

  const goToPaymentAssessment = () => {
    navigate("/payment-assessment");
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    // Cleanup the event listener when component unmounts
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (showInstructionPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    // Optional cleanup
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showInstructionPopup]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const get_exam_details = async () => {
    try {
      let payload = null;
      if (exam_type) {
        payload = {
          exam_name: exam_name,
          exam_type: exam_type,
        };
      } else {
        payload = {
          exam_name: exam_name,
        };
      }

      //  this api fetching the one and one exam details with the exam_id
      const response = await fetch(`${SERVER_URL}/get-exam`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setAverageRating(data.average_rating);
      setNoOfRatings(data.number_of_ratings);
      setNoOfLearners(data.number_of_learners_taken_exam);
      setNoOfCompetencies(data.number_of_competencies);
      setTotalNoOfQuestions(
        exam_type === "SAQ"
          ? data.number_of_question_appeared_for_descriptive
          : data.number_of_total_question
      );
      setExamDuration(data.exam_duration);
      setExamInstructions(data.exam_instruction);
      setExamDescription(data.exam_description);
      setExamCategory(data.exam_category);

      if (response.ok) {
        setSubject(data);
        setTimeout(() => {
          setLoading(false); //after fetching the exam details loder gets false
        }, 500);
      } else {
        console.error("Failed to fetch exam_details");
      }
    } catch (error) {
      console.error("Error fetching exam_details........:", error);
    }
  };

  async function getExamLimit() {
    const user = JSON.parse(localStorage.getItem("user"));
    const email = user?.email;

    if (!email) {
      throw new Error("User email not found in local storage.");
    }

    try {
      const response = await fetch(`${SERVER_URL}/user-results/${email}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      setUserData(result.user_details);
      console.log(result);
      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch user results");
      }
      // number_of_attempts = getMaxCounterForExam(result.results, exam_name);
      // console.log(getMaxCounterForExam(result.results, exam_name), exam_name);
      setExamLimitDetails(result.results);
      setRemainingCredits(result.remaining_credits);
      const foundExam = result.results.find(
        (exam) => exam.exam_name === exam_name && exam.final_appearance
      );
      if (toggleinspopup && !foundExam) {
        // setShowInstructionPopup(true);
      } else if (toggleinspopup && foundExam) {
        // setShowPopup(true);
      }
    } catch (error) {
      console.error("Error fetching user results:", error.message);

      return null; // Returns null in case of failure
    }
  }
  useEffect(() => {
    // Check if user data exists in localStorage
    // const user = localStorage.getItem("user_id");
    const userMail = localStorage.getItem("user");

    if (userMail) {
      const parsedUser = JSON.parse(userMail); // Parse the JSON string
      setUserEmail(parsedUser.email);
    }

    if (userMail) {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userEmail) return;

      try {
        const response = await fetch(
          `${SERVER_URL}/get_user?email=${userEmail}`
        );
        if (!response.ok) {
          throw new Error("User not found");
        }

        const data = await response.json();

        setUserDetails(data);
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    fetchUserData();
  }, [userEmail]);

  const handleOptionClick = (callback) => {
    callback();
    setMenuOpen(false);
  };

  const handleDashboardClick = () => {
    if (!isLoggedIn) {
      showToast("Please log in to access the Dashboard!");
    } else {
      navigate("/dashboard");
    }
  };

  const checkTestStatus = () => {
    try {
      const testStatus = localStorage.getItem("test_status");
      const isOriginalTestTab = sessionStorage.getItem("is_original_test_tab");
      if (!testStatus) return true;

      if (testStatus === "ongoing" && isOriginalTestTab) {
        return true;
      }

      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const profileBasedTest = async () => {
    console.log("11111111111111111111111111111");
    if (!checkTestStatus()) {
      console.log("22222222222222222222222222222");
      setModalMessage("Test is Going on another tab!! Please complete it");
      setShowModal(true);
      return;
    }

    if (
      complexityMix.easy + complexityMix.moderate + complexityMix.complex ===
      100
    ) {
      const user = JSON.parse(localStorage.getItem("user"));
      const email = user?.email;
      const payload = {
        email: email,
        exam_name: exam_name,
      };

      const response = await fetch(`${SERVER_URL}/allocate_exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.status === 200) {
        const testDetails = {
          test_details: data,
          test_id: data.allocation_id,
          test_name: data.exam_name,
        };

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
          navigate(
            `/questions?exam_name=${exam_name}&total_questions=${questionCount}&test_id=${data.allocation_id
            }&test_name=${encodeURIComponent(data.test_name)}&t=${subject.exam_category
            }`,
            {
              replace: true,
              state: {
                backfromresultdashboardurl: `/evaluate-profile?exam_name=${encodeURIComponent(
                  exam_name
                )}`,
              },
            }
          );
        }, 2000);
      } else {
        if (response.status === 403) {
          //console.log("hdfjdfjdfjj")
          // const data=await response.json()
          setAllcationId(data.last_allocation_id);
          setShowPopup(true);
        }
        // alert(`${data.error}`);
      }
    } else {
      // alert("please sum up the value of percentage");
    }
  };

  const onClose = () => {
    setShowPopup(false);
  };

  const viewResult = () => {
    navigate(`/result/${allocationId}`);
  };

  const navigateseniority = () => {
    navigate(
      `/experience-level?exam_name=${subject.exam_name}&exam_type=${"SAQ"}`
    );
  };

  const handleStartTheTest = () => {
    if (localStorage.getItem("user")) {
      console.log(userData.user_name);
      if (userData) {
        const foundExam = examLimitDetails.find(
          (exam) => exam.exam_name === exam_name && exam.final_appearance
        );

        if (foundExam) {
          console.log("FOUND EXAM");
          const foundAllocations = examLimitDetails
            .filter(
              (exam) => exam.exam_name === exam_name && exam.final_appearance
            )
            .map((exam) => exam.encrypted_allocation_id);
          setAllcationId(foundAllocations);
          setShowPopup(true);
        } else {
          window.scrollTo({
            top: 0,
            behavior: "smooth", // or "auto" for instant scroll
          });
          // setShowInstructionPopup(true);
          profileBasedTest();
        }
      } else {
        const redirectPath = "/completeprofile";
        navigate(redirectPath, {
          replace: true,
          state: {
            pathToRedirect: `/evaluate-profile?exam_name=${encodeURIComponent(
              exam_name
            )}`,
          },
        });
      }
    } else {
      navigate("/login", {
        state: {
          from: `/evaluate-profile?exam_name=${encodeURIComponent(exam_name)}`,
          toggleinspopup: true,
        },
      });
    }
  };

  const handleMenuToggle = () => {
    if (localStorage.getItem("user")) {
      setMenuOpen((prev) => !prev);
    }
  };
  const handleStartAssessmentButtonClick = () => {
    if (exam_type === "SAQ") {
      navigateseniority();   // call this for SAQ
    } else {
      handleStartTheTest();  // default behavior
    }
  };
  const handleButtonClick = async (button) => {
    if (button === "logout") {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData) {
        console.error("No user data found. Please log in again.");
        navigate("/");
        return;
      }

      const logoutPayload = {
        email: userData.email,
        session_token: localStorage.getItem("session_token"),
      };

      try {
        const response = await fetch(`${SERVER_URL}/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logoutPayload),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Logout failed:", data.message || "Unknown error.");
          return;
        }

        if (data.status === "success") {
          setMenuOpen(false);
          localStorage.removeItem("user");
          localStorage.removeItem("session_token");
          navigate(`/evaluate-profile?exam_name=${exam_name}`);
        } else {
          console.error(
            "Logout error:",
            data.message || "An error occurred during logout."
          );
        }
      } catch (err) {
        console.error("Logout Exception error:", err);
      }
    } else {
      navigate("/");
    }
  };

  const startassessmentclick = () => {
    if (!isLoggedIn) {
      showToast("You are not logged in yet", "error");
      navigate("/login", {
        state: {
          from: `/evaluate-profile?exam_name=${encodeURIComponent(exam_name)}`,
          toggleinspopup: false,
        },
      });
      return; // stop further execution
    }

    if (remainingCredits > 0) {
      if (examCategory === "Profile Based") {
        // setShowInstructionPopup(true);
        profileBasedTest();
      } else {
        navigateseniority();
      }
    } else {
      showToast("Credits exhausted", "error");
    }
  };

  const privacyPolicyRedirect = () => {
    window.open("https://ai.setuschool.com/privacy_policy", "_blank");
  };

  const termsAndConditionsRedirect = () => {
    window.open("https://ai.setuschool.com/terms_condition", "_blank");
  };

  const aboutUsRedirect = () => {
    window.open("https://ai.setuschool.com/about", "_blank");
  };

  const blogsRedirect = () => {
    window.open("https://ai.setuschool.com/all/blog", "_blank");
  };

  const contactUsRedirect = () => {
    window.open("https://ai.setuschool.com/contact", "_blank");
  };

  const returnAndRefundPolicyRedirect = () => {
    window.open("https://ai.setuschool.com/return_refund", "_blank");
  };

  return (
    <div className={classes["wrapper"]}>
      {loading ? (
        <div className={classes["load-container"]}>
          <img
            src={loaderFlag ? loader : details_loader}
            alt="Loading..."
            width="100"
          />
        </div>
      ) : (
        <>
          <div className={classes["header"]}>
            <div className={classes["logo"]}>
              <img
                src={windowWidth <= 767 ? dakshImg : dakshImg}
                alt="SETU"
                className={classes["logo"]}
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/")}
              />
            </div>
            <div className={classes["actions"]} ref={menuRef}>

              {localStorage.getItem("user") ? (
                <img
                  className={classes["profile"]}
                  src={profileIcon}
                  alt=""
                  onClick={() => navigate("/completeprofile")}
                />
              ) : (
                <button
                  className={classes["login"]}
                  onClick={() =>
                    navigate("/login", {
                      state: {
                        from: `/evaluate-profile?exam_name=${encodeURIComponent(
                          exam_name
                        )}`,
                        toggleinspopup: false,
                      },
                    })
                  }
                >
                  Login
                </button>
              )}
              <img
                src={menu_icon}
                alt="Menu"
                className={classes["menu"]}
                onClick={handleMenuToggle}
              />
              {menuOpen && (
                <div className={classes["menu-options"]}>
                  <div
                    className={classes["options"]}
                    onClick={() => handleButtonClick("logout")}
                  >
                    <p>Log out</p>
                  </div>
                  <hr className={classes["menu-hr"]} />
                </div>
              )}
            </div>
          </div>
          <div className={classes["main-container"]}>
            <div className={classes["top"]}>
              {windowWidth > 768 ? (
                <div
                  onClick={() => navigate("/", { state: { focusedId } })}
                  className={classes["back"]}
                >
                  Home {">"} {suborob} Interview
                </div>
              ) : (
                <div
                  onClick={() => navigate("/", { state: { focusedId } })}
                  className={classes["back"]}
                >
                  <img src={back_arrow} className={classes["back-icon"]} />
                  <p className={classes["back-txt"]}>Back</p>
                </div>
              )}
              <div
                className={classes["challenge"]}
                onClick={() => {
                  if (localStorage.getItem("user")) {
                    setShareModalOpen(true);
                  } else {
                    navigate("/login", {
                      state: {
                        from: `/practice-your-skill?exam_name=${encodeURIComponent(
                          exam_name
                        )}`,
                        throughloginprocess: true,
                        // from: `/personlized-test?&exam_name=${exam_name}&t=${subject.exam_category}`,
                      },
                    });
                  }
                }}
              >
                <img
                  src={challenge_sword}
                  alt=""
                  className={classes["challenge-sword"]}
                />
                <div>Challenge a Friend</div>
              </div>
            </div>
            <div
              style={{ display: windowWidth <= 768 ? "" : "flex" }}
              className={classes["start-consume-trust"]}
            >
              <div>
                <div
                  className={
                    windowWidth <= 768
                      ? classes["title-button-mobile"]
                      : classes["title-button-web"]
                  }
                >
                  <div>
                    <div className={classes["title"]}>
                      {exam_name} {exam_type ? "Interview" : "Assessment"}
                    </div>
                    <div className={classes["sub-title"]}>
                      Prove Your skills. Unlock jobs.
                    </div>
                  </div>

                  {/* <button
                    className={
                      windowWidth <= 768
                        ? classes["image-button-mobile"]
                        : classes["image-button-web"]
                    }
                  >
                    <img
                      height={windowWidth <= 768 ? 18 : ""}
                      width={windowWidth <= 768 ? 18 : ""}
                      src={coins}
                    ></img>{" "}
                    5 Credits available
                  </button> */}
                </div>

                {/* <div className={classes["four-buttons"]}>
                  <button
                    className={
                      windowWidth <= 768
                        ? classes["four-buttons-individual-mobile"]
                        : classes["four-buttons-individual-web"]
                    }
                  >
                    <img
                      src={skills_img}
                      alt=""
                      className={classes["skills-img"]}
                    />
                    {noOfCompetencies} Competencies
                  </button>
                  <button
                    className={
                      windowWidth <= 768
                        ? classes["four-buttons-individual-mobile"]
                        : classes["four-buttons-individual-web"]
                    }
                  >
                    <img
                      src={timer_img}
                      alt=""
                      className={classes["level-img"]}
                    />
                    {examDuration} min
                  </button>
                  <button
                    className={
                      windowWidth <= 768
                        ? classes["four-buttons-individual-mobile"]
                        : classes["four-buttons-individual-web"]
                    }
                  >
                    <img
                      src={no_of_questions_img}
                      alt=""
                      className={classes["no-of-questions-img"]}
                    />
                    {totalNoOfQuestions} Questions
                  </button>
                </div> */}

                <div>
                  <button
                    className={
                      windowWidth <= 768
                        ? classes["start-the-test-last-mobile"]
                        : classes["start-the-test-last-web"]
                    }
                    onClick={handleStartAssessmentButtonClick}
                  >
                    Start Assessment
                  </button>
                  <p className={classes["consume"]}>
                    This will consume 1 credit.
                  </p>
                  <div className={classes["unlock-main"]}>
                    {/* <div className={classes["unlock"]}></div> */}
                    <div
                      className={
                        windowWidth <= 768
                          ? classes["free-mobile"]
                          : classes["free-web"]
                      }
                    >
                      Trusted by top employers
                    </div>
                  </div>
                  <div>
                    <div
                      style={{ gap: windowWidth <= 768 ? "13px" : "" }}
                      className={classes["logo-set-1"]}
                    >
                      <img src={color_ey}></img>
                      <img src={color_pwc}></img>
                      <img src={color_latentview}></img>
                      <img src={color_idfc}></img>
                    </div>
                    <div
                      style={{ gap: windowWidth <= 768 ? "28px" : "" }}
                      className={classes["logo-set-2"]}
                    >
                      <img
                        height={windowWidth <= 768 ? 19 : ""}
                        width={windowWidth <= 768 ? 80 : ""}
                        src={color_rategain}
                      ></img>
                      <img
                        height={windowWidth <= 768 ? 28 : ""}
                        width={windowWidth <= 768 ? 80 : ""}
                        src={color_accenture}
                      ></img>
                      <img
                        height={windowWidth <= 768 ? 30 : ""}
                        width={windowWidth <= 768 ? 60 : ""}
                        src={color_ibm}
                      ></img>
                      <img
                        height={windowWidth <= 768 ? 35 : ""}
                        width={windowWidth <= 768 ? 60 : ""}
                        style={{ backgroundColor: "#121212" }}
                        src={color_nexturn}
                      ></img>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className={
                  windowWidth <= 768
                    ? classes["profile-graph-mobile"]
                    : windowWidth >= 820 && windowWidth < 950
                      ? classes["profile-graph-tab"]
                      : classes["profile-graph-web"]
                }
              >
                {/* <ProfileGraph /> */}
                <img
                  height={
                    windowWidth <= 768
                      ? 300
                      : windowWidth >= 820 && windowWidth < 950
                        ? 500
                        : 560
                  }
                  width={
                    windowWidth <= 768
                      ? "90%"
                      : windowWidth >= 820 && windowWidth < 950
                        ? 500
                        : 600
                  }
                  // style={{ background: "transparent" }}
                  src={profile_graph}
                ></img>
              </div>
            </div>
            {/* </> */}
            {/* )} */}

            {/* {windowWidth > 767 && ( */}

            {/* )} */}
            {windowWidth > 768 ? (
              <div className={classes["use-case-div"]}>
                <div className={classes["use-case-title"]}>
                  Assessment Overview
                </div>
                <div className={classes["use-case-second-div"]}>
                  <div className={classes["use-case-second-div-txt"]}>
                    <div className={classes["use-case-txt"]}>
                      {examDescription}
                    </div>
                    {/* <div>
                    <button
                      className={classes["start-the-test-last"]}
                      onClick={handleStartTheTest}
                    >
                      Start the assessment
                    </button>
                  </div> */}
                  </div>
                  <div className={classes["about-setu"]}>
                    <p className={classes["about-setu-title"]}>
                      {exam_type
                        ? "SETU's Daksh Platform"
                        : "SETU Profile Based Assessments"}
                    </p>
                    <div className={classes["about-setu-features"]}>
                      <div className={classes["ratings"]}>
                        <div className={classes["ratings-inner"]}>
                          <p className={classes["ratings-star"]}>
                            {averageRating}{" "}
                            <img
                              src={ratings_star}
                              alt=""
                              className={classes["ratings-star-img"]}
                            />
                          </p>
                          {/* <br /> */}
                          <p className={classes["ratings-number"]}>
                            {noOfRatings} ratings
                          </p>
                        </div>
                        <div className={classes["ratings-border"]}></div>
                      </div>
                      <div className={classes["learners"]}>
                        <div className={classes["learners-inner"]}>
                          <img
                            src={learners_people}
                            alt=""
                            className={classes["learners-people-img"]}
                          />{" "}
                          <br />
                          {noOfLearners} Learners
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={classes["use-case-div"]}>
                <div className={classes["use-case-second-div"]}>
                  <div className={classes["about-setu"]}>
                    <p className={classes["about-setu-title"]}>
                      {exam_type
                        ? "SETU's Daksh Platform"
                        : "SETU Profile Based Assessments"}
                    </p>
                    <div className={classes["about-setu-features"]}>
                      <div className={classes["ratings"]}>
                        <div className={classes["ratings-inner"]}>
                          <p className={classes["ratings-star"]}>
                            {averageRating}{" "}
                            <img
                              src={ratings_star}
                              alt=""
                              className={classes["ratings-star-img"]}
                            />
                          </p>
                          {/* <br /> */}
                          <p className={classes["ratings-number"]}>
                            {noOfRatings} ratings
                          </p>
                        </div>
                        <div className={classes["ratings-border"]}></div>
                      </div>
                      <div className={classes["learners"]}>
                        <div className={classes["learners-inner"]}>
                          <img
                            src={learners_people}
                            alt=""
                            className={classes["learners-people-img"]}
                          />{" "}
                          <br />
                          {noOfLearners} Learners
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={classes["use-case-title"]}>
                  Assessment Overview
                </div>
                <div className={classes["use-case-second-div-txt"]}>
                  <div className={classes["use-case-txt"]}>
                    {examDescription}
                  </div>
                </div>
              </div>
            )}

            {/* <div className={classes["talent"]}>
              <div className={classes["blur-overlay"]}></div>{" "}
              <div className={classes["talent-title"]}>
                Adopted by Corporate Talent Across Market Leaders
              </div>
              <div className={classes["slidecontainer-first"]}>
                <Swiper
                  spaceBetween={10}
                  slidesPerView={windowWidth > 767 ? 8 : 7}
                  loop={true}
                  speed={5000}
                  autoplay={{ delay: 0, disableOnInteraction: false }}
                  allowTouchMove={false}
                  modules={[Autoplay]}
                  className={classes["swiper"]}
                >
                  {logos_first.map((logo, index) => (
                    <SwiperSlide key={index}>
                      <img
                        src={logo}
                        alt={`Logo ${index}`}
                        className={classes["icon-two"]}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div> */}
            <div className={classes["backed-cards"]}>
              <div className={classes["cards-main-title"]}>
                Designed by Industry Experts, Backed by Top Employers
              </div>
              {windowWidth > 768 ? (
                <div className={classes["card-row-first"]}>
                  <div className={classes["card-individual"]}>
                    <img src={card_one} className={classes["icon"]} />
                    <div className={classes["card-individual-txts"]}>
                      <div className={classes["card-title"]}>
                        Real-World Tested
                      </div>
                    </div>
                  </div>
                  <div className={classes["card-individual"]}>
                    <img src={card_two} className={classes["icon"]} />
                    <div className={classes["card-individual-txts"]}>
                      <div className={classes["card-title"]}>
                        Built by Practitioners
                      </div>
                    </div>
                  </div>
                  <div className={classes["card-individual"]}>
                    <img src={card_six} className={classes["icon"]} />
                    <div className={classes["card-individual-txts"]}>
                      <div className={classes["card-title"]}>
                        Employer-validated
                      </div>
                    </div>
                  </div>
                  <div className={classes["card-individual"]}>
                    <img src={card_five} className={classes["icon"]} />
                    <div className={classes["card-individual-txts"]}>
                      <div className={classes["card-title"]}>Job-relevant</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className={classes["card-row-first"]}>
                    <div className={classes["card-individual"]}>
                      <img src={card_one} className={classes["icon"]} />
                      <div className={classes["card-individual-txts"]}>
                        <div className={classes["card-title"]}>
                          Real-World Tested
                        </div>
                      </div>
                    </div>
                    <div className={classes["card-individual"]}>
                      <img src={card_two} className={classes["icon"]} />
                      <div className={classes["card-individual-txts"]}>
                        <div className={classes["card-title"]}>
                          Built by Practitioners
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={classes["card-row-second"]}>
                    <div className={classes["card-individual"]}>
                      <img src={card_six} className={classes["icon"]} />
                      <div className={classes["card-individual-txts"]}>
                        <div className={classes["card-title"]}>
                          Employer-validated
                        </div>
                      </div>
                    </div>
                    <div className={classes["card-individual"]}>
                      <img src={card_five} className={classes["icon"]} />
                      <div className={classes["card-individual-txts"]}>
                        <div className={classes["card-title"]}>
                          Job-relevant
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className={classes["sharpen-skills-div"]}>
              <div className={classes["sharpen-skills"]}>
                👉Your Carrier Starts Here - Take the Assessment Now.
              </div>
              <div className={classes["start-the-test-div-last"]}>
                <button
                  className={classes["start-the-test-last-last"]}
                  onClick={handleStartAssessmentButtonClick}
                >
                  Start Assessment
                </button>
              </div>
            </div>
            {/* footer comment out part */}
            {/* {windowWidth > 768 ? (
              <div className={classes["footer"]}>
                <div className={classes["footer-first"]}>
                  <img src={SETU_logo} alt="" />
                  <p>
                    <b>Email :</b> mitra@setuschool.com
                  </p>
                  <p>
                    <b>Phone & Whatsapp :</b> 8100551189
                  </p>
                  <p>
                    SETU, Awfis co-working space, 6th floor, Phase II,
                    <br />
                    50, Chowringee Road, Elgin, Kolkata, west Bengal 700071{" "}
                  </p>
                </div>

                <div className={classes["footer-last-div"]}>
                  <div className={classes["footer-last"]}>
                    <p className={classes["footer-about"]}>About</p>
                    <p onClick={aboutUsRedirect}>About us</p>
                    <p onClick={blogsRedirect}>Blogs</p>
                    <p onClick={contactUsRedirect}>Contact us</p>
                  </div>
                  <div className={classes["footer-last"]}>
                    <p onClick={privacyPolicyRedirect}>Privacy Policy</p>
                    <p onClick={termsAndConditionsRedirect}>
                      Terms & Conditions
                    </p>
                    <p onClick={returnAndRefundPolicyRedirect}>
                      Return & Refund Policy
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <footer className={classes["landing-page-footer"]}>
                <img
                  src={SETU_logo}
                  className={classes["footer-setu-icon"]}
                  alt=""
                />

                <p className={classes["email"]}>Email : mitra@setuschool.com</p>
                <br />
                <p className={classes["email"]}>
                  Phone & Whatsapp : 8100551189
                </p>
                <br />
                <p className={classes["address"]}>
                  SETU, Awfis co-working space, 6th floor, Phase II, 50,
                  Chowringee Road, Elgin, Kolkata, west Bengal 700071{" "}
                </p>

                <br />
                <p className={classes["about-p"]}>About </p>
                <ul className={classes["about-lists"]}>
                  <li onClick={aboutUsRedirect}>About us</li>
                  <li onClick={blogsRedirect}>Blogs</li>
                  <li onClick={contactUsRedirect}>Contacts</li>
                  <li onClick={privacyPolicyRedirect}>Privacy Policy</li>
                  <li onClick={termsAndConditionsRedirect}>
                    Terms & Conditions
                  </li>
                  <li onClick={returnAndRefundPolicyRedirect}>
                    Return & Refund Policy
                  </li>
                </ul>
              </footer>
            )} */}
          </div>
          {shareModalOpen && (
            <ShareButtons
              totalMarks={0}
              obtainedMarks={0}
              assessmentname={subject.exam_name}
              url={shareUrl}
              title={title}
              text={text}
              onClose={() => setShareModalOpen(false)}
            />
          )}
          {/* showInstructionPopup && (
            <div
              className={classes["ins-popup-overlay"]}
              onClick={() => setShowInstructionPopup(false)}
            >
              <div
                className={classes["ins-popup-content"]}
                onClick={(e) => e.stopPropagation()}
              >
                <p className={classes["model-instruction-heading"]}>
                  Instructions
                </p>
                <div className={classes["model-instruction-text"]}>
                  {examInstructions.map((item, index) => (
                    <div key={index} className={classes["instruction-row"]}>
                      <div className={classes["instruction-icon-wrapper"]}>
                        <span className={classes["instruction-icon"]}>
                          {examInstructions.length / 2 > index ? (
                            <img src={ins_bulb}></img>
                          ) : (
                            <img src={ins_timer}></img>
                          )}
                        </span>
                      </div>
                      <div className={classes["instruction-text-wrapper"]}>
                        <span className={classes["instruction-text"]}>
                          {item}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className={classes["iam-ready-to-start-the-test-btn"]}
                  // onClick={() => setShowPopup(false)}
                  onClick={() => profileBasedTest()}
                >
                  I am ready to start the assessment
                </button>
              </div>
            </div>
          ) */}
          {showPopup && (
            <div className={classes["overlay"]}>
              <div className={classes["submit-popup"]}>
                <div>
                  <img src={gifIcon} alt="" />
                </div>

                <p className={classes["main-q"]}>
                  Assessment already attempted
                </p>
                <div className={classes["popup-actions"]}>
                  <button
                    className={classes["cancel-button"]}
                    onClick={onClose}
                  >
                    Close
                  </button>
                  <button
                    className={classes["confirm-button"]}
                    onClick={() => viewResult()}
                  >
                    View Result
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NewInstructionPagePfp;
