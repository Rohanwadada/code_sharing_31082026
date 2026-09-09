'use client';

import { useEffect, useState } from 'react';
import styles from './CourseRecommendation.module.css';
import {
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Clock,
  Globe,
  Award,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRoadmapStore } from '@/store/roadmapStore';
import { useNotification } from '@/hooks/useNotification';
import {
  getCourseRecommendation,
  getCourseRecommendationJobStatus as getCourseRecommendationJobStatusApi,
} from '@/service/courseRecommendation.service';
import Button from '../ui/Button';

const CourseRecommendation = ({ roadmapId }) => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const courseRecommendationJobDetails = useRoadmapStore(
    (s) => s.courseRecommendationJobDetails,
  );
  const setCourseRecommendationJobDetails = useRoadmapStore(
    (s) => s.setCourseRecommendationJobDetails,
  );
  const courseRecommendations = useRoadmapStore((s) => s.courseRecommendations);
  const setCourseRecommendations = useRoadmapStore(
    (s) => s.setCourseRecommendations,
  );

  const { showNotification } = useNotification();

  const [expandedCourse, setExpandedCourse] = useState(null);
  const [isActiveAPICall, setIsActiveAPICall] = useState(false);
  const [sortBy, setSortBy] = useState('chronology');

  const average = (arr) => {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  /**
   * Sorts course recommendations based on the specified sorting criterion.
   *
   * @param {Array} courseRecommendations - The course recommendations object containing an array of courses
   * @param {string} sortBy - The sorting criterion to apply. Can be one of:
   *   - `coverage`: Sorts courses by coverage percentage in descending order (highest first)
   *   - `chronology`: Sorts courses by the minimum chapter number, then by average chapter number,
   *     and finally by course ID (lexicographically) as tiebreaker. Ascending order for chapters.
   *   - `rating`: Sorts courses by star rating in descending order (highest first).
   *     Courses with null/undefined ratings are placed at the end.
   *
   * @returns {Array} An array of sorted course objects. Returns an empty array if
   *   courseRecommendations or recommended_courses is not available.
   *
   * @example
   * // Sort by coverage percentage
   * const sorted = sortedCourses; // when sortBy === 'coverage'
   *
   * @example
   * // Sort by chronology (min chapter, then avg chapter, then course_id)
   * const sorted = sortedCourses; // when sortBy === 'chronology'
   *
   * @example
   * // Sort by rating (descending, nulls last)
   * const sorted = sortedCourses; // when sortBy === 'rating'
   */
  const sortedCourses = courseRecommendations?.recommended_courses
    ? [...courseRecommendations.recommended_courses].sort((a, b) => {
        if (sortBy === 'coverage')
          return b.coverage_percentage - a.coverage_percentage;
        else if (sortBy === 'chronology') {
          const aMin = Math.min(...a.actual_chapters_contributed);
          const bMin = Math.min(...b.actual_chapters_contributed);

          if (aMin !== bMin) return aMin - bMin;

          const aAvg = average(a.actual_chapters_contributed);
          const bAvg = average(b.actual_chapters_contributed);

          if (aAvg !== bAvg) return aAvg - bAvg;

          return a.course_id.localeCompare(b.course_id);
        } else if (sortBy === 'rating') {
          const aRating = a.course_metadata.course_star_rating;
          const bRating = b.course_metadata.course_star_rating;

          // null/undefined ratings will go to last
          if (aRating == null && bRating == null) return 0;
          if (aRating == null) return 1;
          if (bRating == null) return -1;

          // sort descending if both the rating exists
          return bRating - aRating;
        }
        return 0;
      })
    : [];

  const recalculateMutualCoverage = (sortedCourses) => {
    const coveredChapters = new Set();

    return sortedCourses.map((course) => {
      const newChapters = course.actual_chapters_contributed.filter(
        (chapter) => !coveredChapters.has(chapter),
      );

      // Mark newly covered chapters
      newChapters.forEach((ch) => coveredChapters.add(ch));
      return {
        ...course,
        effective_contribution_count: newChapters.length,
        actual_chapters_contributed: newChapters,
        coverage_percentage: (
          (newChapters.length * 100) /
          courseRecommendations.total_chapters
        ).toFixed(2),
        effective_chapters_covered: newChapters.map(
          (val, idx) => courseRecommendations.roadmap_chapters[val],
        ),
      };
    });
  };
  const coursesWithRecalculatedCoverage =
    recalculateMutualCoverage(sortedCourses);

  const toggleExpand = (courseId) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const getChapterColorClass = (index) => {
    const colors = [
      'chapterRed',
      'chapterBlue',
      'chapterYellow',
      'chapterGreen',
      'chapterPink',
      'chapterPurple',
    ];
    return colors[index % colors.length];
  };

  const getCourseRecommendations = async (retry = false) => {
    try {
      setIsActiveAPICall(true);

      const responseData = await getCourseRecommendation(roadmapId, retry);

      setCourseRecommendationJobDetails({
        job_id: responseData.job_id,
        mode: 'ai',
      });
      showNotification('success', 'Course recommendation started');
      if (retry) {
        setCourseRecommendations({ overall_status: 'pending' });
      }
    } catch (error) {
      console.log(error);
      showNotification('error', 'Something went wrong');
    } finally {
      setIsActiveAPICall(false);
    }
  };

  useEffect(() => {
    let intervalId;
    const getCourseRecommendationJobStatus = async () => {
      try {
        if (!courseRecommendationJobDetails?.job_id) {
          return;
        }
        const data = {
          e: userDetails?.email,
          r_id: roadmapId,
          j_id: courseRecommendationJobDetails?.job_id,
        };
        const responseData = await getCourseRecommendationJobStatusApi(
          courseRecommendationJobDetails?.job_id,
          roadmapId,
        );
        setCourseRecommendations(responseData);
        if (['complete', 'failed'].includes(responseData.overall_status)) {
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error(error);
        clearInterval(intervalId);
      }
    };

    const pollInterval = 3000;
    getCourseRecommendationJobStatus();
    intervalId = setInterval(getCourseRecommendationJobStatus, pollInterval);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [courseRecommendationJobDetails, userDetails?.email, roadmapId]);

  useEffect(() => {
    const getCourseRecommendationsFromEvent = async (e) => {
      console.log(courseRecommendations);
      const currentStatus = courseRecommendations?.overall_status;
      console.log(currentStatus);
      if (['pending', 'processing', 'complete'].includes(currentStatus)) return;
      else if (currentStatus === 'failed') {
        await getCourseRecommendations(true);
      } else if (!courseRecommendations) {
        await getCourseRecommendations(false);
      }
    };
    window.addEventListener(
      'content:courseRecommendation',
      getCourseRecommendationsFromEvent,
    );
    return () =>
      window.removeEventListener(
        'content:courseRecommendation',
        getCourseRecommendationsFromEvent,
      );
  }, [courseRecommendations]);

  return (
    <div
      className={styles['main-container']}
      id="course-recommendation-container"
    >
      <div className={styles['header']}>
        <h1 className={styles['title']}>Recommended Courses</h1>
        <p className={styles['subtitle']}>
          Coursera courses to complete your learning roadmap
        </p>
      </div>
      {!courseRecommendationJobDetails ? (
        <div className={styles['generateCt']}>
          <Button
            variant="primary"
            className={styles['getRecommendationBtn']}
            onClick={() => getCourseRecommendations(false)}
            disabled={isActiveAPICall || courseRecommendationJobDetails?.job_id}
          >
            Get Course Recommendation
          </Button>
        </div>
      ) : ['pending', 'processing'].includes(
          courseRecommendations?.overall_status,
        ) ? (
        <div className={styles['loading-ct']}>
          {/* <img src='' alt='loading' />*/}
          <span>I’m generating your recommended course.</span>
        </div>
      ) : (
        courseRecommendations?.overall_status === 'failed' && (
          <div className={styles['failedCt']}>
            <div>Something went wrong. Please retry</div>
            <Button
              variant="primary"
              className={styles['retryGetRecommendationBtn']}
              onClick={() => getCourseRecommendations(true)}
              disabled={isActiveAPICall}
            >
              Retry
            </Button>
          </div>
        )
      )}

      {courseRecommendations &&
        courseRecommendations?.overall_status === 'complete' &&
        (coursesWithRecalculatedCoverage.length === 0 ? (
          <div className={styles['emptyStateWrapper']}>
            <h2>No Recommendations Found</h2>
            <p>There is no suitable course found for this roadmap</p>
          </div>
        ) : (
          <div className={styles['bottom']}>
            {/* Overall Progress */}
            <div className={styles['overallProgress']}>
              <div className={styles['progressHeader']}>
                <div className={styles['progressLabel']}>
                  <TrendingUp
                    className={styles['text-emerald-600']}
                    size={24}
                  />
                  <span className={styles['progressLabelText']}>
                    Overall Roadmap Coverage
                  </span>
                </div>
                <span className={styles['progressPercentage']}>
                  {courseRecommendations.coverage_percentage_overall}%
                </span>
              </div>
              <div className={styles['progressBarOuter']}>
                <div
                  className={styles['progressBarInner']}
                  style={{
                    width: `${courseRecommendations.coverage_percentage_overall}%`,
                  }}
                />
              </div>
              <p className={styles['progressStats']}>
                {courseRecommendations.total_covered} of{' '}
                {courseRecommendations.total_chapters} chapters covered
              </p>
            </div>
            {/* Filters and Sort */}
            <div className={styles['filterRow']}>
              <div className={styles['courseCount']}>
                Showing {coursesWithRecalculatedCoverage.length} courses
              </div>
              <div className={styles['sortContainer']}>
                <label className={styles['sortLabel']}>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles['sortSelect']}
                >
                  <option value="chronology">Chronology</option>
                  <option value="coverage">Coverage %</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>

            {/* Course Grid */}
            <div className={styles['courseList']}>
              {coursesWithRecalculatedCoverage.map((course, idx) => (
                <div key={idx} className={styles['courseCard']}>
                  {/* Course Card Header */}
                  <div className={styles['courseCardBody']}>
                    <div className={styles['courseCardTop']}>
                      <div className={styles['courseCardLeft']}>
                        <div className={styles['courseTitleRow']}>
                          <h3 className={styles['courseTitle']}>
                            {course.course_name}
                            <span className={styles['courseBadge']}>
                              {course.course_metadata.course_type}
                            </span>
                          </h3>
                        </div>
                        <p className={styles['university']}>
                          {course.course_metadata.university_partner_name}
                        </p>

                        {/* Stats Row */}
                        <div className={styles['statsRow']}>
                          <div className={styles['statItem']}>
                            <Star
                              className={
                                styles['text-yellow-500 fill-yellow-500']
                              }
                              size={16}
                            />
                            <span className={styles['statRating']}>
                              {course.course_metadata?.course_star_rating ||
                                'Not Provided'}
                            </span>
                          </div>
                          <div className={styles['statItem']}>
                            <Clock size={16} />
                            <span className={styles['statText']}>
                              {course.course_metadata.total_video_duration_mins}{' '}
                              mins
                            </span>
                          </div>
                          <div className={styles['statItem']}>
                            <Globe size={16} />
                            <span className={styles['statText']}>
                              {course.course_metadata.course_language}
                            </span>
                          </div>
                          <div className={styles['statItem']}>
                            <BookOpen size={16} />
                            <span className={styles['statText']}>
                              {
                                course.course_metadata
                                  .total_mandatory_qns_in_assessment
                              }{' '}
                              questions
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Coverage Badge */}
                      <div className={styles['coverageBadge']}>
                        <div className={styles['coverageText']}>
                          <div className={styles['coverageNumber']}>
                            {course.coverage_percentage}%
                          </div>
                          <div className={styles['coverageLabel']}>
                            Effective Coverage
                          </div>
                        </div>
                        <div className={styles['coverageBarOuter']}>
                          <div
                            className={styles['coverageBarInner']}
                            style={{
                              width: `${course.coverage_percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                      {idx !== 0 && (
                        <div className={styles['coverageBadge']}>
                          <div className={styles['coverageText']}>
                            <div className={styles['coverageNumber']}>
                              {(
                                (course.actual_contribution_count * 100) /
                                courseRecommendations.total_chapters
                              ).toFixed(2)}
                              %
                            </div>
                            <div className={styles['coverageLabel']}>
                              Original Coverage
                            </div>
                          </div>
                          <div className={styles['coverageBarOuter']}>
                            <div
                              className={styles['coverageBarInner']}
                              style={{
                                width: `${((course.actual_contribution_count * 100) / courseRecommendations.total_chapters).toFixed(2)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Info */}
                    <div className={styles['quickInfo']}>
                      <div className={styles['infoItem']}>
                        <span className={styles['infoLabel']}>Domain:</span>
                        <span className={styles['infoValue']}>
                          {course.course_metadata.coursera_domain}
                        </span>
                      </div>
                      <div className={styles['infoItem']}>
                        <span className={styles['infoLabel']}>•</span>
                      </div>
                      <div className={styles['infoItem']}>
                        <span className={styles['infoLabel']}>Subdomain:</span>
                        <span className={styles['infoValue']}>
                          {course.course_metadata.coursera_subdomain}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles['actionButtons']}>
                      <a
                        href={course.course_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles['primaryButton']}
                      >
                        View on Coursera
                        <ExternalLink size={16} />
                      </a>
                      <button
                        onClick={() => toggleExpand(idx)}
                        className={styles['secondaryButton']}
                      >
                        {expandedCourse === idx ? 'Hide' : 'Show'} Details
                        {expandedCourse === idx ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedCourse === idx && (
                    <div className={styles['expandedDetails']}>
                      {/* Description */}
                      <div className={styles['detailSection']}>
                        <h4 className={styles['detailTitle']}>
                          Course Description
                        </h4>
                        <p className={styles['description']}>
                          {course.course_description}
                        </p>
                      </div>

                      {/* Skills */}
                      <div className={styles['detailSection']}>
                        <h4 className={styles['detailTitleLarge']}>
                          Skills You&apos;ll Learn
                        </h4>
                        <div className={styles['skillsContainer']}>
                          {course.course_metadata.scorable_skills_learned
                            .split(', ')
                            .map((skill, i) => (
                              <span key={i} className={styles['skillChip']}>
                                {skill}
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Chapter Coverage */}
                      <div className={styles['detailSection']}>
                        <h4 className={styles['detailTitleLarge']}>
                          Effective Chapters Covered (
                          {course.effective_contribution_count} chapters)
                        </h4>
                        <div className={styles['chaptersContainer']}>
                          {course.effective_chapters_covered.map(
                            (chapter, i) => (
                              <span
                                key={i}
                                className={`${styles['chapterChip']} ${styles[getChapterColorClass(i)]}`}
                              >
                                {chapter}
                              </span>
                            ),
                          )}
                          {/* {course.effective_chapters_covered.length > 10 && (
                        <span className={styles["moreChip"]}>
                          +{course.effective_chapters_covered.length - 10} more
                        </span>
                      )} */}
                        </div>
                      </div>

                      {/* Additional Info Grid */}
                      <div className={styles['infoGrid']}>
                        {course.specialization && (
                          <div className={styles['infoBox']}>
                            <div className={styles['infoBoxHeader']}>
                              <Award
                                className={styles['text-purple-600']}
                                size={16}
                              />
                              <span className={styles['infoBoxTitle']}>
                                Part of Specialization
                              </span>
                            </div>
                            <a
                              href={course.course_metadata.specialization_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles['infoBoxLink']}
                            >
                              {course.course_metadata.specialization}
                            </a>
                          </div>
                        )}
                        <div className={styles['infoBox']}>
                          <div className={styles['infoBoxTitle']}>
                            Subtitle Languages
                          </div>
                          <div className={styles['infoBoxContent']}>
                            {course.course_metadata.subtitle_language}
                          </div>
                        </div>
                        <div className={styles['infoBox']}>
                          <div className={styles['infoBoxTitle']}>
                            Contribution
                          </div>
                          <div className={styles['infoBoxContent']}>
                            {course.actual_contribution_count} total chapters
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
};

export default CourseRecommendation;
