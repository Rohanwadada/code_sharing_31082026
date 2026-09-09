'use client';

import React, { useState, useEffect, useRef } from 'react';
import classes from './CreateProject_v2.module.css';
import { useRouter } from 'next/navigation';
import {
  getFunctions,
  getDesignationsByFunction,
  createProject,
} from '@/service/project.service';
import { useOrganizationStore } from '@/store/organizationStore';
import { useProjectStore } from '@/store/projectStore';
import { useNotification } from '@/hooks/useNotification';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_ROLE } from '@/utils/constants';

export const PROJECT_TYPES = {
  assessment: 'skill_gap_assessment',
  roadmap: 'roadmap',
  both: 'skill_gap_assessment_and_roadmap',
};

// SVG Icons
const UploadIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#9A9EA8"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const SortIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M3.66538 2.90972C3.796 2.99878 3.88784 3.09663 3.93882 3.24957C3.94177 3.29515 3.943 3.34085 3.94315 3.38653C3.94332 3.41469 3.9435 3.44285 3.94367 3.47187C3.9437 3.50285 3.94373 3.53382 3.94376 3.56574C3.944 3.61505 3.944 3.61505 3.94423 3.66536C3.94471 3.77606 3.94497 3.88675 3.94524 3.99745C3.94554 4.07659 3.94585 4.15573 3.94617 4.23487C3.94685 4.40552 3.94742 4.57618 3.94791 4.74683C3.94862 4.99357 3.9495 5.24031 3.95042 5.48705C3.95191 5.88735 3.95326 6.28766 3.95453 6.68796C3.95576 7.07685 3.95705 7.46575 3.95844 7.85465C3.95852 7.87861 3.95861 7.90257 3.95869 7.92727C3.95912 8.04749 3.95955 8.16771 3.95998 8.28793C3.96354 9.28556 3.96688 10.2832 3.97007 11.2808C4.06981 11.182 4.16937 11.083 4.2689 10.9839C4.29688 10.9562 4.32485 10.9285 4.35368 10.9C4.49778 10.7564 4.63789 10.6116 4.76966 10.4566C4.82931 10.388 4.89411 10.3272 4.96226 10.2671C4.9853 10.2466 5.00834 10.226 5.03208 10.2048C5.17666 10.0924 5.35807 10.1068 5.53257 10.1246C5.68518 10.1967 5.76756 10.2878 5.84507 10.4371C5.89078 10.626 5.88439 10.7683 5.78257 10.9371C5.72669 11.0014 5.66829 11.0594 5.60532 11.1168C5.54586 11.1742 5.4937 11.2317 5.44029 11.2945C5.25661 11.5068 5.05247 11.7001 4.85294 11.8973C4.58613 12.1612 4.58613 12.1612 4.33485 12.4398C4.22765 12.5624 4.11214 12.677 3.99741 12.7925C3.97288 12.8177 3.94835 12.8429 3.92307 12.8688C3.89919 12.8929 3.8753 12.9169 3.85069 12.9417C3.82933 12.9634 3.80798 12.985 3.78597 13.0073C3.6761 13.0986 3.56676 13.1336 3.42515 13.1343C3.40263 13.1349 3.38011 13.1354 3.35691 13.1359C3.1823 13.1093 3.06176 13.0092 2.9409 12.8869C2.91288 12.8587 2.88486 12.8305 2.856 12.8015C2.81288 12.7574 2.81288 12.7574 2.7689 12.7125C2.72597 12.6693 2.72597 12.6693 2.68217 12.6252C2.56229 12.504 2.44391 12.3826 2.33323 12.2529C2.17601 12.0699 2.00095 11.9033 1.82945 11.7339C1.61922 11.5263 1.41052 11.3196 1.22007 11.0933C1.18497 11.0529 1.14982 11.0125 1.1146 10.9722C0.989748 10.8287 0.990623 10.7189 0.992653 10.5303C1.0082 10.363 1.08729 10.2866 1.20445 10.1753C1.3625 10.102 1.51747 10.0942 1.68882 10.1246C1.84755 10.2114 1.96772 10.3324 2.09312 10.4605C2.1222 10.4899 2.1222 10.4899 2.15187 10.5199C2.26323 10.6331 2.37057 10.7484 2.47281 10.87C2.54892 10.9554 2.62969 11.0358 2.71091 11.1164C2.72684 11.1322 2.74277 11.1481 2.75918 11.1644C2.79819 11.2033 2.83725 11.242 2.87632 11.2808C2.87639 11.2396 2.87647 11.1984 2.87655 11.1559C2.87834 10.1776 2.88061 9.1993 2.88348 8.22099C2.88383 8.10059 2.88418 7.98019 2.88452 7.8598C2.88459 7.83583 2.88466 7.81186 2.88473 7.78716C2.88584 7.39899 2.88661 7.01083 2.88727 6.62266C2.88795 6.2244 2.88898 5.82614 2.89034 5.42788C2.89117 5.18211 2.89172 4.93634 2.89192 4.69056C2.89211 4.50214 2.89278 4.31373 2.89364 4.12531C2.89392 4.04799 2.89403 3.97066 2.89398 3.89334C2.89393 3.78789 2.89445 3.68246 2.89511 3.57701C2.89496 3.54631 2.89481 3.5156 2.89465 3.48397C2.8966 3.29693 2.91673 3.1548 3.0482 3.01067C3.24229 2.85954 3.43203 2.82895 3.66538 2.90972Z"
      fill="black"
    />
    <path
      d="M7.66003 2.87024C7.68967 2.8701 7.71931 2.86997 7.74984 2.86983C7.84959 2.86941 7.94934 2.86922 8.04909 2.86902C8.12043 2.86878 8.19177 2.86852 8.26312 2.86825C8.4978 2.86743 8.73248 2.86695 8.96716 2.86651C9.0479 2.86634 9.12864 2.86617 9.20938 2.866C9.5452 2.86533 9.88101 2.86474 10.2168 2.86439C10.304 2.8643 10.3911 2.8642 10.4782 2.86411C10.4999 2.86409 10.5216 2.86406 10.5439 2.86404C10.8946 2.86364 11.2453 2.86261 11.5961 2.8613C11.9563 2.85998 12.3165 2.85925 12.6767 2.85908C12.8789 2.85896 13.081 2.85859 13.2832 2.85758C13.4735 2.85664 13.6637 2.85644 13.854 2.85681C13.9238 2.85681 13.9935 2.85655 14.0633 2.856C14.1587 2.8553 14.254 2.85555 14.3494 2.85605C14.3769 2.85562 14.4045 2.85518 14.4329 2.85474C14.6262 2.85721 14.7553 2.90838 14.9053 3.0313C14.997 3.14446 15.0118 3.23094 15.0107 3.37505C15.011 3.40663 15.0112 3.43822 15.0115 3.47075C14.9918 3.61583 14.9245 3.7141 14.8115 3.80474C14.6582 3.9197 14.5246 3.91094 14.3404 3.9109C14.2963 3.91107 14.2963 3.91107 14.2513 3.91125C14.1525 3.91159 14.0536 3.91171 13.9547 3.91183C13.884 3.91203 13.8132 3.91224 13.7425 3.91245C13.55 3.913 13.3575 3.91333 13.1651 3.91359C13.0448 3.91375 12.9246 3.91394 12.8044 3.91413C12.4715 3.91466 12.1386 3.91512 11.8056 3.91534C11.7193 3.9154 11.6329 3.91546 11.5465 3.91552C11.5143 3.91555 11.5143 3.91555 11.4814 3.91557C11.1337 3.91583 10.786 3.91662 10.4383 3.91764C10.0812 3.91867 9.72415 3.91922 9.36706 3.91933C9.16661 3.91941 8.96616 3.91969 8.76572 3.92047C8.57711 3.9212 8.38852 3.92133 8.19991 3.92101C8.13073 3.921 8.06154 3.92119 7.99236 3.92162C7.89781 3.92218 7.8033 3.92195 7.70875 3.92154C7.66781 3.92206 7.66781 3.92206 7.62604 3.92258C7.44457 3.92068 7.30695 3.88338 7.15527 3.7813C7.01654 3.63546 6.98926 3.51638 6.99242 3.32122C7.00653 3.16894 7.07461 3.07237 7.18652 2.97466C7.34096 2.86205 7.47594 2.87034 7.66003 2.87024Z"
      fill="black"
    />
    <path
      d="M7.66266 5.93321C7.68545 5.93312 7.70825 5.93303 7.73173 5.93293C7.80814 5.93266 7.88454 5.93261 7.96095 5.93257C8.01572 5.93242 8.07049 5.93227 8.12527 5.9321C8.27409 5.93169 8.42292 5.93149 8.57175 5.93135C8.66474 5.93126 8.75773 5.93113 8.85072 5.93099C9.1417 5.93056 9.43268 5.93026 9.72366 5.93014C10.0595 5.93 10.3953 5.92945 10.7312 5.92854C10.9908 5.92787 11.2504 5.92755 11.5101 5.92751C11.6651 5.92748 11.8202 5.92729 11.9752 5.92674C12.1211 5.92622 12.267 5.92615 12.4128 5.92643C12.4663 5.92645 12.5198 5.92632 12.5733 5.92601C12.6464 5.92561 12.7195 5.92579 12.7927 5.92612C12.8335 5.92607 12.8744 5.92603 12.9166 5.92598C13.0894 5.94362 13.208 5.99288 13.3371 6.11338C13.4398 6.25157 13.4817 6.40432 13.4572 6.57518C13.4083 6.75025 13.337 6.83743 13.1867 6.9376C13.0772 6.97412 12.9787 6.97348 12.8647 6.97345C12.8295 6.97363 12.8295 6.97363 12.7937 6.9738C12.715 6.97415 12.6362 6.97427 12.5575 6.97438C12.5011 6.97458 12.4448 6.97479 12.3884 6.97501C12.2351 6.97555 12.0818 6.97588 11.9286 6.97614C11.8328 6.9763 11.7371 6.97649 11.6413 6.97669C11.3419 6.97728 11.0424 6.97773 10.7429 6.97799C10.3971 6.97829 10.0513 6.97911 9.70544 6.98038C9.43821 6.98132 9.17098 6.98178 8.90376 6.98189C8.74411 6.98196 8.58447 6.98224 8.42482 6.98302C8.27464 6.98375 8.12447 6.98389 7.97429 6.98356C7.91919 6.98355 7.86409 6.98375 7.80899 6.98417C7.73371 6.98473 7.65847 6.98451 7.5832 6.9841C7.55055 6.98461 7.55055 6.98461 7.51725 6.98513C7.36215 6.98309 7.27551 6.9398 7.15549 6.84385C7.0233 6.69738 6.98616 6.5818 6.98837 6.38817C7.01213 6.2229 7.10486 6.10088 7.23557 6.00206C7.38053 5.93887 7.50422 5.93358 7.66266 5.93321Z"
      fill="black"
    />
    <path
      d="M7.51062 9.02693C7.54593 9.0267 7.58124 9.02648 7.61763 9.02625C7.65656 9.02616 7.69549 9.02608 7.73559 9.02599C7.77645 9.02579 7.81731 9.02558 7.8594 9.02537C7.97169 9.02483 8.08397 9.0245 8.19626 9.02424C8.26641 9.02408 8.33657 9.02389 8.40673 9.02369C8.62624 9.0231 8.84576 9.02265 9.06527 9.02239C9.31864 9.02209 9.572 9.02126 9.82537 9.02C10.0212 9.01906 10.217 9.0186 10.4129 9.01849C10.5298 9.01842 10.6468 9.01814 10.7637 9.01735C10.8943 9.01649 11.0248 9.01662 11.1554 9.01684C11.1941 9.01644 11.2327 9.01604 11.2726 9.01562C11.472 9.01684 11.6006 9.01894 11.7505 9.15652C11.8751 9.30133 11.9143 9.43735 11.9067 9.62527C11.8561 9.81194 11.7548 9.92863 11.5942 10.0315C11.4958 10.0627 11.4055 10.0668 11.3026 10.0672C11.2688 10.0673 11.2351 10.0675 11.2003 10.0677C11.1634 10.0677 11.1265 10.0678 11.0884 10.0678C11.0494 10.068 11.0105 10.0681 10.9703 10.0683C10.8634 10.0687 10.7566 10.0689 10.6497 10.069C10.5829 10.0691 10.5161 10.0693 10.4493 10.0694C10.24 10.0698 10.0308 10.0701 9.8216 10.0702C9.58038 10.0704 9.33917 10.0709 9.09796 10.0718C8.9113 10.0725 8.72465 10.0728 8.53799 10.0729C8.42661 10.0729 8.31522 10.0731 8.20384 10.0736C8.07951 10.0743 7.95519 10.0741 7.83086 10.0739C7.79415 10.0742 7.75744 10.0745 7.71961 10.0748C7.47912 10.0736 7.31822 10.0548 7.13132 9.89285C7.0134 9.75473 6.98779 9.65531 6.99277 9.47659C7.00952 9.32396 7.07657 9.2284 7.18991 9.13113C7.31109 9.04089 7.36205 9.02757 7.51062 9.02693Z"
      fill="black"
    />
    <path
      d="M7.64559 12.0885C7.66989 12.0883 7.69419 12.0881 7.71923 12.0879C7.79969 12.0873 7.88016 12.0869 7.96063 12.0866C8.00192 12.0864 8.00192 12.0864 8.04405 12.0862C8.18982 12.0855 8.33559 12.0851 8.48136 12.0848C8.63159 12.0845 8.7818 12.0834 8.93202 12.0821C9.04781 12.0813 9.1636 12.0811 9.2794 12.0809C9.33475 12.0808 9.39011 12.0804 9.44546 12.0799C9.52316 12.0791 9.60084 12.0791 9.67855 12.0793C9.70117 12.0789 9.72379 12.0785 9.7471 12.0781C9.9161 12.0798 10.0463 12.126 10.1878 12.219C10.3064 12.3467 10.3384 12.4701 10.3492 12.6399C10.338 12.812 10.2615 12.9287 10.139 13.0452C10.0026 13.1326 9.87993 13.1301 9.72329 13.1303C9.69827 13.1305 9.67326 13.1306 9.64749 13.1308C9.5647 13.1312 9.4819 13.1314 9.3991 13.1316C9.34154 13.1318 9.28397 13.132 9.2264 13.1322C9.10563 13.1325 8.98487 13.1327 8.86411 13.1328C8.70953 13.133 8.55497 13.1337 8.40039 13.1346C8.28144 13.1352 8.16249 13.1353 8.04354 13.1354C7.98656 13.1355 7.92959 13.1357 7.87261 13.1361C7.7928 13.1367 7.71301 13.1366 7.6332 13.1364C7.59805 13.1368 7.59805 13.1368 7.56219 13.1373C7.39255 13.1359 7.26325 13.1003 7.13641 12.9846C7.00422 12.8149 6.97542 12.6797 7.0003 12.469C7.05704 12.3027 7.16087 12.2093 7.3128 12.1253C7.42532 12.0878 7.52843 12.0889 7.64559 12.0885Z"
      fill="black"
    />
  </svg>
);

const FilterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M8 2C9.83667 2 11.6367 2.15467 13.3887 2.452C13.744 2.512 14 2.82267 14 3.18267V3.87867C14 4.07565 13.9612 4.27071 13.8858 4.4527C13.8104 4.63469 13.7 4.80005 13.5607 4.93934L9.93933 8.56067C9.80005 8.69996 9.68956 8.86532 9.61418 9.04731C9.5388 9.2293 9.5 9.42435 9.5 9.62134V11.5727C9.50005 11.8513 9.42249 12.1245 9.27601 12.3615C9.12952 12.5985 8.91991 12.7901 8.67067 12.9147L6.5 14V9.62134C6.5 9.42435 6.4612 9.2293 6.38582 9.04731C6.31044 8.86532 6.19995 8.69996 6.06067 8.56067L2.43933 4.93934C2.30005 4.80005 2.18956 4.63469 2.11418 4.4527C2.0388 4.27071 2 4.07565 2 3.87867V3.18267C2 2.82267 2.256 2.512 2.61133 2.452C4.39171 2.15057 6.19428 1.99937 8 2Z"
      stroke="black"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronIcon = ({ up }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: up ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease',
    }}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// Dummy Data for Question Banks
const qBanksList = [
  {
    id: 1,
    title: 'Tax Senior Analyst - Core Concepts',
    tag: 'Tax',
    questions: 48,
    updated: '01 Aug',
  },
  {
    id: 2,
    title: 'Direct Tax Advisory Fundamentals',
    tag: 'Tax',
    questions: 38,
    updated: '10 Aug',
  },
  {
    id: 3,
    title: 'Statutory Audit — Risk & Controls',
    tag: 'Assurance',
    questions: 45,
    updated: '15 Aug',
  },
  {
    id: 4,
    title: 'Assurance Quality Review Basics',
    tag: 'Assurance',
    questions: 30,
    updated: '20 Aug',
  },
];

const CreateProject = () => {
  const router = useRouter();

  const userDetails = useAuthStore((s) => s.userDetails);

  const organizationId = useOrganizationStore((s) => s.organizationId);
  const organizationName = useOrganizationStore((s) => s.organizationName);
  const projectStore = useProjectStore();
  const setProjectData = useProjectStore((s) => s.setProjectData);
  const resetProjectStore = useProjectStore((s) => s.resetProjectStore);

  const isAdmin = userDetails?.role && userDetails?.role === ADMIN_ROLE;

  const [formData, setFormData] = useState(() => ({
    projectName: projectStore.projectName || '',
    functionSsl: projectStore.functionName || '',
    designationLevel: projectStore.designationName || '',
    roleDescription: projectStore.jtbdDescription || '',
    whoFor: projectStore.whoFor || (isAdmin ? 'Organization' : 'Self'),
    creationType: projectStore.creationType || (isAdmin ? 'assessment' : 'roadmap'),
  }));

  const [functionsList, setFunctionsList] = useState([]);
  const [designationsList, setDesignationsList] = useState([]);
  const [jdFile, setJdFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [customFunctionName, setCustomFunctionName] = useState('');
  const [customDesignationName, setCustomDesignationName] = useState('');

  // Re-hydrate formData if store hydrates asynchronously from sessionStorage
  useEffect(() => {
    if (projectStore.projectName || projectStore.functionName || projectStore.jtbdDescription) {
      setFormData((prev) => ({
        ...prev,
        projectName: projectStore.projectName || prev.projectName,
        functionSsl: projectStore.functionName || prev.functionSsl,
        designationLevel: projectStore.designationName || prev.designationLevel,
        roleDescription: projectStore.jtbdDescription || prev.roleDescription,
        whoFor: projectStore.whoFor || prev.whoFor,
        creationType: projectStore.creationType || prev.creationType,
      }));
    }
  }, [
    projectStore.projectName,
    projectStore.functionName,
    projectStore.designationName,
    projectStore.jtbdDescription,
    projectStore.whoFor,
    projectStore.creationType,
  ]);

  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        const funcs = await getFunctions();
        setFunctionsList(funcs);
        const activeFunc = projectStore.functionName || formData.functionSsl;
        if (activeFunc && activeFunc !== 'others') {
          const desigs = await getDesignationsByFunction(activeFunc);
          setDesignationsList(desigs);
        }
      } catch (error) {
        console.error('Failed to fetch functions:', error);
      }
    };
    fetchFunctions();
  }, [projectStore.functionName]);

  const [selectedBanks, setSelectedBanks] = useState([]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { showNotification } = useNotification();

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      setProjectData({
        projectName: updated.projectName,
        functionName: updated.functionSsl,
        designationName: updated.designationLevel,
        jtbdDescription: updated.roleDescription,
        whoFor: updated.whoFor,
        creationType: updated.creationType,
      });
      return updated;
    });
  };

  const toggleBankSelection = (id) => {
    setSelectedBanks((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id],
    );
  };

  const handleFunctionChange = async (e) => {
    const fId = e.target.value;
    handleInputChange('functionSsl', fId);
    handleInputChange('designationLevel', '');
    setDesignationsList([]);
    if (!fId) return;
    if (fId === 'others') {
      handleInputChange('designationLevel', 'others');
      return;
    }
    try {
      const desigs = await getDesignationsByFunction(fId);
      setDesignationsList(desigs);
    } catch (error) {
      console.error('Failed to fetch designations:', error);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'pdf' && ext !== 'docx') {
      alert('Only PDF or DOCX files are allowed.');
      return;
    }
    setJdFile(file);
    setProjectData({
      uploadedFileDetails: {
        name: file.name,
        size: file.size,
      },
    });
    handleInputChange('roleDescription', '');
  };

  const handleFileChange = (e) => {
    handleFileSelect(e.target.files[0]);
    e.target.value = null;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    //changes start
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
    //  handleFileSelect(e.dataTransfer.files[0]);
  };

  const removeJdFile = () => setJdFile(null);

  const handleSaveProject = async () => {
    if (isAdmin && !formData.projectName || !formData.creationType || isSubmitting) return;
    if (isAdmin && !formData.roleDescription.trim() && !jdFile) return;

    const projectData = {
      project_name: formData.projectName,
      organization_name: organizationName,
      function_name:
        formData.functionSsl === 'others'
          ? customFunctionName.trim() || null
          : functionsList.find((fn) => fn.id === formData.functionSsl)?.name ||
          null,
      designation_name:
        formData.designationLevel === 'others'
          ? customDesignationName.trim() || null
          : designationsList.find(
            (desig) => desig.id === formData.designationLevel,
          )?.name || null,
      project_type: PROJECT_TYPES[formData.creationType],
      project_mandate: formData.whoFor.toLowerCase(),
      jd_data: formData.roleDescription.trim() || null,
      created_by: organizationId || null,
      project_status: { status: 'active' },
    };

    setIsSubmitting(true);
    try {
      const response = await createProject(projectData, jdFile);
      setProjectData({
        currentProjectId: response.project_id,
        currentProjectName: formData.projectName,
      });
      if (
        formData.creationType === 'assessment' ||
        formData.creationType === 'both'
      ) {
        router.push(
          `/project/${response.project_id}/assessment/assessment-types`,
        );
      } else if (formData.creationType === 'roadmap') {
        router.push(`/project/${response.project_id}/new-roadmap`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      // alert('Failed to create project. Please try again.');
      showNotification(
        'error',
        error?.response?.data?.message || 'Something went wrong',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const showQuestionBankSection = false;
  // formData.creationType === 'assessment' || formData.creationType === 'both';

  const whoForList = isAdmin ? ['Self', 'Team', 'Organization'] : ['Self'];

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.mainCard}>
        {/* Header section */}
        <div className={classes.header}>
          <h1 className={classes.pageTitle}>Create a New Project</h1>
          <p className={classes.pageSubtitle}>
            Set up a hiring project. You can attach a JD now or later.
          </p>
        </div>

        {/* Form Fields */}
        <div className={classes.formSection}>
          <div className={classes.formGroup}>
            <label className={classes.label}>PROJECT NAME</label>
            <input
              type="text"
              className={classes.input}
              placeholder="e.g. Tax Senior Analyst — Q3 Hiring"
              value={formData.projectName}
              onChange={(e) => handleInputChange('projectName', e.target.value)}
            />
          </div>

          {isAdmin && (
            <div className={classes.row}>
              <div className={classes.formGroup}>
                <label className={classes.label}>FUNCTION / SSL</label>
                <div className={classes.selectWrapper}>
                  <select
                    className={classes.select}
                    value={formData.functionSsl}
                    onChange={handleFunctionChange}
                  >
                    <option value="" disabled>
                      Select Function / SSL
                    </option>
                    {functionsList.map((fn) => (
                      <option key={fn.id} value={fn.id}>
                        {fn.name}
                      </option>
                    ))}
                    <option value="others">Others</option>
                  </select>
                </div>
                {formData.functionSsl === 'others' && (
                  <input
                    type="text"
                    className={classes.input}
                    placeholder="Enter new function / SSL name"
                    value={customFunctionName}
                    onChange={(e) => setCustomFunctionName(e.target.value)}
                  />
                )}
              </div>

              <div className={classes.formGroup}>
                <label className={classes.label}>DESIGNATION LEVEL</label>
                <div className={classes.selectWrapper}>
                  <select
                    className={classes.select}
                    value={formData.designationLevel}
                    onChange={(e) =>
                      handleInputChange('designationLevel', e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select Level
                    </option>
                    {designationsList.map((desig) => (
                      <option key={desig.id} value={desig.id}>
                        {desig.name}
                      </option>
                    ))}
               i     <option value="others">Others</option>
                  </select>
                </div>
                {formData.designationLevel === 'others' && (
                  <input
                    type="text"
                    className={classes.input}
                    placeholder="Enter new designation level"
                    value={customDesignationName}
                    onChange={(e) => setCustomDesignationName(e.target.value)}
                  />
                )}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className={classes.formGroup}>
              <label className={classes.label}>JTBD / ROLE DESCRIPTION</label>
              <textarea
                className={classes.textarea}
                placeholder="What does success look like for this hire?"
                value={formData.roleDescription}
                onChange={(e) => {
                  handleInputChange('roleDescription', e.target.value);
                  if (jdFile) setJdFile(null);
                }}
              ></textarea>
            </div>
          )}

          {isAdmin && (
            <div className={classes.formGroup}>
              <label className={classes.label}>
                UPLOAD ROLE DESCRIPTION{' '}
                <span className={classes.labelMuted}>(MAX 5MB)</span>
              </label>
              <div
                className={`${classes.uploadBox} ${isDragging ? classes.uploadBoxDrag : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className={classes.uploadIconWrapper}>
                  <UploadIcon />
                </div>
                {jdFile ? (
                  <>
                    <h4 className={classes.uploadTitle}>{jdFile.name}</h4>
                    <p className={classes.uploadFormat}>
                      {(jdFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      className={classes.fileRemove}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeJdFile();
                      }}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <h4 className={classes.uploadTitle}>Upload Here</h4>
                    <p className={classes.uploadFormat}>PDF or DOCX</p>
                    <p className={classes.uploadLink}>
                      Click to browse or drag & drop
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className={classes.hiddenInput}
                onChange={handleFileChange}
              />
            </div>
          )}

          <div className={classes.formGroup}>
            <label className={classes.label}>WHO IS THIS FOR?</label>
            <div className={classes.pillGroup}>
              {whoForList.map((target) => (
                <button
                  key={target}
                  className={`${classes.pillBtn} ${formData.whoFor === target ? classes.pillActive : ''}`}
                  onClick={() => handleInputChange('whoFor', target)}
                >
                  {target}
                </button>
              ))}
            </div>
          </div>

          <div className={classes.formGroup}>
            <label className={classes.label}>WHAT DO YOU WANT TO CREATE?</label>
            <div className={classes.optionsContainer}>
              {isAdmin && (
                <div
                  className={`${classes.optionCard} ${formData.creationType === 'assessment' ? classes.selectedCard : ''}`}
                  onClick={() =>
                    handleInputChange('creationType', 'assessment')
                  }
                >
                  <h3 className={classes.optionTitle}>Skill gap assessment</h3>
                  <p className={classes.optionDesc}>
                    Measure where capability actually sits today against a
                    competency map.
                  </p>
                </div>
              )}

              <div
                className={`${classes.optionCard} ${formData.creationType === 'roadmap' ? classes.selectedCard : ''}`}
                onClick={() => handleInputChange('creationType', 'roadmap')}
              >
                <h3 className={classes.optionTitle}>Roadmap</h3>
                <p className={classes.optionDesc}>
                  Turn a known gap into a sequenced plan people can follow.
                </p>
              </div>

              {isAdmin && (
                <div
                  className={`${classes.optionCard} ${formData.creationType === 'both' ? classes.selectedCard : ''}`}
                  onClick={() => handleInputChange('creationType', 'both')}
                >
                  <h3 className={classes.optionTitle}>
                    Skill-gap Assessment
                    <br />+ Roadmap
                  </h3>
                  <p className={classes.optionDesc}>
                    Assess first, then turn the gap straight into a roadmap.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Conditional Map to Question Bank Section */}
          {showQuestionBankSection && (
            <div className={classes.mapSection}>
              <div className={classes.mapHeaderRow}>
                <label className={classes.label}>MAP TO QUESTION BANK</label>
                <span className={classes.optionalBadge}>Optional</span>
              </div>
              <p className={classes.mapSubtitle}>
                Link one or more question banks so the assessment pulls
                questions straight from your library.
              </p>

              <div className={classes.mapToolbar}>
                <div className={classes.searchWrapper}>
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Search question banks by name or tag..."
                    className={classes.mapSearchInput}
                  />
                </div>
                <div className={classes.toolbarActions}>
                  {/* Sort Dropdown */}
                  <div className={classes.dropdownContainer}>
                    <button
                      className={classes.iconBtn}
                      onClick={() => {
                        setIsSortOpen(!isSortOpen);
                        setIsFilterOpen(false); // Close the other dropdown
                      }}
                    >
                      <SortIcon /> Sort <ChevronIcon up={isSortOpen} />
                    </button>
                    {isSortOpen && (
                      <div className={classes.sortMenu}>
                        <label className={classes.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={classes.customCheckbox}
                          />{' '}
                          Most Recent
                        </label>
                        <label className={classes.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={classes.customCheckbox}
                          />{' '}
                          Name (A-Z)
                        </label>
                        <label className={classes.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={classes.customCheckbox}
                          />{' '}
                          Name (Z-A)
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Filter Dropdown */}
                  <div className={classes.dropdownContainer}>
                    <button
                      className={classes.iconBtn}
                      onClick={() => {
                        setIsFilterOpen(!isFilterOpen);
                        setIsSortOpen(false); // Close the other dropdown
                      }}
                    >
                      <FilterIcon /> Filter <ChevronIcon up={isFilterOpen} />
                    </button>
                    {isFilterOpen && (
                      <div className={classes.filterMenu}>
                        <div
                          className={classes.filterSectionTitle}
                          style={{ marginTop: 0 }}
                        >
                          FUNCTION / SSL
                        </div>
                        <label className={classes.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={classes.customCheckbox}
                          />{' '}
                          L&D
                        </label>
                        <label className={classes.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={classes.customCheckbox}
                          />{' '}
                          Tax
                        </label>
                        <label className={classes.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={classes.customCheckbox}
                          />{' '}
                          Consulting
                        </label>
                        <label className={classes.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={classes.customCheckbox}
                          />{' '}
                          Assurance
                        </label>
                        <button className={classes.showMoreBtn}>
                          Show More
                        </button>

                        <div className={classes.filterSectionTitle}>
                          DESIGNATION LEVEL
                        </div>
                        <label className={classes.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={classes.customCheckbox}
                          />{' '}
                          Analyst
                        </label>

                        <div className={classes.filterActions}>
                          <button className={classes.resetBtn}>Reset</button>
                          <button className={classes.applyBtn}>Apply</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={classes.qBankList}>
                {qBanksList.map((bank) => (
                  <div
                    key={bank.id}
                    className={`${classes.qBankCard} ${selectedBanks.includes(bank.id) ? classes.qBankCardSelected : ''}`}
                    onClick={() => toggleBankSelection(bank.id)}
                  >
                    <h4 className={classes.qBankTitle}>{bank.title}</h4>
                    <div className={classes.qBankMeta}>
                      <span className={classes.qBankTag}>{bank.tag}</span>
                      <span className={classes.metaDot}>•</span>
                      <span>{bank.questions} questions</span>
                      <span className={classes.metaDot}>•</span>
                      <span>Updated {bank.updated}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={classes.selectionFooter}>
                <span className={classes.selectionText}>
                  <strong>{selectedBanks.length}</strong> question banks mapped
                </span>
                <button
                  className={classes.clearBtn}
                  onClick={() => setSelectedBanks([])}
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={classes.actionFooter}>
          <button className={classes.cancelBtn} onClick={() => router.back()}>
            Cancel
          </button>
          <button
            className={classes.saveBtn}
            onClick={handleSaveProject}
            disabled={
              !formData.projectName ||
              !formData.creationType ||
              isSubmitting ||
              (isAdmin && !formData.roleDescription.trim() && !jdFile) ||
              (isAdmin && formData.functionSsl === 'others' &&
                !customFunctionName.trim()) ||
              (isAdmin && formData.designationLevel === 'others' &&
                !customDesignationName.trim())
            }
          >
            Save Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
