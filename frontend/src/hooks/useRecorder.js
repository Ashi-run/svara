import { useCallback, useEffect, useRef, useState } from "react";

const LEVEL_BARS = 32;

export function useRecorder() {
  const [status, setStatus] = useState("idle"); // idle | recording | recorded
  const [elapsed, setElapsed] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [levels, setLevels] = useState(() => new Array(LEVEL_BARS).fill(0.04));
  const [micError, setMicError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const blobRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  const cleanupAudioGraph = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      cleanupAudioGraph();
      cleanupStream();
    },
    [cleanupAudioGraph, cleanupStream]
  );

  const tickLevels = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    // RMS amplitude from time-domain samples, normalized to ~0.03–1
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    const level = Math.min(1, Math.max(0.04, rms * 3.2));
    setLevels((prev) => [...prev.slice(1), level]);
    rafRef.current = requestAnimationFrame(tickLevels);
  }, []);

  const start = useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        blobRef.current = blob;
        setAudioURL(URL.createObjectURL(blob));
        setStatus("recorded");
        cleanupAudioGraph();
        cleanupStream();
      };

      recorder.start();
      setStatus("recording");
      setElapsed(0);
      setLevels(new Array(LEVEL_BARS).fill(0.04));
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      rafRef.current = requestAnimationFrame(tickLevels);
    } catch (err) {
      setMicError(
        "Couldn't access the microphone. Check your browser's permission settings and try again."
      );
    }
  }, [cleanupAudioGraph, cleanupStream, tickLevels]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL(null);
    blobRef.current = null;
    setStatus("idle");
    setElapsed(0);
    setLevels(new Array(LEVEL_BARS).fill(0.04));
  }, [audioURL]);

  return {
    status,
    elapsed,
    audioURL,
    levels,
    micError,
    blobRef,
    start,
    stop,
    reset,
  };
}
