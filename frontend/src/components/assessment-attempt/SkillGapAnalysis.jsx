'use client';

import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import classes from './SkillGapAnalysis.module.css';
import badgeIcon from '@/assets/assessment-result-page/badge.svg';
import customerExcellence from '@/assets/assessment-result-page/customerExcellence.svg';
import innovationGrowth from '@/assets/assessment-result-page/innovationGrowth.svg';
import productLeadership from '@/assets/assessment-result-page/productLeadership.svg';
import strategicBusinessAcumen from '@/assets/assessment-result-page/strategicBusinessAcumen.svg';
import techData from '@/assets/assessment-result-page/techData.svg';
import Image from 'next/image';
import { useEffect } from 'react';
import { getExamResult } from '@/service/assessmentAttempt.service';
import Header from './Header';
import Button from '../ui/Button';
import {
  getImprovementRoadmapInfo,
  generateImprovementRoadmap as generateImprovementRoadmapApi,
} from '@/service/assessment.service';
import { useRouter } from 'next/navigation';
import { PROJECT_TYPES } from '../project/CreateProject_v2';

// --- Icons ---
const StopwatchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#7D8292"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="13" r="8"></circle>
    <polyline points="12 9 12 13 14 15"></polyline>
    <line x1="12" y1="2" x2="12" y2="4"></line>
  </svg>
);

const TargetIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#7D8292"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const FastIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#7D8292"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
  </svg>
);

const StreakIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#7D8292"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const ShareKycIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.35C15.11 18.56 15.08 18.78 15.08 19C15.08 20.61 16.39 21.92 18 21.92C19.61 21.92 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z"
      fill="#C9A84C"
    />
  </svg>
);

const DownloadKycIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path d="M12 4H14V10H16.5L12 14.5M12 4H10V10H7.5L12 14.5" fill="#C9A84C" />
    <path
      d="M12 4H14V10H16.5L12 14.5L7.5 10H10V4H12Z"
      stroke="#C9A84C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 19H18"
      stroke="#C9A84C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const QrKycIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 3H3V9H5V5H9V3ZM3 21V15H5V19H9V21H3ZM15 3V5H19V9H21V3H15ZM19 15H21V21H15V19H19V15ZM7 7H11V11H7V7ZM7 13H11V17H7V13ZM17 7H13V11H17V7ZM13 13H17V17H13V13Z"
      fill="#C9A84C"
    />
  </svg>
);

// --- Gauge Component ---
const GaugeSVG = ({ score }) => {
  const W = 680,
    H = 350;
  const CX = 340,
    CY = 295;
  const R_OUTER = 175;
  const R_INNER = 145;
  const R_FILLED_OUTER = 173;
  const R_FILLED_INNER = 143;
  const NUM_TICKS = 100;

  const tickAngle = (i) => Math.PI - (i / NUM_TICKS) * Math.PI;
  const pt = (anglRad, r) => ({
    x: CX + r * Math.cos(anglRad),
    y: CY - r * Math.sin(anglRad),
  });

  const tickColor = (pct) => {
    if (pct < 20) return '#e74c3c';
    if (pct < 40) return '#e67e22';
    if (pct < 55) return '#f1c40f';
    if (pct < 75) return '#84bd32';
    return '#27ae60';
  };

  const currentColor = tickColor(score);
  const ticks = [];
  for (let i = 0; i <= NUM_TICKS; i++) {
    const pct = (i / NUM_TICKS) * 100;
    const ang = tickAngle(i);
    const filled = pct <= score;
    const isMajor = i % 10 === 0;

    const rOuter = filled ? R_FILLED_OUTER : R_OUTER;
    const rInner = filled ? R_FILLED_INNER : R_INNER;
    const outerR = isMajor ? rOuter + 6 : rOuter;

    const p1 = pt(ang, rInner);
    const p2 = pt(ang, outerR);

    ticks.push(
      <line
        key={i}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={filled ? tickColor(pct) : '#EAE8E1'}
        strokeWidth={isMajor ? 2.5 : 1.5}
        strokeLinecap="round"
      />,
    );
  }

  const needleAng = tickAngle(score);
  const pointerTip = pt(needleAng, R_INNER - 2);
  const pointerBaseCenter = pt(needleAng, R_INNER - 18);
  const perpAng = needleAng + Math.PI / 2;
  const base1 = {
    x: pointerBaseCenter.x + 8 * Math.cos(perpAng),
    y: pointerBaseCenter.y - 8 * Math.sin(perpAng),
  };
  const base2 = {
    x: pointerBaseCenter.x - 8 * Math.cos(perpAng),
    y: pointerBaseCenter.y + 8 * Math.sin(perpAng),
  };

  const scaleNums = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const tiers = [
    { label: 'Seeker', pct: 0, anchor: 'end', dx: -10, dy: 4 },
    { label: 'Proficient', pct: 26, anchor: 'end', dx: -12, dy: -8 },
    { label: 'Achiever', pct: 50, anchor: 'middle', dx: 0, dy: -14 },
    { label: 'Master', pct: 74, anchor: 'start', dx: 12, dy: -8 },
    { label: 'Champion', pct: 100, anchor: 'start', dx: 10, dy: 4 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={classes.gaugeSvg}>
      <path
        d={`M ${pt(Math.PI, R_INNER - 2).x},${pt(Math.PI, R_INNER - 2).y} A ${R_INNER - 2},${R_INNER - 2} 0 0 1 ${pt(0, R_INNER - 2).x},${pt(0, R_INNER - 2).y}`}
        fill="none"
        stroke="#F7F5F0"
        strokeWidth={R_OUTER - R_INNER + 4}
        strokeLinecap="butt"
      />
      {ticks}
      <polygon
        points={`${pointerTip.x},${pointerTip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
        fill={currentColor}
      />
      {scaleNums.map((val) => {
        const pos = pt(tickAngle(val), R_OUTER + 18);
        return (
          <text
            key={val}
            x={pos.x}
            y={pos.y + 4}
            textAnchor="middle"
            fontSize="14"
            fill="#7A8099"
            fontFamily="DM Sans"
            fontWeight="600"
          >
            {val}
          </text>
        );
      })}
      {tiers.map(({ label, pct, anchor, dx, dy }) => {
        const pos = pt(tickAngle(pct), R_OUTER + 48);
        return (
          <text
            key={label}
            x={pos.x + dx}
            y={pos.y + dy}
            textAnchor={anchor}
            fontSize="20"
            fill="#1A1C23"
            fontFamily="DM Sans"
            fontWeight="600"
          >
            {label}
          </text>
        );
      })}
      <text
        x={CX}
        y={CY - 40}
        textAnchor="middle"
        fontSize="44"
        fontWeight="700"
        fill="#1A1C23"
        fontFamily="DM Sans"
      >
        {score}%
      </text>
      <text
        x={CX}
        y={CY - 16}
        textAnchor="middle"
        fontSize="14"
        fontWeight="500"
        fill="#7A8099"
        fontFamily="DM Sans"
      >
        Score
      </text>
    </svg>
  );
};

const formatRadarLabel = (label) => {
  const words = label.split(' ');
  if (words.length <= 2) return words;

  const lines = [];
  for (let i = 0; i < words.length; i += 2) {
    lines.push(words.slice(i, i + 2).join(' '));
  }
  return lines;
};

// --- SubCompetency Bar ---
const SubCompetencyBar = ({ label, percentage, color }) => (
  <div className={classes.subCompRow}>
    <span className={classes.subCompLabel}>{label}</span>
    <div className={classes.subCompTrack}>
      <div
        className={classes.subCompFill}
        style={{ width: `${percentage}%`, backgroundColor: color }}
      ></div>
    </div>
    <span className={classes.subCompValue}>{percentage} %</span>
  </div>
);

// --- Helper Functions to Process Backend Data ---
const getCompetencyIcon = (key) => {
  const normalizedKey = key.toLowerCase();
  if (
    normalizedKey.includes('tech') ||
    normalizedKey.includes('data') ||
    normalizedKey.includes('ai')
  )
    return techData;
  if (normalizedKey.includes('product') || normalizedKey.includes('leadership'))
    return productLeadership;
  if (normalizedKey.includes('customer') || normalizedKey.includes('user'))
    return customerExcellence;
  if (normalizedKey.includes('innovation') || normalizedKey.includes('growth'))
    return innovationGrowth;
  if (normalizedKey.includes('strategic') || normalizedKey.includes('business'))
    return strategicBusinessAcumen;

  // Default fallback
  return customerExcellence;
};

const dynamicCategories = (result) => Object.keys(result).map(formatRadarLabel);

// 3. Generate Radar Chart Values Dynamically
const dynamicValues = (result) =>
  Object.values(result).map((val) =>
    Math.round(val['Percentage-Of-Correct-Answer'] || 0),
  );

const getCompetencyDesc = (key) => {
  const mapping = {
    'Tech-Data-AI':
      'Harnessing technology, data, and AI equips product leads to create intelligent, cutting-edge solutions for modern challenges.',
    'Product Leadership':
      'Inspiring teams and owning the product vision enables product leads to steer projects toward impactful outcomes.',
    'Customer Excellence':
      'Building a customer-first approach helps product leads deliver exceptional experiences and foster loyalty.',
    'Innovation & growth':
      'Driving creativity and experimentation empowers product leads to unlock new opportunities and accelerate success.',
    'Strategic & Business Acumen':
      'Aligning product strategies with business goals ensures product leads drive sustainable growth and value.',
    'Problem solving & Decision Making':
      'Tackling challenges with clarity and making impactful decisions ensures the product stays on course.',
  };
  return mapping[key] || `Overview of your performance in ${key}.`;
};

const getSubCompColor = (percentage) => {
  if (percentage > 70) return '#27AE60'; // Strength (Green)
  if (percentage >= 50) return '#2D7BB5'; // Can do better (Blue)
  return '#D94444'; // Blindspot (Red)
};

const formatCapabilitiesData = (data) => {
  return Object.entries(data).map(([key, value]) => {
    const score = Math.round(value['Percentage-Of-Correct-Answer']);

    // Derived status logic matching the old DetailedAssessment
    let statusLabel = 'Blindspot';
    if (score > 70) statusLabel = 'Strength';
    else if (score >= 50) statusLabel = 'Can do better';

    const subs = Object.entries(value['Sub-Competencies']).map(
      ([subKey, subVal]) => {
        const subScore = Math.round(subVal['Percentage-Of-Correct-Answer']);
        return {
          label: subKey,
          val: subScore,
          color: getSubCompColor(subScore),
        };
      },
    );

    return {
      title: key,
      score: score,
      status: statusLabel,
      icon: getCompetencyIcon(key),
      hasBadge: score > 70, // Assign badge if strength
      desc: getCompetencyDesc(key),
      subs: subs,
    };
  });
};

// --- Main Component ---
const ShifuSkillGapAnalysis = ({ allocationId, embedded = false }) => {
  const [result, setResult] = useState({});
  const [improvementRoadmapDetails, setImprovementRoadmapDetils] =
    useState(null);
  const [isApiCallActive, setIsApiCallActive] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  const submission = result?.submission || {};
  const capabilitiesData = submission?.capabilities || {};

  // Transform the JSON data (names are dynamic from the API response)
  const capabilities = formatCapabilitiesData(capabilitiesData);

  const radarKeys = Object.keys(capabilitiesData);

  // Split long competency names across two lines for the radar chart
  const wrapRadarLabel = (name) => {
    if (name.length <= 18) return [name];
    const words = name.split(' ');
    let line1 = '';
    for (const word of words) {
      const next = line1 ? `${line1} ${word}` : word;
      if (next.length > 18) break;
      line1 = next;
    }
    const line2 = name.slice(line1.length).trim();
    return line2 ? [line1, line2] : [name];
  };

  // Radar Chart Configuration (categories derived from the response)
  const radarOptions = {
    chart: { type: 'radar', toolbar: { show: false } },
    fill: { opacity: 0.4, colors: ['#5C85FF'] },
    stroke: { width: 2, colors: ['#5C85FF'] },
    markers: { size: 0 },
    xaxis: {
      categories: dynamicCategories(capabilitiesData),
      labels: {
        style: {
          colors: Array(dynamicCategories(capabilitiesData).length).fill(
            '#7D8292',
          ),
          fontSize: '10px',
          fontFamily: 'DM Sans',
          fontWeight: 500,
        },
      },
    },
    yaxis: { show: false, min: 0, max: 100, tickAmount: 4 },
    grid: { borderColor: '#EAE8E1', strokeDashArray: 4 },
    plotOptions: {
      radar: {
        polygons: { strokeColors: 'var(--ink-light)', connectorColors: 'var(--ink-light)' },
      },
    },
  };

  const radarSeries = [
    { name: 'Proficiency', data: dynamicValues(capabilitiesData) },
  ];

  console.log('options: ', radarOptions);
  console.log('series: ', radarSeries);

  const radarValues = radarKeys.map((key) =>
    Math.round(capabilitiesData[key]['Percentage-Of-Correct-Answer'] || 0),
  );

  const overallScore = Math.round(submission.correct_percentage || 0);
  const totalQuestions = submission.total_questions || 0;
  const totalCorrect = submission.total_correct || 0;

  const performanceData = [
    {
      label: 'Correct',
      pct: submission.correct_percentage || 0,
      color: '#27AE60',
    },
    {
      label: 'Partially Correct',
      pct: submission.partial_correct_percentage || 0,
      color: '#F2994A',
    },
    {
      label: 'Incorrect',
      pct: submission.incorrect_percentage || 0,
      color: '#D94444',
    },
    {
      label: 'Skipped',
      pct: submission.skipped_percentage || 0,
      color: '#A3A6B4',
    },
  ];

  async function generateImprovementRoadmap() {
    setIsApiCallActive(true);
    try {
      const data = await generateImprovementRoadmapApi(allocationId, result.project_id);
      setImprovementRoadmapDetils(data);
      const threadId = data?.t_id;
      if (threadId && !embedded) {
        router.push(`/project/${result.project_id}/shifu/${threadId}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsApiCallActive(false);
    }
  }

  function handleGotoImprovementRoadmap() {
    if (improvementRoadmapDetails?.t_id && !embedded) {
      console.log('Going exising improvement roadmap. . . ');
      router.push(`/project/${result.project_id}/shifu/${improvementRoadmapDetails.t_id}?openArtifact=true`);
    }
  }

  useEffect(() => {
    if (!allocationId) return;
    const getResult = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const responseData = await getExamResult(allocationId);
        setResult(responseData);
      } catch (error) {
        console.error('SkillGapAnalysis: failed to load result', error);
        setLoadError('Could not load assessment results. The result may not be available yet.');
        // Do NOT redirect — just show error inline
      } finally {
        setIsLoading(false);
      }
    };
    getResult();
  }, [allocationId]);



  useEffect(() => {
    const getImprovementRoadmapDetails = async () => {
      setIsApiCallActive(true);
      try {
        const data = await getImprovementRoadmapInfo(allocationId);
        setImprovementRoadmapDetils(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsApiCallActive(false);
      }
    };

    if (result?.assessment_type === 'skill_gap_assessment') {
      getImprovementRoadmapDetails();
    }
  }, [allocationId, result]);

  // Loading and error states
  if (isLoading) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <p style={{ color: '#7A8099', fontFamily: 'DM Sans', fontSize: '15px' }}>Loading assessment results...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE8E1' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C23', marginBottom: '8px' }}>No Skill Gap Results Yet</h3>
        <p style={{ color: '#7A8099', fontSize: '14px', maxWidth: '500px', margin: '0 auto' }}>{loadError}</p>
      </div>
    );
  }

  return (
    <>
      {!embedded && <Header assessmentDetails={result} />}
      <div className={classes.tabContent}>
      <div className={classes.kycSection}>
        <div className={classes.kycCenter}>
          <h2 className={classes.kycTitle}>Your KYC Scoreboard</h2>
          <p className={classes.kycSubtitle}>KYC = know your competency</p>
        </div>
      </div>
        {/* Top Row / Gauge & Stats Layout */}
        {result?.assessment_type === 'skill_gap_assessment' ? (
          <>
            {/* Top Row: Gauge on left & Stats on right */}
            <div className={classes.topRow}>
              <div className={classes.gaugeContainer}>
                <GaugeSVG score={overallScore} />
              </div>

              <div className={classes.statsGrid}>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    You tackled {totalQuestions} questions within
                  </p>
                  <div className={classes.statValueBox}>
                    <StopwatchIcon />{' '}
                    <span>
                      {submission?.total_time_taken
                        ? submission?.total_time_taken
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    Total number of correct answers
                  </p>
                  <div className={classes.statValueBox}>
                    <TargetIcon />{' '}
                    <span>
                      {totalCorrect} / {totalQuestions || '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>You solved one question every</p>
                  <div className={classes.statValueBox}>
                    <FastIcon />{' '}
                    <span>
                      {submission?.average_time_taken
                        ? submission?.average_time_taken
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    Your best streak of correct answers
                  </p>
                  <div className={classes.statValueBox}>
                    <StreakIcon /> <span>{submission.best_streak ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row: Performance & Skills */}
            <div className={classes.middleRow}>
              <div className={classes.card}>
                <h3 className={classes.cardTitleGold}>Your performance</h3>
                <p className={classes.cardDesc}>
                  In this test, some of your answers are correct, some are
                  incorrect, and some are partially correct.
                </p>

                <h4 className={classes.totalQs}>
                  Total {totalQuestions} questions
                </h4>

                <div className={classes.perfBars}>
                  {performanceData.map((item) => (
                    <div key={item.label} className={classes.perfRow}>
                      <div className={classes.perfTrack}>
                        <div
                          className={classes.perfFill}
                          style={{
                            width: `${item.pct}%`,
                            backgroundColor: item.color,
                          }}
                        ></div>
                      </div>
                      <span>{item.pct.toFixed(2)} %</span>
                    </div>
                  ))}
                </div>

                <div className={classes.perfLegend}>
                  {performanceData.map((item) => (
                    <span key={item.label}>
                      {item.label}{' '}
                      <div
                        className={classes.legendBox}
                        style={{ background: item.color }}
                      ></div>
                    </span>
                  ))}
                </div>
              </div>

              <div className={classes.card}>
                <h3 className={classes.cardTitleGold}>Your Skills</h3>
                <p className={classes.cardDesc}>
                  This chart outlines your proficiency in each of the key skills
                  assessed in this test.
                </p>
                <div className={classes.radarWrapper}>
                  <ReactApexChart
                    options={radarOptions}
                    series={radarSeries}
                    type="radar"
                    height={270}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Crack It / Smash It: Centered Gauge */}
            <div className={classes.centerGaugeRow}>
              <div className={classes.gaugeContainerCentered}>
                <GaugeSVG score={overallScore} />
              </div>
            </div>

            {/* Middle Row: Performance on left, 4 Stat Cards on right */}
            <div className={classes.middleRow}>
              <div className={classes.card}>
                <h3 className={classes.cardTitleGold}>Your performance</h3>
                <p className={classes.cardDesc}>
                  In this test, some of your answers are correct, some are
                  incorrect, and some are partially correct.
                </p>

                <h4 className={classes.totalQs}>
                  Total {totalQuestions} questions
                </h4>

                <div className={classes.perfBars}>
                  {performanceData.map((item) => (
                    <div key={item.label} className={classes.perfRow}>
                      <div className={classes.perfTrack}>
                        <div
                          className={classes.perfFill}
                          style={{
                            width: `${item.pct}%`,
                            backgroundColor: item.color,
                          }}
                        ></div>
                      </div>
                      <span>{item.pct.toFixed(2)} %</span>
                    </div>
                  ))}
                </div>

                <div className={classes.perfLegend}>
                  {performanceData.map((item) => (
                    <span key={item.label}>
                      {item.label}{' '}
                      <div
                        className={classes.legendBox}
                        style={{ background: item.color }}
                      ></div>
                    </span>
                  ))}
                </div>
              </div>

              {/* 4 Stats Cards placed beside Your Performance */}
              <div className={classes.statsGrid}>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    You tackled {totalQuestions} questions within
                  </p>
                  <div className={classes.statValueBox}>
                    <StopwatchIcon />{' '}
                    <span>
                      {submission?.total_time_taken
                        ? submission?.total_time_taken
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    Total number of correct answers
                  </p>
                  <div className={classes.statValueBox}>
                    <TargetIcon />{' '}
                    <span>
                      {totalCorrect} / {totalQuestions || '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>You solved one question every</p>
                  <div className={classes.statValueBox}>
                    <FastIcon />{' '}
                    <span>
                      {submission?.average_time_taken
                        ? submission?.average_time_taken
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className={classes.statCard}>
                  <p className={classes.statLabel}>
                    Your best streak of correct answers
                  </p>
                  <div className={classes.statValueBox}>
                    <StreakIcon /> <span>{submission.best_streak ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {result?.assessment_type === 'skill_gap_assessment' && (
          <>
            {/* Bottom Section: Capabilities */}
            <h3 className={classes.sectionTitleGold}>Your Capabilities</h3>
            <div className={classes.capGrid}>
              {capabilities.map((cap, idx) => (
                <div key={idx} className={classes.capCard}>
                  {cap.hasBadge && (
                    <div className={classes.capBadge}>
                      <Image src={badgeIcon} alt="" />
                    </div>
                  )}

                  <div className={classes.capHeader}>
                    <div className={classes.capIcon}>
                      <Image src={cap.icon} alt="" />
                    </div>
                    <h4 className={classes.capTitle}>{cap.title}</h4>
                  </div>

                  <div className={classes.capScoreRow}>
                    <span className={classes.capScoreTxt}>{cap.score} %</span>
                    <div className={classes.capScoreTrack}>
                      <div
                        className={classes.capScoreFill}
                        style={{
                          width: `${cap.score}%`,
                          backgroundColor: '#C9A84C',
                        }}
                      ></div>
                    </div>
                  </div>

                  <p
                    className={classes.capStatus}
                    style={{
                      color:
                        cap.status === 'Strength'
                          ? '#E67E22'
                          : cap.status === 'Blindspot'
                            ? '#D94444'
                            : '#27AE60',
                    }}
                  >
                    This is your {cap.status}
                  </p>

                  <p className={classes.capDesc}>{cap.desc}</p>

                  <h5 className={classes.subCompTitle}>
                    Sub-competency Analysis
                  </h5>
                  <div className={classes.subCompList}>
                    {cap.subs.map((sub, i) => (
                      <SubCompetencyBar
                        key={i}
                        label={sub.label}
                        percentage={sub.val}
                        color={sub.color}
                      />
                    ))}
                  </div>

                  <div className={classes.capLegend}>
                    <span>
                      Strength{' '}
                      <div
                        className={classes.legendBox}
                        style={{ background: '#27AE60' }}
                      ></div>
                    </span>
                    <span>
                      Can do better{' '}
                      <div
                        className={classes.legendBox}
                        style={{ background: '#2D7BB5' }}
                      ></div>
                    </span>
                    <span>
                      Blindspot{' '}
                      <div
                        className={classes.legendBox}
                        style={{ background: '#D94444' }}
                      ></div>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {result?.assessment_type === 'skill_gap_assessment' && result.project_type === PROJECT_TYPES.both && (
          <div className={classes.btnSection}>
            <Button
              className={classes.generateLearningRoadmapBtn}
              disabled={isApiCallActive}
              onClick={
                improvementRoadmapDetails?.t_id
                  ? handleGotoImprovementRoadmap
                  : generateImprovementRoadmap
              }
            >
              {improvementRoadmapDetails?.t_id
                ? 'Go to your skill gap roadmap'
                : 'Generate Your Learning Roadmap'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default ShifuSkillGapAnalysis;
