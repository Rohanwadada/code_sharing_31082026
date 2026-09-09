import React from 'react';

/**
 * EdgeMarkers Component
 *
 * This component defines reusable SVG markers for edges in a React Flow diagram.
 * These markers are used to style the endpoints of edges with different visual indicators.
 *
 * Available markers:
 * - `arrow-marker`: A simple open arrowhead.
 * - `closed-arrow-marker`: A filled directional arrowhead.
 * - `circular-marker`: A circular endpoint.
 * - `filled-arrow-marker`: A bold filled arrowhead.
 *
 * Usage:
 * Attach these markers to edges using `markerEnd` or `markerStart` properties in React Flow edges.
 */
const EdgeMarkers = () => {
  return (
    <svg
      id="edge-markers"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      height={1}
      width={1}
    >
      <defs>
        <marker
          id="arrow-marker"
          markerUnits="strokeWidth"
          viewBox="0 0 20 20"
          markerHeight={20}
          markerWidth={10}
          refX={15}
          refY={12}
          orient="auto"
        >
          <path
            d="M5 4 L15 12 L5 20 "
            stroke="black"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </marker>

        <marker
          id="closed-arrow-marker"
          viewBox="0 0 20 20"
          markerHeight={10}
          markerWidth={10}
          refX={15}
          refY={12}
          markerUnits="strokeWidth"
          orient="auto"
        >
          <path
            d="M8 17.1752V6.8252C8 6.54187 8.1 6.3042 8.3 6.1122C8.5 5.9202 8.73333 5.82453 9 5.8252C9.08333 5.8252 9.171 5.83753 9.263 5.8622C9.355 5.88687 9.44233 5.92453 9.525 5.9752L17.675 11.1502C17.825 11.2502 17.9377 11.3752 18.013 11.5252C18.0883 11.6752 18.1257 11.8335 18.125 12.0002C18.1243 12.1669 18.087 12.3252 18.013 12.4752C17.939 12.6252 17.8263 12.7502 17.675 12.8502L9.525 18.0252C9.44167 18.0752 9.35433 18.1129 9.263 18.1382C9.17167 18.1635 9.084 18.1759 9 18.1752C8.73333 18.1752 8.5 18.0792 8.3 17.8872C8.1 17.6952 8 17.4579 8 17.1752Z"
            fill="black"
          />
        </marker>

        <marker
          id="circular-marker"
          viewBox="0 0 20 20"
          markerHeight={15}
          markerWidth={15}
          refX={10}
          refY={10}
          orient="auto"
        >
          <rect
            x="2"
            y="5"
            width="10"
            height="10"
            rx="6"
            stroke="black"
            fill="white"
          />
        </marker>

        <marker
          id="filled-arrow-marker"
          viewBox="0 0 20 20"
          markerHeight={10}
          markerWidth={10}
          refX={9}
          refY={12}
          orient="auto"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.1569 12.7106L4.49994 18.3676L3.08594 16.9536L8.03594 12.0036L3.08594 7.05365L4.49994 5.63965L10.1569 11.2966C10.3444 11.4842 10.4497 11.7385 10.4497 12.0036C10.4497 12.2688 10.3444 12.5231 10.1569 12.7106Z"
            fill="black"
          />
        </marker>
      </defs>
    </svg>
  );
};

export default EdgeMarkers;
