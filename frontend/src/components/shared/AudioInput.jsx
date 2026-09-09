import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './AudioInput.module.css';

const MAX_BARS = 120; // max bars visible in the waveform timeline

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) =>
    [...str].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Float32 → Int16 PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

async function blobToWavFile(blob) {
  const arrayBuffer = await blob.arrayBuffer();

  // OfflineAudioContext is supported in all browsers (Chrome, Firefox, Safari)
  // We decode whatever format the browser recorded (webm/ogg/mp4) into raw PCM
  const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
  await tempCtx.close();

  const TARGET_SAMPLE_RATE = 16000; // whisper.cpp expects 16kHz

  // Resample to 16kHz using OfflineAudioContext (cross-browser)
  const offlineCtx = new OfflineAudioContext(
    1, // mono
    Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE),
    TARGET_SAMPLE_RATE,
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // Mix down to mono: merge all channels
  const merger = offlineCtx.createChannelMerger(1);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    source.connect(merger, ch, 0);
  }
  merger.connect(offlineCtx.destination);
  source.start(0);

  const resampled = await offlineCtx.startRendering();
  const pcm = resampled.getChannelData(0); // Float32Array

  const wavBuffer = encodeWAV(pcm, TARGET_SAMPLE_RATE);
  return new File([wavBuffer], 'recording.wav', { type: 'audio/wav' });
}

const AudioInput = ({ onAudioReady, onCancel }) => {
  const [bars, setBars] = useState([]); // grows over time (timeline)
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds elapsed

  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const transcriptRef = useRef('');
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const barsRef = useRef([]); // mutable ref for accumulatring bars
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4', // Safari
      'audio/wav',
    ];

    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  useEffect(() => {
    let dead = false;

    // Start elapsed timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    (async () => {
      try {
        // initialize Web Speech API for STT
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event) => {
            let currentTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript;
            }
            transcriptRef.current = currentTranscript;
          };

          recognition.start();
          recognitionRef.current = recognition;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          if (!dead) demoBars();
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (dead) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          ctxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          ctx.createMediaStreamSource(stream).connect(analyser);
          analyserRef.current = analyser;
        }

        // start recording
        const mimeType = getSupportedMimeType();
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
        });

        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('Media recorder stopped');

          // const rawBlob = new Blob(chunksRef.current, { type: mimeType });
          // try {
          //   const wavFile = await blobToWavFile(rawBlob);
          //   onAudioReady(wavFile); // always a clean 16kHz mono WAV
          // } catch (err) {
          //   console.error("WAV conversion failed:", err);
          // }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;

        liveBars();
      } catch {
        if (!dead) demoBars();
      }
    })();

    return () => {
      dead = true;
      cleanup();
      stopRecording();
    };
  }, []);

  const cleanup = () => {
    cancelAnimationFrame(animRef.current);
    clearInterval(timerRef.current);

    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (ctxRef?.current && ctxRef.current?.state !== 'closed') {
      ctxRef.current.close();
    }

    recognitionRef.current?.stop();
  };

  // push a single amplitude sample onto the timeline
  const pushBar = useCallback((height) => {
    barsRef.current = [...barsRef.current, height].slice(-MAX_BARS);
    setBars([...barsRef.current]);
  }, []);

  // live mic: sample once every ~60ms
  const liveBars = () => {
    const a = analyserRef.current;
    if (!a) return;
    const d = new Uint8Array(a.frequencyBinCount);
    let lastPush = 0;

    const tick = (now) => {
      a.getByteFrequencyData(d);

      // Push a new bar every ~60ms (timeline pace)
      if (now - lastPush > 60) {
        // average the frequency bins for a single amplitude value
        let sum = 0;
        for (let j = 0; j < d.length; j++) sum += d[j];
        const avg = sum / d.length;
        const height = Math.max(3, (avg / 255) * 50);
        pushBar(height);
        lastPush = now;
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  };

  // demo fallback: simulate flowing bars
  const demoBars = () => {
    let p = 0;
    let lastPush = 0;

    const tick = (now) => {
      p += 0.06;

      if (now - lastPush > 60) {
        const wave1 = Math.sin(p) * 0.5 + 0.5;
        const wave2 = Math.sin(p * 2.3) * 0.3 + 0.3;
        const noise = Math.random() > 0.8 ? Math.random() * 16 : 0;
        const height = Math.max(3, (wave1 + wave2) * 30 + noise);
        pushBar(height);
        lastPush = now;
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  };

  // format elapsed time as M:SS */
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return resolve();

      recorder.onstop = resolve;
      recorder.stop(); // wait for this to fully finish
    });
  };

  // handle confirm: show processing, then send
  const handleConfirm = async () => {
    setIsProcessing(true);

    await stopRecording();

    const mimeType = getSupportedMimeType();
    const rawBlob = new Blob(chunksRef.current, { type: mimeType });
    try {
      const wavFile = await blobToWavFile(rawBlob);
      onAudioReady(wavFile); // always a clean 16kHz mono WAV
    } catch (err) {
      console.error('WAV conversion failed:', err);
      setIsProcessing(true);
    }

    cleanup();
  };
  return (
    <div
      className={`${styles['recording-bar']} ${isProcessing ? styles['processing'] : ''}`}
    >
      {/* Recording indicator or processing status */}
      {isProcessing ? (
        <span className={styles['status-text']}>Processing…</span>
      ) : (
        <>
          <span className={styles['rec-dot']} />
          <span className={styles['timer']}>{formatTime(elapsed)}</span>
        </>
      )}

      {/* Cancel button */}
      <button
        type="button"
        className={styles['cancel-btn']}
        onClick={() => {
          stop();
          onCancel?.();
        }}
        aria-label="Cancel"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Scrolling waveform timeline */}
      <div className={styles['waveform']}>
        {bars.map((h, i) => (
          <span
            key={i}
            className={styles['bar']}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* Confirm / Send button */}
      <button
        type="button"
        className={styles['confirm-btn']}
        onClick={handleConfirm}
        aria-label="Confirm"
        disabled={isProcessing}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </div>
  );
};

export const MicIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="9" y1="22" x2="15" y2="22" />
  </svg>
);

export default AudioInput;
