import { Mic, Square } from "lucide-react";

export default function RecordButton({ status, onStart, onStop, disabled }) {
  const isRecording = status === "recording";

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-full bg-[#C1604A]/15 animate-breathe" />
          <span
            className="absolute inset-0 rounded-full bg-[#C1604A]/10 animate-breathe"
            style={{ animationDelay: "1.2s" }}
          />
        </>
      )}
      <button
        onClick={isRecording ? onStop : onStart}
        disabled={disabled || status === "recorded"}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3E6B64]/30
          ${
            isRecording
              ? "bg-[#C1604A] hover:bg-[#AD523E]"
              : status === "recorded"
              ? "bg-[#E3DFD6] dark:bg-[#3A382F] cursor-default"
              : "bg-[#3E6B64] hover:bg-[#345650]"
          }
          ${disabled ? "opacity-60 cursor-not-allowed" : ""}
        `}
      >
        {isRecording ? (
          <Square className="w-7 h-7 text-white" fill="white" />
        ) : (
          <Mic
            className={`w-8 h-8 ${
              status === "recorded" ? "text-[#9A968D]" : "text-white"
            }`}
          />
        )}
      </button>
    </div>
  );
}
