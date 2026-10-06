# Roadmap AI Content & Assessment Loader: Architecture & Changes

**Date:** 24 September 2026  
**Status:** Implemented & Verified  
**Scope:** Frontend (`frontend/src/components/roadmap/NodeContentAiLoader.jsx`, `NodeContentAiLoader.module.css`, `NodeContentViewer.jsx`)

---

## 1. Executive Summary & Design Objective

### 1.1 Objective
Transform the loading experience during **AI Chapter Content Generation** and **AI Assessment Generation** from a static generic skeleton into an engaging, minimalist, and branded circular process loader.

### 1.2 Key Design Elements
1. **Original Shifu Bot Icon in Center:**
   - Replaced generic Lucide icons (`Brain`, `FileCheck2`) with the authentic **Shifu Bot Mascot** (`@/assets/bot/thinking.png`).
   - Sits inside a dark slate glassmorphic central badge with a pulsing ambient neon glow.
2. **Numberless Circular Process Gauge:**
   - Smoothly rotating dual-gradient SVG progress arc (`#f59e0b` amber $\rightarrow$ `#06b6d4` cyan $\rightarrow$ `#10b981` emerald).
   - Counter-rotating outer dashed aura ring providing depth and subtle motion.
3. **Phased Status Words & Live Indicator:**
   - Real-time single-line phase progression with a live blinking emerald indicator dot:
     - **For Chapters:** *Analyzing core concepts...* $\rightarrow$ *Structuring study content...* $\rightarrow$ *Synthesizing practical examples...* $\rightarrow$ *Finalizing resources...*
     - **For Assessments:** *Evaluating module chapters...* $\rightarrow$ *Formulating targeted questions...* $\rightarrow$ *Synthesizing rubrics & explanations...* $\rightarrow$ *Finalizing assessment...*
4. **Preserved Skeleton Loader:**
   - The previous `NodeContentViewerSkeletonLoader` is preserved and commented out in `NodeContentViewer.jsx` for easy rollback if needed.

---

## 2. Component Architecture

```
                  ┌──────────────────────────────────────────────────────────┐
                  │ NodeContentViewer.jsx (isContentFetching == true)       │
                  └─────────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                  ┌──────────────────────────────────────────────────────────┐
                  │ NodeContentAiLoader.jsx                                  │
                  ├──────────────────────────────────────────────────────────┤
                  │ 1. Sticky Top Bar with Close (X) Action                  │
                  │                                                          │
                  │ 2. Circular Process Center:                             │
                  │    - Outer Dashed Aura Ring (counter-rotating)          │
                  │    - SVG Progress Arc (Amber -> Cyan -> Emerald)        │
                  │    - Central Glassmorphic Badge                         │
                  │    - Original Shifu Bot Icon (Pulsing Glow)             │
                  │                                                          │
                  │ 3. Minimalist Caption:                                   │
                  │    - Compact Node Title                                  │
                  │    - Live Pulsing Dot + Phased Status Text               │
                  └──────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Code Changes (Previous vs Present Code)

### 3.1 Component: `frontend/src/components/roadmap/NodeContentAiLoader.jsx`

#### A. Shifu Original Icon & Imports

**Previous Code:**
```jsx
'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, FileCheck2, X } from 'lucide-react';
import styles from './NodeContentAiLoader.module.css';
```

**Present Code with `#changes`:**
```jsx
// #changes: Import Image and authentic Shifu Bot icon
import React, { useState, useEffect } from 'react';
import Image from 'next/image'; // #changes
import { Sparkles, X } from 'lucide-react'; // #changes
import shifuIcon from '@/assets/bot/thinking.png'; // #changes: Original Shifu Bot Icon
import styles from './NodeContentAiLoader.module.css';
```

---

#### B. Center Badge Icon Rendering

**Previous Code (Generic Lucide Icons):**
```jsx
{/* Central Thematic Badge Icon (No numbers) */}
<div className={styles.centerBadge}>
  {isAssessment ? (
    <FileCheck2
      size={26}
      className={`${styles.centerIcon} ${styles.centerIconAssessment}`}
    />
  ) : (
    <Brain size={26} className={styles.centerIcon} />
  )}
</div>
```

**Present Code with `#changes` (Enlarged Original Shifu Mascot in Strict Circle):**
```jsx
{/* #changes: Central Thematic Badge - Enlarged Original Shifu Mascot (54px) */}
<div className={styles.centerBadge}>
  <Image
    src={shifuIcon}
    alt="Shifu AI"
    width={54}
    height={54}
    className={styles.shifuLogoImg}
    priority
  />
</div>
```

---

### 3.2 Stylesheet: `frontend/src/components/roadmap/NodeContentAiLoader.module.css`

**Previous Code:**
```css
.centerBadge {
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.15);
  z-index: 2;
}

.centerIcon {
  color: #f59e0b;
  animation: pulseIcon 2s ease-in-out infinite alternate;
}
```

**Present Code with `#changes`:**
```css
/* #changes: Strict circular center badge (76px) with clip-path, golden aura border, and enlarged Shifu mascot (52px) */
.centerBadge {
  position: absolute;
  width: 76px; /* #changes: Enlarged badge diameter */
  height: 76px; /* #changes */
  border-radius: 50% !important; /* #changes: Strict circular shape */
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.22), inset 0 1px 2px rgba(255, 255, 255, 0.2);
  z-index: 2;
  overflow: hidden; /* #changes */
  clip-path: circle(50% at 50% 50%); /* #changes: Eliminates any rectangular corners */
  border: 2px solid rgba(245, 158, 11, 0.25); /* #changes */
}

.shifuLogoImg { /* #changes */
  width: 52px; /* #changes: Bigger Shifu mascot */
  height: 52px; /* #changes */
  border-radius: 50%; /* #changes */
  object-fit: contain;
  display: block;
  animation: pulseShifu 2s ease-in-out infinite alternate;
}

@keyframes pulseShifu { /* #changes */
  0% {
    transform: scale(0.94);
    filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.5));
  }
  100% {
    transform: scale(1.08);
    filter: drop-shadow(0 0 14px rgba(6, 182, 212, 0.9));
  }
}
```

---

### 3.3 Parent Integration: `frontend/src/components/roadmap/NodeContentViewer.jsx`

**Previous Code:**
```jsx
{isContentFetching ? (
  <NodeContentViewerSkeletonLoader />
) : (
  // ...
)}
```

**Present Code with `#changes`:**
```jsx
{isContentFetching ? (
  <>
    {/* #changes: Previous skeleton loader preserved and commented out */}
    {/* <NodeContentViewerSkeletonLoader /> */}
    <NodeContentAiLoader
      selectedNode={selectedNode}
      parentModule={nodes?.find((n) => n.id === selectedNode?.parentId)}
      closePopup={closePopup}
    />
  </>
) : (
  // ...
)}
```

---

## 4. Verification Checklist

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Shifu Icon in Center** | Displays authentic Shifu thinking mascot with glowing neon pulse. | ✅ Verified |
| **Circular Gauge** | Rotating tri-color gradient arc without numeric percentage labels. | ✅ Verified |
| **Dashed Aura** | Counter-rotating aura ring providing motion and depth. | ✅ Verified |
| **Dynamic Phased Text** | Automatically cycles through stage descriptions every 2.4 seconds. | ✅ Verified |
| **Close (`X`) Button** | Sticky top bar allows closing popup during generation without UI freeze. | ✅ Verified |
| **Non-Destructive** | Original skeleton loader code preserved for rollback safety. | ✅ Verified |
