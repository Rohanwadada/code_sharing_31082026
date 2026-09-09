import React from "react";
import mitt from "mitt"; // Import mitt for event handling
import classes from "./Modal.module.css"; 
import gifIcon from "@/assets/assessment-attempt/warning.gif";
import Image from "next/image";

const eventBus = mitt(); // Define eventBus inside the file

const Modal = ({ message, onClose,submit }) => {
  const handleSubmit = () => {
    eventBus.emit("submitEvent", "tab cross "); // Emit event with message
    onClose(); // Close the modal
  };

  return (
    <div className={classes["overlay"]}>
      <div className={classes["submit-popup"]}>
        <div>
          <Image src={gifIcon} alt="Warning" />
        </div>
        <p className={classes["main-q"]}>{message}</p>
        <div className={classes["popup-actions"]}>
          <button className={classes["cancel-button"]} onClick={onClose}>
            Close
          </button>
          {submit && (
            <button className={classes["cancel-button"]} onClick={handleSubmit}>
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
export { eventBus }; // Export eventBus so other components can listen
