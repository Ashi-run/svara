import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  AlertCircle,
  Volume2,
  Sparkles,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { useRecorder } from "../hooks/useRecorder";
import RecordButton from "../components/RecordButton";
import WaveformMeter from "../components/WaveformMeter";
import { api } from "../lib/api";
import { addSessionResult, getSessionHistory } from "../lib/db";

const SAMPLE_PROMPTS = ["Sun", "Sammy sees seven silver spoons", "Ken kicks the can", "Green grapes"];

const fraunces = { fontFamily: "'Fraunces', serif", fontWeight: 500 };
const primaryBtn =
  "h-14 w-full rounded-full bg-[#3E6B64] hover:bg-[#345650] active:bg-[#2C4A45] text-white text-base font-semibold flex items-center justify-center gap-2 transition-colors";
const secondaryBtn =
  "h-14 w-full rounded-full bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] hover:bg-[#F1EEE7] dark:hover:bg-[#2A2822] text-[#262624] dark:text-[#EDEAE2] text-base font-medium flex items-center justify-center gap-2 transition-colors";

export default function PatientApp() {
  const [step, setStep] = useState("record"); // record | review | playback | progress
  const [patientId, setPatientId] = useState("P-001");
  const [promptText, setPromptText] = useState(SAMPLE_PROMPTS[0]);

  const [analysis, setAnalysis] = useState(null); // { targetText, recognizedText, chars, accuracyPct, erroredSounds }
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  const [correctedURL, setCorrectedURL] = useState(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [loggedThisResult, setLoggedThisResult] = useState(false);

  const { status, elapsed, audioURL, levels, micError, blobRef, start, stop, reset } =
    useRecorder();

  const resetAll = () => {
    reset();
    setAnalysis(null);
    setAnalyzeError(null);
    setCorrectedURL(null);
    setLoggedThisResult(false);
    setStep("record");
  };

  const goToReview = async () => {
    if (!blobRef.current) return;
    setStep("review");
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await api.analyzeRecording({ patientId, promptText, blob: blobRef.current });
      setAnalysis(result);
    } catch (err) {
      setAnalyzeError("Couldn't analyze that recording. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const goToPlayback = async () => {
    setStep("playback");
    setSynthesizing(true);
    try {
      const blob = await api.synthesizeCorrectedAudio({
        patientId,
        correctedText: analysis?.targetText,
        originalBlob: blobRef.current,
      });
      setCorrectedURL(URL.createObjectURL(blob));
    } finally {
      setSynthesizing(false);
    }
  };

  useEffect(() => {
    if (step === "playback" && analysis && !loggedThisResult) {
      addSessionResult({
        patientId,
        promptText,
        targetText: analysis.targetText,
        recognizedText: analysis.recognizedText,
        accuracyPct: analysis.accuracyPct,
        erroredSounds: analysis.erroredSounds,
      }).catch(() => {});
      setLoggedThisResult(true);
    }
  }, [step, analysis, loggedThisResult, patientId, promptText]);

  return (
    <div className="w-full max-w-[480px] mx-auto px-5 py-6 sm:py-8 flex flex-col min-h-[calc(100vh-56px)]">
      <StepHeader step={step} />

      {step === "record" && (
        <RecordScreen
          patientId={patientId}
          setPatientId={setPatientId}
          promptText={promptText}
          setPromptText={setPromptText}
          status={status}
          elapsed={elapsed}
          audioURL={audioURL}
          levels={levels}
          micError={micError}
          start={start}
          stop={stop}
          reset={reset}
          onContinue={goToReview}
        />
      )}

      {step === "review" && (
        <ReviewScreen
          analyzing={analyzing}
          analyzeError={analyzeError}
          analysis={analysis}
          onBack={() => setStep("record")}
          onReRecord={resetAll}
          onContinue={goToPlayback}
        />
      )}

      {step === "playback" && (
        <PlaybackScreen
          patientId={patientId}
          originalURL={audioURL}
          correctedURL={correctedURL}
          synthesizing={synthesizing}
          accuracyPct={analysis?.accuracyPct}
          onRecordAnother={resetAll}
          onViewProgress={() => setStep("progress")}
        />
      )}

      {step === "progress" && (
        <ProgressScreen patientId={patientId} onBack={() => setStep("playback")} onRecordAnother={resetAll} />
      )}
    </div>
  );
}

function StepHeader({ step }) {
  const steps = [
    { id: "record", label: "Record" },
    { id: "review", label: "Review" },
    { id: "playback", label: "Playback" },
  ];
  const activeIdx = steps.findIndex((s) => s.id === step);
  if (step === "progress") return null;

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                i <= activeIdx
                  ? "bg-[#3E6B64] text-white"
                  : "bg-[#E3DFD6] dark:bg-[#3A382F] text-[#9A968D]"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                i === activeIdx
                  ? "text-[#262624] dark:text-[#EDEAE2] font-medium"
                  : "text-[#9A968D]"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-px ${i < activeIdx ? "bg-[#3E6B64]" : "bg-[#E3DFD6] dark:bg-[#3A382F]"}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ------------------------------- Screen 1 ------------------------------- */
function RecordScreen({
  patientId,
  setPatientId,
  promptText,
  setPromptText,
  status,
  elapsed,
  audioURL,
  levels,
  micError,
  start,
  stop,
  reset,
  onContinue,
}) {
  return (
    <main className="flex-1 flex flex-col">
      <div className="flex flex-col gap-3 mb-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[#9A968D]">
            Patient ID
          </span>
          <input
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="h-12 rounded-xl border border-[#E3DFD6] dark:border-[#3A382F] bg-white dark:bg-[#22201C] px-4 text-base outline-none focus:ring-2 focus:ring-[#3E6B64]/30"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[#9A968D]">
            What are you going to say?
          </span>
          <select
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="h-12 rounded-xl border border-[#E3DFD6] dark:border-[#3A382F] bg-white dark:bg-[#22201C] px-4 text-base outline-none focus:ring-2 focus:ring-[#3E6B64]/30"
          >
            {SAMPLE_PROMPTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] px-6 py-10 flex flex-col items-center justify-center text-center shadow-sm min-h-[140px]">
        <span className="text-xs font-medium uppercase tracking-widest text-[#9A968D] mb-3">
          Say this out loud
        </span>
        <p className="text-[26px] leading-snug" style={fraunces}>
          {promptText}
        </p>
      </div>

      {micError && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[#FBEEEA] dark:bg-[#3A2A22] border border-[#E9C9BC] dark:border-[#5A3D2E] px-4 py-3 text-sm text-[#8A3E2A] dark:text-[#E9A88E]">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{micError}</p>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
        <RecordButton status={status} onStart={start} onStop={stop} />
        {status === "recording" && <WaveformMeter levels={levels} active />}
        {status === "idle" && (
          <p className="text-sm text-[#6B6862] dark:text-[#A7A399]">Tap the mic to start</p>
        )}
        {status === "recording" && (
          <p className="text-sm text-[#C1604A] font-medium tabular-nums">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </p>
        )}
        {status === "recorded" && audioURL && (
          <audio src={audioURL} controls className="w-full max-w-[320px] h-11 rounded-full" />
        )}
      </div>

      <div className="flex flex-col gap-3 pb-2">
        {status === "recorded" && (
          <>
            <button onClick={onContinue} className={primaryBtn}>
              Continue to review
              <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={reset} className={secondaryBtn}>
              <RotateCcw className="w-5 h-5" />
              Re-record
            </button>
          </>
        )}
      </div>
    </main>
  );
}

/* ------------------------------- Screen 2 ------------------------------- */
function ReviewScreen({ analyzing, analyzeError, analysis, onBack, onReRecord, onContinue }) {
  return (
    <main className="flex-1 flex flex-col">
      {analyzing && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#3E6B64] border-t-transparent animate-spin" />
          <p className="text-sm text-[#6B6862] dark:text-[#A7A399]">Analyzing your recording…</p>
        </div>
      )}

      {!analyzing && analyzeError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20">
          <AlertCircle className="w-8 h-8 text-[#C1604A]" />
          <p className="text-[#6B6862] dark:text-[#A7A399] max-w-[280px]">{analyzeError}</p>
          <button onClick={onBack} className={secondaryBtn}>
            <ArrowLeft className="w-5 h-5" />
            Back to recording
          </button>
        </div>
      )}

      {!analyzing && !analyzeError && analysis && (
        <>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] p-5">
              <span className="text-xs font-medium uppercase tracking-wide text-[#9A968D]">
                What we heard
              </span>
              <p
                className="text-lg mt-2 tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {analysis.recognizedText}
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] p-5">
              <span className="text-xs font-medium uppercase tracking-wide text-[#9A968D] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Target / corrected — highlighted sounds need practice
              </span>
              <p className="text-lg mt-3 leading-relaxed">
                {analysis.chars.map((c, i) => (
                  <span
                    key={i}
                    title={
                      c.status === "error"
                        ? `Sound often affected by cleft-related airflow (e.g. weakened /${c.char.toLowerCase()}/)`
                        : undefined
                    }
                    className={
                      c.status === "error"
                        ? "bg-[#F4A261]/30 dark:bg-[#F4A261]/25 text-[#8A3E2A] dark:text-[#F4C99B] rounded px-0.5 font-semibold underline decoration-dotted decoration-[#C1604A] cursor-help"
                        : c.status === "match"
                        ? "text-[#3E6B64] dark:text-[#7FBDB2]"
                        : ""
                    }
                  >
                    {c.char}
                  </span>
                ))}
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-[#3E6B64]/8 px-5 py-4">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-[#3E6B64] tabular-nums">
                  {analysis.accuracyPct}%
                </span>
                <span className="text-xs text-[#6B6862] dark:text-[#A7A399]">
                  target-sound accuracy
                </span>
              </div>
              {analysis.erroredSounds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.erroredSounds.map((s) => (
                    <span
                      key={s}
                      className="text-xs font-mono px-2 py-1 rounded-full bg-white dark:bg-[#22201C] border border-[#E9C9BC] dark:border-[#5A3D2E] text-[#8A3E2A] dark:text-[#E9A88E]"
                    >
                      /{s}/
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col gap-3 pb-2 mt-8">
            <button onClick={onContinue} className={primaryBtn}>
              Continue to playback
              <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={onReRecord} className={secondaryBtn}>
              <RotateCcw className="w-5 h-5" />
              Re-record instead
            </button>
          </div>
        </>
      )}
    </main>
  );
}

/* ------------------------------- Screen 3 ------------------------------- */
function PlaybackScreen({
  originalURL,
  correctedURL,
  synthesizing,
  accuracyPct,
  onRecordAnother,
  onViewProgress,
}) {
  return (
    <main className="flex-1 flex flex-col">
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-[#9A968D]">
            Your original recording
          </span>
          <audio src={originalURL} controls className="w-full h-11 rounded-full mt-3" />
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#3E6B64]/30 p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-[#3E6B64] flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            Corrected — in your cloned voice
          </span>
          {synthesizing ? (
            <div className="flex items-center gap-2 mt-3 text-sm text-[#6B6862] dark:text-[#A7A399]">
              <div className="w-4 h-4 rounded-full border-2 border-[#3E6B64] border-t-transparent animate-spin" />
              Synthesizing…
            </div>
          ) : (
            <audio src={correctedURL} controls className="w-full h-11 rounded-full mt-3" />
          )}
          <p className="text-xs text-[#9A968D] flex items-start gap-1.5 mt-3">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Voice cloning isn't connected yet — this plays your original recording as a
            placeholder until the TTS backend is wired up.
          </p>
        </div>

        {typeof accuracyPct === "number" && (
          <div className="flex items-center gap-4 rounded-2xl bg-[#3E6B64]/8 px-5 py-4">
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-[#3E6B64] tabular-nums">
                {accuracyPct}%
              </span>
              <span className="text-xs text-[#6B6862] dark:text-[#A7A399]">this session</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-3 pb-2 mt-8">
        <button onClick={onViewProgress} className={primaryBtn}>
          <TrendingUp className="w-5 h-5" />
          View my progress
        </button>
        <button onClick={onRecordAnother} className={secondaryBtn}>
          <RotateCcw className="w-5 h-5" />
          Record another
        </button>
      </div>
    </main>
  );
}

/* ------------------------------- Progress view ------------------------------- */
function ProgressScreen({ patientId, onBack, onRecordAnother }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSessionHistory(patientId).then((rows) => {
      if (cancelled) return;
      const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
      setHistory(
        sorted.map((r, i) => ({
          index: i + 1,
          accuracy: r.accuracyPct,
          date: new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const avg = useMemo(() => {
    if (!history || history.length === 0) return null;
    return Math.round(history.reduce((s, h) => s + h.accuracy, 0) / history.length);
  }, [history]);

  return (
    <main className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-[#E3DFD6] dark:border-[#3A382F] hover:bg-[#F1EEE7] dark:hover:bg-[#2A2822]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl" style={fraunces}>
          Your progress
        </h1>
      </div>

      {!history ? (
        <p className="text-sm text-[#6B6862] dark:text-[#A7A399]">Loading…</p>
      ) : history.length < 2 ? (
        <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] p-5 text-center">
          <p className="text-sm text-[#6B6862] dark:text-[#A7A399]">
            Record a few more sessions to start seeing a trend here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] p-5">
          {avg !== null && (
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-semibold text-[#3E6B64] tabular-nums">{avg}%</span>
              <span className="text-sm text-[#6B6862] dark:text-[#A7A399]">average accuracy</span>
            </div>
          )}
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3DFD6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9A968D" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9A968D" }} />
                <RTooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #E3DFD6",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#3E6B64"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#3E6B64" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <button onClick={onRecordAnother} className={`${primaryBtn} mt-8`}>
        <RotateCcw className="w-5 h-5" />
        Record another
      </button>
    </main>
  );
}
