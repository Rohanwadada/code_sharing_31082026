import React, { useState, useEffect } from "react";
import classes from "./FeedbackForm.module.css";
import setuShortIcon from "@/assets/assessment-attempt/setu-logo-short.svg";
import menuIcon from "@/assets/assessment-attempt/menu.svg";
import profileIcon from "@/assets/assessment-attempt/profile.svg";
import feedbackIcon from "@/assets/assessment-attempt/feedback.svg";
import footerSetuIcon from "@/assets/assessment-attempt/setu-logo-web-footer.svg";
// import { SERVER_URL } from "../index.js";
// import Toastify, { showToast } from "./Toastify"; // Import Toastify and sho
import dakshImg from "@/assets/asset-daksh/dakshimg.png";
import { useNotification } from "@/hooks/useNotification";
import { useRouter } from "next/navigation";
import Image from "next/image";

const SERVER_URL = process.env.NEXT_PUBLIC_API_SERVER_URL;


const FeedbackForm = ({ onApiCallComplete, examName, examType }) => {
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState(""); // New state for textarea
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(rating === "0");

  const { showNotification } = useNotification()

  const router = useRouter();

  async function handleAssignmentSubmit() {
    try {
      setIsSubmitDisabled(true);
      const user = JSON.parse(localStorage.getItem("user"));
      const email = user?.email;

      if (!email) {
        throw new Error("User email not found in local storage.");
      }

      const payload = {
        user_email: email,
        testimonial_text: feedbackText, // Using state value here
        rating: rating.toString(),
        captured_form: `setu-assessment_${examType}_test_${examName}_mcq`,
      };

      //console.log("Payload:", payload); // For debugging

      const response = await fetch(`${SERVER_URL}/add-testimonial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setIsSubmitDisabled(false);
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit feedback.");
      }

      const responseData = await response.json();
    } catch (error) {
      // showToast("Something went Wrong", "error");
      showNotification("error", "Something went Wrong")
    } finally {
      onApiCallComplete(); // Always executes, whether success or error
    }
  }
  useEffect(() => {
    if (rating > 0) {
      setIsSubmitDisabled(false);
      console.log(isSubmitDisabled);
    } else {
      setIsSubmitDisabled(true);
      console.log(isSubmitDisabled);
    }
  }, [rating]);

  useEffect(() => {
    console.log(isSubmitDisabled);
   
  }, []);

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
  const RedirectForBusiness = () => {
    window.open("https://ai.setuschool.com/setu-business", "_blank");
  };
  return (
    <>
      {/* <Toastify />*/}
      <div className={classes["container"]}>
        <div className={classes["feedback-container"]}>
          <div className={classes["header-part"]}>
            <Image
              src={dakshImg}
              alt=""
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/")}
               className={classes["logo"]}
            />
            {/* <div className={classes["header-part-right"]}>
              <img className={classes["profile"]} src={profileIcon} alt="" />
              <img src={menuIcon} alt="" />
            </div> */}
          </div>

          <div className={classes["body-section"]}>
            <p className={classes["heading-p"]}>{examName}</p>

            <p className={classes["experience-p"]}>
              You’ve finished the assessment! Before you submit, we’d like to
              know what you think about your experience, regardless of how you
              think you did.
            </p>

            <div className={classes["feedback-part-parent"]}>
              <Image src={feedbackIcon} alt="" />
              <div className={classes["feedback-part"]}>
                <p className={classes["rate-exp"]}>
                  Please rate your experience below
                </p>
                <div className={classes["feedback-num-section"]}>
                  {[...Array(11)].map((_, index) => (
                    <p
                      className={classes["feedback-num"]}
                      key={index}
                      style={{
                        position: "relative",
                      }}
                      onClick={() => setRating(index)}
                    >
                      {index}
                    </p>
                  ))}
                </div>
                <input
                  className={classes["feedback-range"]}
                  type="range"
                  min="0"
                  max="10"
                  value={rating}
                  style={{
                    background: `linear-gradient(to right, #3867F3 ${
                      (rating / 10) * 100
                    }%, rgba(56, 103, 243, 0.30) ${(rating / 10) * 100}%)`,
                  }}
                  onChange={(e) => setRating(Number(e.target.value))}
                />
                <p className={classes["additional-feedback"]}>
                  Additional feedback
                </p>
                <textarea
                  className={classes["feedback-text"]}
                  placeholder="My feedback!!"
                  value={feedbackText} // Binding state
                  onChange={(e) => setFeedbackText(e.target.value)} // Updating state
                ></textarea>
              </div>
            </div>

            <div className={classes["submit-part"]}>
              <button
                disabled={isSubmitDisabled}
                onClick={handleAssignmentSubmit}
                style={{
                  background: isSubmitDisabled
                    ? "#bebebe"
                    : "linear-gradient(90deg, #FFC727 0%, #F90 59.17%)",
                  color: isSubmitDisabled ? "#757575" : "#000",
                  cursor: isSubmitDisabled ? "not-allowed" : "pointer",
                  boxShadow: isSubmitDisabled
                    ? "none"
                    : "1px 4px 0px 0px #563F00",
                }}
              >
                Submit the assignment
              </button>
            </div>
          </div>

          {/* <footer>
            <img
              src={footerSetuIcon}
              className={classes["footer-setu-icon"]}
              alt=""
            />

            <p className={classes["email"]}>Email : mitra@setuschool.com</p>
            <br />
            <p className={classes["email"]}>Phone & Whatsapp : 8100551189</p>
            <br />
            <p className={classes["address"]}>
              SETU, Awfis co-working space, 6th floor, Phase II, 50, Chowringee
              Road, Elgin, Kolkata, west Bengal 700071{" "}
            </p>

            <br />
            <p className={classes["about-p"]}>About </p>
            <ul className={classes["about-lists"]}>
              <li onClick={aboutUsRedirect}>About us</li>
              <li onClick={blogsRedirect}>Blogs</li>
              <li onClick={contactUsRedirect}>Contacts</li>
              <li onClick={privacyPolicyRedirect}>Privacy Policy</li>
              <li onClick={termsAndConditionsRedirect}>Terms & Conditions</li>
              <li onClick={returnAndRefundPolicyRedirect}>
                Return & Refund Policy
              </li>
            </ul>
          </footer> */}
        </div>
        {/* <div className={classes["footer"]}>
          <div className={classes["footer-first"]}>
            <img src={footerSetuIcon} alt="" />
            <p>Email : mitra@setuschool.com</p>
            <p>Phone & Whatsapp : 8100551189</p>
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
              <p onClick={termsAndConditionsRedirect}>Terms & Conditions</p>
              <p onClick={returnAndRefundPolicyRedirect}>
                Return & Refund Policy
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </>
  );
};

export default FeedbackForm;
