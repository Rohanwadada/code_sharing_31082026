import React from 'react';
import loaderGif from '@/assets/loader-2.gif';
import PropTypes from 'prop-types';
import Image from 'next/image';

const Loader = ({ height, width, text }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <Image
        src={loaderGif}
        style={{ height: height, width: width }}
        alt="loader-image"
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <p>{text}</p>
      </div>
    </div>
  );
};

Loader.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  text: PropTypes.string,
};

export default Loader;
