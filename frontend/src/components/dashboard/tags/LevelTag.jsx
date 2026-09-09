import TagCard from './TagCard';

const LevelTag = ({ text }) => {
  return <TagCard text={text} icon={<Signal width={13} height={13} />} />;
};

const Signal = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 13 13"
      fill="none"
      {...props}
    >
      <path
        d="M0.5 7.25C0.5 6.836 0.836 6.5 1.25 6.5H2.75C3.164 6.5 3.5 6.836 3.5 7.25V11.75C3.5 12.164 3.164 12.5 2.75 12.5H1.25C1.05109 12.5 0.860322 12.421 0.71967 12.2803C0.579018 12.1397 0.5 11.9489 0.5 11.75V7.25ZM5 4.25C5 3.836 5.336 3.5 5.75 3.5H7.25C7.664 3.5 8 3.836 8 4.25V11.75C8 12.164 7.664 12.5 7.25 12.5H5.75C5.55109 12.5 5.36032 12.421 5.21967 12.2803C5.07902 12.1397 5 11.9489 5 11.75V4.25ZM9.5 1.25C9.5 0.836 9.836 0.5 10.25 0.5H11.75C12.164 0.5 12.5 0.836 12.5 1.25V11.75C12.5 12.164 12.164 12.5 11.75 12.5H10.25C10.0511 12.5 9.86032 12.421 9.71967 12.2803C9.57902 12.1397 9.5 11.9489 9.5 11.75V1.25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default LevelTag;
