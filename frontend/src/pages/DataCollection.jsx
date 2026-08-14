import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  PartyPopper,
  FolderOpen,
  SkipForward,
  History,
} from "lucide-react";

import { useRecorder } from "../hooks/useRecorder";
import RecordButton from "../components/RecordButton";
import WaveformMeter from "../components/WaveformMeter";
import { api } from "../lib/api";
import { supportsFileSystemAccess, ensureDirPermission } from "../lib/files";
import { saveDataCollectionSession, loadDataCollectionSession, clearDataCollectionSession } from "../lib/db";
import { playSaveChime, playErrorTone } from "../lib/sound";

const PROMPTS = [
  "Pig",
  "Cup",
  "Duck",
  "Kite",
  "Sun",
  "Zoo shoe",
  "Choo-choo train",
  "Baby bottle",
  "Teddy bear",
  "Green grapes",
  "The cat sat on the mat",
  "Sammy sees seven silver spoons",
  "Daddy digs a deep ditch",
  "Ken kicks the can",
  "Sunshine and rainbows",
];

function formatFilename(speakerId, index) {
  const prefix = speakerId ? `${speakerId}_` : "";
  return `${prefix}audio_${String(index + 1).padStart(4, "0")}.webm`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DataCollection() {
  const total = PROMPTS.length;

  // ---- setup gate: speaker id + folder ----
  const [setupDone, setSetupDone] = useState(false);
  const [speakerId, setSpeakerId] = useState("");
  const [dirHandle, setDirHandle] = useState(null);
  const [dirName, setDirName] = useState("");
  const [folderError, setFolderError] = useState(null);

  // ---- resume banner ----
  const [resumeCandidate, setResumeCandidate] = useState(null); // stored snapshot, pre-confirm
  const [checkedForResume, setCheckedForResume] = useState(false);

  // ---- session state ----
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [logRows, setLogRows] = useState([]);
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const promptText = PROMPTS[currentIndex];
  const filename = formatFilename(speakerId, currentIndex);

  const { status, elapsed, audioURL, levels, micError, blobRef, start, stop, reset } =
    useRecorder();

  // Look for a resumable session on first mount, before showing setup screen.
  useEffect(() => {
    (async () => {
      const snap = await loadDataCollectionSession();
      if (snap && snap.currentIndex < total) {
        setResumeCandidate(snap);
      }
      setCheckedForResume(true);
    })();
  }, [total]);

  const persist = useCallback(
    (overrides = {}) => {
      saveDataCollectionSession({
        speakerId,
        currentIndex,
        savedCount,
        logRows,
        dirHandle,
        dirName,
        ...overrides,
      }).catch(() => {});
    },
    [speakerId, currentIndex, savedCount, logRows, dirHandle, dirName]
  );

  const resumeSession = async () => {
    const snap = resumeCandidate;
    if (!snap) return;
    let restoredDir = snap.dirHandle || null;
    let restoredDirName = snap.dirName || "";
    if (restoredDir) {
      const ok = await ensureDirPermission(restoredDir);
      if (!ok) {
        restoredDir = null; // keep going, fall back to downloads for this session
      }
    }
    setSpeakerId(snap.speakerId || "");
    setCurrentIndex(snap.currentIndex || 0);
    setSavedCount(snap.savedCount || 0);
    setLogRows(snap.logRows || []);
    setDirHandle(restoredDir);
    setDirName(restoredDir ? restoredDirName : "");
    setResumeCandidate(null);
    setSetupDone(true);
  };

  const discardResume = async () => {
    await clearDataCollectionSession();
    setResumeCandidate(null);
  };

  const chooseFolder = async () => {
    setFolderError(null);
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      setDirHandle(handle);
      setDirName(handle.name);
    } catch (err) {
      if (err.name !== "AbortError") {
        setFolderError("Couldn't get permission to save to that folder. Please try again.");
      }
    }
  };

  const beginSession = () => {
    setSetupDone(true);
    persist({ currentIndex: 0, savedCount: 0, logRows: [] });
  };

  // ---- keyboard shortcuts: space = start/stop, enter = save & next ----
  useEffect(() => {
    if (!setupDone || finished) return;
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (status === "idle") start();
        else if (status === "recording") stop();
      } else if (e.code === "Enter" && status === "recorded" && !saving) {
        e.preventDefault();
        saveAndNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, setupDone, finished, saving]);

  const advance = (updatedRows, updatedSavedCount) => {
    reset();
    if (currentIndex + 1 >= total) {
      setFinished(true);
      clearDataCollectionSession().catch(() => {});
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      persist({ currentIndex: nextIndex, savedCount: updatedSavedCount, logRows: updatedRows });
    }
  };

  const saveAndNext = async () => {
    if (!blobRef.current) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.saveRecording({ dirHandle, filename, promptText, status: "recorded", blob: blobRef.current });
      const updatedRows = [...logRows, { filename, promptText, status: "recorded" }];
      setLogRows(updatedRows);
      await api.writeLog({ dirHandle, rows: updatedRows });
      const updatedSavedCount = savedCount + 1;
      setSavedCount(updatedSavedCount);
      playSaveChime();
      setSaving(false);
      advance(updatedRows, updatedSavedCount);
    } catch (err) {
      playErrorTone();
      setSaveError("Couldn't save to the selected folder. Make sure it still exists and try again.");
      setSaving(false);
    }
  };

  const skipItem = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updatedRows = [...logRows, { filename: "", promptText, status: "skipped" }];
      setLogRows(updatedRows);
      await api.writeLog({ dirHandle, rows: updatedRows });
      setSaving(false);
      advance(updatedRows, savedCount);
    } catch (err) {
      setSaveError("Couldn't update the log. Check the folder still exists and try again.");
      setSaving(false);
    }
  };

  const progressPct = Math.round((savedCount / total) * 100);

  if (!checkedForResume) return null;

  if (resumeCandidate) {
    return (
      <CenteredCard>
        <History className="w-8 h-8 text-[#3E6B64]" />
        <h1 className="text-2xl mt-4" style={fraunces}>
          Resume where you left off?
        </h1>
        <p className="text-[#6B6862] dark:text-[#A7A399] mt-2 max-w-[320px] mx-auto">
          You have an unfinished session
          {resumeCandidate.speakerId ? ` for “${resumeCandidate.speakerId}”` : ""} at item{" "}
          {Math.min(resumeCandidate.currentIndex + 1, total)} of {total}.
        </p>
        <div className="flex flex-col gap-3 w-full mt-6">
          <button onClick={resumeSession} className={primaryBtn}>
            Resume session
            <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={discardResume} className={secondaryBtn}>
            Start over instead
          </button>
        </div>
      </CenteredCard>
    );
  }

  if (!setupDone) {
    return (
      <CenteredCard>
        <FolderOpen className="w-8 h-8 text-[#3E6B64]" />
        <h1 className="text-2xl mt-4" style={fraunces}>
          Set up this session
        </h1>
        <p className="text-[#6B6862] dark:text-[#A7A399] mt-2 max-w-[320px] mx-auto">
          Optionally tag recordings with a speaker/patient ID, then choose where files should be
          saved.
        </p>

        <div className="w-full mt-6 flex flex-col gap-4 text-left">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[#9A968D]">
              Speaker / patient ID (optional)
            </span>
            <input
              value={speakerId}
              onChange={(e) => setSpeakerId(e.target.value.trim())}
              placeholder="e.g. P-004"
              className="h-12 rounded-xl border border-[#E3DFD6] dark:border-[#3A382F] bg-white dark:bg-[#22201C] px-4 text-base outline-none focus:ring-2 focus:ring-[#3E6B64]/30"
            />
          </label>

          {folderError && (
            <div className="flex items-start gap-2.5 rounded-xl bg-[#FBEEEA] dark:bg-[#3A2A22] border border-[#E9C9BC] dark:border-[#5A3D2E] px-4 py-3 text-sm text-[#8A3E2A] dark:text-[#E9A88E]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{folderError}</p>
            </div>
          )}

          {supportsFileSystemAccess ? (
            <button
              onClick={chooseFolder}
              className="h-12 rounded-xl border border-[#E3DFD6] dark:border-[#3A382F] bg-white dark:bg-[#22201C] flex items-center justify-center gap-2 text-sm font-medium hover:bg-[#F1EEE7] dark:hover:bg-[#2A2822] transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              {dirName ? `Folder: “${dirName}” (change)` : "Choose save folder"}
            </button>
          ) : (
            <p className="text-sm text-[#C1604A]">
              This browser doesn't support choosing a folder directly — recordings will download
              individually to your default Downloads folder instead.
            </p>
          )}
        </div>

        <button onClick={beginSession} className={`${primaryBtn} mt-6`}>
          Start recording
          <ArrowRight className="w-5 h-5" />
        </button>
      </CenteredCard>
    );
  }

  return (
    <div className="w-full max-w-[480px] mx-auto px-5 py-6 sm:py-8 flex flex-col min-h-[calc(100vh-56px)]">
      <header className="flex flex-col gap-2 mb-8">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium tracking-wide text-[#6B6862] dark:text-[#A7A399]">
            {speakerId ? `Session · ${speakerId}` : "Recording session"}
          </span>
          <span
            className="text-sm tabular-nums text-[#3E6B64] font-semibold"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {Math.min(savedCount + (finished ? 0 : 1), total)} / {total}
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full bg-[#E3DFD6] dark:bg-[#3A382F] overflow-hidden"
          role="progressbar"
          aria-valuenow={savedCount}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className="h-full rounded-full bg-[#3E6B64] transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          {dirName ? (
            <p className="text-xs text-[#9A968D] flex items-center gap-1 truncate">
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Saving to “{dirName}”</span>
            </p>
          ) : (
            <p className="text-xs text-[#9A968D]">Saving via browser downloads</p>
          )}
          {logRows.length > 0 && (
            <p className="text-xs text-[#9A968D] shrink-0">{logRows.length} logged</p>
          )}
        </div>
      </header>

      {saveError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#FBEEEA] dark:bg-[#3A2A22] border border-[#E9C9BC] dark:border-[#5A3D2E] px-4 py-3 text-sm text-[#8A3E2A] dark:text-[#E9A88E]">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{saveError}</p>
        </div>
      )}

      {finished ? (
        <main className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16">
          <div className="w-16 h-16 rounded-full bg-[#3E6B64]/10 flex items-center justify-center">
            <PartyPopper className="w-8 h-8 text-[#3E6B64]" />
          </div>
          <h1 className="text-2xl" style={fraunces}>
            Session complete
          </h1>
          <p className="text-[#6B6862] dark:text-[#A7A399] max-w-[280px]">
            All {total} items were processed{dirName ? ` and saved to “${dirName}”` : ""}. Thank
            you for your help building the dataset.
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-[#3E6B64] font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {savedCount} recorded · {logRows.filter((r) => r.status === "skipped").length} skipped
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col">
          <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] px-6 py-10 sm:py-12 flex flex-col items-center justify-center text-center shadow-sm min-h-[180px]">
            <span className="text-xs font-medium uppercase tracking-widest text-[#9A968D] mb-4">
              Say this out loud
            </span>
            <p className="text-[28px] sm:text-[32px] leading-snug" style={fraunces}>
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
            <RecordButton status={status} onStart={start} onStop={stop} disabled={saving} />

            {status === "recording" && <WaveformMeter levels={levels} active />}

            {status === "idle" && (
              <p className="text-sm text-[#6B6862] dark:text-[#A7A399]">
                Tap the mic (or press Space) to start recording
              </p>
            )}
            {status === "recording" && (
              <p className="text-sm text-[#C1604A] font-medium tabular-nums">
                {formatTime(elapsed)}
              </p>
            )}
            {(status === "recorded" || saving) && audioURL && (
              <div className="w-full flex flex-col items-center gap-1">
                <audio src={audioURL} controls className="w-full max-w-[320px] h-11 rounded-full" />
                <span
                  className="text-xs text-[#9A968D] mt-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  will save as {filename}
                  {dirName ? ` in “${dirName}”` : ""}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pb-2">
            {status === "recorded" && !saving && (
              <>
                <button onClick={saveAndNext} className={primaryBtn}>
                  Save &amp; next (Enter)
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={reset} className={secondaryBtn}>
                  <RotateCcw className="w-5 h-5" />
                  Re-record
                </button>
              </>
            )}
            {saving && (
              <button disabled className="h-14 w-full rounded-full bg-[#3E6B64]/70 text-white text-base font-semibold flex items-center justify-center gap-2">
                Saving…
              </button>
            )}
            {status === "idle" && !saving && (
              <button onClick={skipItem} className={secondaryBtn}>
                <SkipForward className="w-5 h-5" />
                Skip this item
              </button>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

const fraunces = { fontFamily: "'Fraunces', serif", fontWeight: 500 };
const primaryBtn =
  "h-14 w-full rounded-full bg-[#3E6B64] hover:bg-[#345650] active:bg-[#2C4A45] text-white text-base font-semibold flex items-center justify-center gap-2 transition-colors";
const secondaryBtn =
  "h-14 w-full rounded-full bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] hover:bg-[#F1EEE7] dark:hover:bg-[#2A2822] text-[#262624] dark:text-[#EDEAE2] text-base font-medium flex items-center justify-center gap-2 transition-colors";

function CenteredCard({ children }) {
  return (
    <div className="w-full max-w-[420px] mx-auto px-5 py-16 flex flex-col items-center text-center min-h-[calc(100vh-56px)] justify-center">
      {children}
    </div>
  );
}
