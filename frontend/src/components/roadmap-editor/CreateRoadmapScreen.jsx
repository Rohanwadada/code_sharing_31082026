'use client';

import React, { useState } from 'react';
import styles from './CreateRoadmapScreen.module.css';
import { Select } from '@/components/ui/Select';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Button from '../ui/Button';
import { createRoadmap } from '@/service/roadmap.service';

/**
 * CreateRoadmapScreen Component
 *
 * This component allows to create a new roadmap by providing details like title, description, and difficulty level.
 * It consists of a multi-step UI(currently single step), a form to capture roadmap details, and a submission button.
 *
 * @component
 * @returns {JSX.Element} The rendered CreateRoadmapScreen component.
 */
const CreateRoadmapScreen = ({projectId}) => {
  // Hook to handle navigation between routes
  const router = useRouter();
  // Get user details from context
  const userDetails = useAuthStore((s) => s.userDetails);
  // State to manage form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: '',
    price: 0,
  });

  /**
   * Handles changes in input fields and updates the form state.
   * @param {Object} e - The event object from input change.
   */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Check if all form fields are filled to enable the "Next" button
  const isFormComplete =
    formData.title &&
    formData.description &&
    formData.level &&
    formData.price &&
    Number(formData.price) !== 0;

  const handleBack = () => {
    window.history.back();
  };

  /**
   * Submits the form data to the backend to create a new roadmap.
   * On success, routes to the roadmap drawing screen.
   * @param {Object} event - The event object from form submission.
   */
  const createNewRoadmap = async (event) => {
    event.preventDefault();
    try {
      const responseData = await createRoadmap(
        formData.title,
        formData.description,
        formData.level,
        formData.price,
        projectId
      );

      // If successfully created, router to roadmap drawing page
      const roadmapId = responseData?.id;
      router.replace('/');
      router.push(`/draw-roadmap/${roadmapId}`);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className={styles['wrapper']}>
      <div className={styles['container']}>
        {/* Back Button to go to the previous screen */}
        <button className={styles['backButton']} onClick={handleBack}>
          <ChevronLeft width={14} height={14} />
          <span>Back</span>
        </button>

        <form className={styles['form']}>
          <div className={styles['form-name']}>New Roadmap</div>

          <div className={styles['form-content']}>
            <div className={styles['form-content-top']}>
              {/* Roadmap Name Field */}
              <div className={styles['form-group']}>
                <label className={styles['name']}>Roadmap Name</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Enter roadmap name"
                  className={styles.input}
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>
              {/* Level Selection Dropdown */}
              <div className={styles['form-group']}>
                <label className={styles['name']}>Roadmap Level</label>
                <Select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className={styles['level']}
                />
              </div>

              <div className={styles['form-group']}>
                <label className={styles['name']}>Roadmap Price</label>
                <div className={styles['price']}>
                  <span className={styles['currency']}>₹</span>

                  <input
                    type="number"
                    name="price"
                    className={styles.input}
                    value={formData.price}
                    onChange={handleChange}
                    inputMode="numeric"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Roadmap Description Field */}
            <div className={styles['form-group-2']}>
              <label className={styles['name']}>Roadmap Description</label>
              <textarea
                name="description"
                className={styles['textarea']}
                value={formData.description}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>
          {/* Submission Button */}
          <div className={styles['button-container']}>
            <Button
              variant="primary"
              size="sm"
              leftPlaceholder={true}
              rightPlaceholder={true}
              type="submit"
              className={`${styles.button} ${
                isFormComplete ? styles.active : ''
              }`}
              disabled={!isFormComplete}
              onClick={createNewRoadmap}
            >
              Next
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ChevronLeft = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 14 14"
      fill="none"
      {...props}
    >
      <path
        d="M8.75 2.625L4.375 7L8.75 11.375"
        stroke="#050505"
        strokeWidth="1.3125"
      />
    </svg>
  );
};

export default CreateRoadmapScreen;
