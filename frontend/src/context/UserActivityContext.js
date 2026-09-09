// import React, { createContext, useContext, useState, useEffect } from "react";
// import { SERVER_URL } from "../index.js";

// // Create a Context for User Activity
// const UserActivityContext = createContext();

// // Create a Provider Component
// export const UserActivityProvider = ({ children }) => {
//   // Store the history of user activities
//   const [activityHistory, setActivityHistory] = useState([]);

//   // Function to log the user activity and make an API call (optional)
//   const logActivity = (description) => {
//     const updatedHistory = [
//       ...activityHistory,
//       description, // Add the new activity object directly
//     ];

//     setActivityHistory(updatedHistory);
//     return updatedHistory;
//   };

//   // Function to clear activity history
//   const clearActivity = () => {
//     setActivityHistory([]);
//   };

//   // Function to log user activity to the server
//   const userLog = async (loggedInStatus,logHistory,email) => {
//     //console.log()

//     const data_payload = {
//       user_id: email,
//       logged_in_status: loggedInStatus,
//       user_activity: logHistory, // Send the flat array directly
//     };

//     try {
//       const response = await fetch(`${SERVER_URL}/log_user_activity`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(data_payload),
//       });

//       if (response.ok) {
//         //console.log("User activity logged successfully");
//         clearActivity();
//       } else {
//         // Handle errors
//         const errorData = await response.json();
//         const errorMessage =
//           errorData.error || "An error occurred during the operation.";
//         console.error("Error logging user activity:", errorMessage);

//         if (response.status >= 400 && response.status < 500) {
//           alert(`Client Error: ${errorMessage}`);
//         } else if (response.status >= 500) {
//           alert(`Server Error: ${errorMessage}`);
//         }
//       }
//     } catch (error) {
//       console.error("Error logging user activity:", error);
//     }
//   };

//   useEffect(() => {
//     //console.log("HISTORY Updated:", activityHistory); // Logs updated activityHistory when it changes
//   }, [activityHistory]); // Dependency on activityHistory

//   return (
//     <UserActivityContext.Provider
//       value={{ activityHistory, logActivity, clearActivity, userLog }}
//     >
//       {children}
//     </UserActivityContext.Provider>
//   );
// };

// // Custom Hook to access the Context
// export const useUserActivity = () => {
//   return useContext(UserActivityContext);
// };

"use client"
import React, { createContext, useContext, useState, useEffect } from "react";
// import { SERVER_URL } from "../index.js";


const SERVER_URL = process.env.NEXT_PUBLIC_API_SERVER_URL;


// Create a Context for User Activity
const UserActivityContext = createContext();

// Create a Provider Component
export const UserActivityProvider = ({ children }) => {
  // Store the history of user activities
  const [activityHistory, setActivityHistory] = useState([]);

  // Function to log the user activity and return the updated history
  const logActivity = (description) => {
    let updatedHistory;
    setActivityHistory((prevHistory) => {
      updatedHistory = [...prevHistory, description]; // Compute the updated state
      return updatedHistory; // Return the updated state for React
    });
    return updatedHistory; // Return the updated history to the caller
  };

  // Function to clear activity history
  const clearActivity = () => {
    setActivityHistory([]);
  };

  // Function to log user activity to the server
  const userLog = async (loggedInStatus, logHistory, email) => {
    const data_payload = {
      user_id: email,
      logged_in_status: loggedInStatus,
      user_activity: logHistory, // Send the flat array directly
    };

    try {
      const response = await fetch(`${SERVER_URL}/log_user_activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data_payload),
      });

      if (response.ok) {
        //console.log("User activity logged successfully");
        clearActivity();
      } else {
        // Handle errors
        const errorData = await response.json();
        const errorMessage =
          errorData.error || "An error occurred during the operation.";
        console.error("Error logging user activity:", errorMessage);

        if (response.status >= 400 && response.status < 500) {
          // alert(`Client Error: ${errorMessage}`);
        } else if (response.status >= 500) {
          // alert(`Server Error: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error("Error logging user activity:", error);
    }
  };

  useEffect(() => {
    //console.log("HISTORY Updated:", activityHistory); // Logs updated activityHistory when it changes
  }, [activityHistory]); // Dependency on activityHistory

  return (
    <UserActivityContext.Provider
      value={{ activityHistory, logActivity, clearActivity, userLog }}
    >
      {children}
    </UserActivityContext.Provider>
  );
};

// Custom Hook to access the Context
export const useUserActivity = () => {
  return useContext(UserActivityContext);
};
