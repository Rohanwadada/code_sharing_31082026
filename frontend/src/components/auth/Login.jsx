'use client';

import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import styles from './Login.module.css';
import headerImage from '@/assets/shifu-logo.svg';
import shifuIcon from '@/assets/bot/thinking.png';
import { useAuthStore } from '@/store/authStore';
import { initialize, sendOtp, verifyOtp } from '@/service/auth.service';
import Button from '../ui/Button';
import { useNotification } from '@/hooks/useNotification';

const Login = () => {
  const [loginData, setLoginData] = useState({ email: '', otp: '' });
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isButtonDisable, setIsButtonDisable] = useState(false);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [authChallengeId, setAuthChallengeId] = useState(null);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const router = useRouter();
  const searchParams = useSearchParams();
  const {showNotification} = useNotification()

  /**
   * Effect to check if the user is already logged in.
   * If authenticated, the user is redirected to the intended page.
   */
  useLayoutEffect(() => {
    if (isLoggedIn) {
      const next = searchParams.get('next');

      if (next && next !== 'null') {
        // window.location.href = next;
        console.log('This also called');

        router.push(next);
      } else {
        router.push('/');
      }
    }
  }, [isLoggedIn, router, searchParams]);

  /**
   * Handles input field changes and updates the state.
   * @param {Object} event - Input change event
   */
  const handleChange = async (event) => {
    const { name, value } = event.target;
    setLoginData({
      ...loginData,
      [name]: name === 'email' ? value.toLowerCase() : value,
    });

    setError(null);
  };

  /**
   * Sends an OTP request to the server for user authentication.
   * @param {Object} event - Form submission event
   */
  const sendOTP = async (event) => {
    event?.preventDefault();

    // email validation
    if (!loginData?.email) {
      setError('Email is required.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(loginData?.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setIsButtonDisable(true);

      const responseData = await sendOtp({
        email: loginData.email,
      });
      setAuthChallengeId(responseData.challenge_id);
      setShowOTPInput(true);
      setOtpSent(true);
      setShowResend(true);
      startCountdown();
    } catch (error) {
      console.error(error);
      if (error.response) {
        const message = error.response?.data?.message || 'Something went wrong';
        setError(message);
        showNotification("error", message || 'Something went wrong')
      } else {
        // Network error
        setError('Something went wrong');
      }
    } finally {
      setIsButtonDisable(false);
    }
  };

  /**
   * Verifies the OTP entered by the user and completes the login process.
   */
  const verifyOTP = async () => {
    try {
      setShowResend(false);

      const responseData = await verifyOtp({
        email: loginData.email,
        otp: loginData.otp,
        challenge_id: authChallengeId,
      });

      setIsVerified(true);
      await initialize();
      const next = searchParams.get('next');

      if (next && next !== 'null') {
        console.log('Going to next: ', next);

        router.push(next);
      } else {
        router.push('/');
      }
    } catch (err) {
      console.log(err);

      if (err.response) {
        setError(err.response.data.message);
        setShowResend(true);
        setIsResendDisabled(false);
        const message = err.response?.data?.message || 'Something went wrong';
        showNotification("error", message || 'Something went wrong')
      } else {
        // Network error
        setError('Something went wrong');
      }
    }
  };

  /**
   * Starts the countdown after which resend OTP button will appear.
   */
  const startCountdown = () => {
    setTimer(20);
    // setShowResend(false);
    setIsResendDisabled(true);
  };

  /**
   * Function to resend OTP
   */
  const handleResendOTP = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoginData({ ...loginData, otp: '' });
    setIsResendDisabled(true);
    await sendOTP();
    // setShowResend(true);
  };

  /**
   * Effect to automatically verify OTP once the user has entered 6 digits.
   */
  useEffect(() => {
    if (showOTPInput && loginData?.otp?.length === 6) {
      verifyOTP();
    }
  }, [loginData?.otp]);

  /**
   * Effect to update the page title when the component mounts.
   */
  //   useEffect(() => {
  //     changePageTitle("Login");
  //   }, []);

  useEffect(() => {
    if (timer > 0) {
      const timeout = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(timeout);
    } else if (otpSent) {
      setShowResend(true);
      setIsResendDisabled(false);
      // setShowOTPInput(false); // Hide OTP input when timer ends
    }
  }, [otpSent, timer]);

  return (
    <div className={styles['main-container']}>
      <div className={styles['lg-head']}>
        <Image src={headerImage} alt="" className={styles['shifu-img']} />
        <div className={styles['shifu-img-ct']}>
          <Image src={shifuIcon} alt="" className={styles['shifu-img']} />
        </div>
        <span className={styles['lg-text']}>
          Please <span className={styles['login-span']}>Login</span> to start
          conversatation with me
        </span>
      </div>

      <form className={styles['lg-form']} onSubmit={sendOTP}>
        <div className={styles['form-group-email']}>
          <label id="email" htmlFor="email" className={styles['label']}>
            Email
          </label>
          <input
            type="email"
            name="email"
            className={styles['input-box']}
            placeholder="pavi@example.com"
            value={loginData.email}
            onChange={handleChange}
            disabled={showOTPInput}
            required
          />
        </div>
        {showOTPInput && (
          <div className={styles['form-group-otp']}>
            <label id="otp" htmlFor="otp" className={styles['label']}>
              <span>Verify OTP</span>
              {error && error === 'Invalid OTP' && (
                <span className={styles['error']}>Invalid OTP</span>
              )}
            </label>
            <input
              type="number"
              inputMode="numeric"
              maxLength={6}
              name="otp"
              className={`${styles['input-box']} ${isVerified ? styles['input-box-green'] : ''} ${error && error === 'Invalid OTP' ? styles['input-box-red'] : ''}`}
              placeholder="Enter OTP"
              value={loginData.otp}
              onChange={handleChange}
            />

            {showResend && (
              <button
                className={styles['resend-btn']}
                onClick={handleResendOTP}
                disabled={isResendDisabled}
              >
                Resend OTP
              </button>
            )}

            {isVerified && (
              <span className={styles['verified-span']}>
                Verified{' '}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="17"
                  viewBox="0 0 17 17"
                  fill="none"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0 8.125C0 3.6375 3.6375 0 8.125 0C12.6125 0 16.25 3.6375 16.25 8.125C16.25 12.6125 12.6125 16.25 8.125 16.25C3.6375 16.25 0 12.6125 0 8.125ZM11.1333 6.61333C11.1833 6.54671 11.2195 6.47076 11.2397 6.38996C11.26 6.30915 11.2638 6.22512 11.2511 6.1428C11.2384 6.06047 11.2094 5.98152 11.1657 5.91058C11.1221 5.83964 11.0646 5.77815 10.9969 5.72971C10.9291 5.68127 10.8523 5.64687 10.7711 5.62852C10.6898 5.61018 10.6057 5.60826 10.5237 5.62289C10.4417 5.63751 10.3635 5.66838 10.2936 5.71368C10.2237 5.75898 10.1635 5.81779 10.1167 5.88667L7.42 9.66167L6.06667 8.30833C5.94819 8.19793 5.79148 8.13783 5.62956 8.14069C5.46765 8.14354 5.31316 8.20914 5.19865 8.32365C5.08414 8.43816 5.01854 8.59265 5.01569 8.75456C5.01283 8.91648 5.07293 9.07319 5.18333 9.19167L7.05833 11.0667C7.12249 11.1308 7.19983 11.1802 7.28499 11.2114C7.37015 11.2426 7.46108 11.2549 7.55147 11.2474C7.64186 11.24 7.72955 11.213 7.80844 11.1682C7.88733 11.1235 7.95554 11.0621 8.00833 10.9883L11.1333 6.61333Z"
                    fill="#258827"
                  />
                </svg>
              </span>
            )}

            {/* {timer > 0 && (
              <div className={styles['timer-text-div']}>
                <span className={styles['timer-text']}>{timer + ' '}Sec</span>
              </div>
            )} */}
          </div>
        )}

        {!otpSent && (
          <Button
            variant={'primary'}
            disabled={isButtonDisable}
            className={styles['btn']}
            size={'sm'}
          >
            <span>{!isButtonDisable ? 'Send OTP' : 'Sending. . .'}</span>
          </Button>
        )}
      </form>
    </div>
  );
};

export default Login;
