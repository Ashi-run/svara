import { ShieldCheck } from "lucide-react";

export default function ConsentScreen({ onAccept }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F7F5F1] dark:bg-[#1C1B18] text-[#262624] dark:text-[#EDEAE2] px-5">
      <div className="w-full max-w-[420px] flex flex-col items-center text-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#3E6B64]/10 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-[#3E6B64]" />
        </div>
        <h1
          className="text-2xl"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
        >
          Before we start
        </h1>
        <p className="text-[#6B6862] dark:text-[#A7A399] leading-relaxed">
          This app records your voice to help build personalized speech tools. Recordings are
          stored only on this device (or the folder you choose) unless you're connected to a
          clinician's account. You can stop at any time, and nothing is shared without your
          consent.
        </p>
        <button
          onClick={onAccept}
          className="h-14 w-full rounded-full bg-[#3E6B64] hover:bg-[#345650] active:bg-[#2C4A45] text-white text-base font-semibold transition-colors"
        >
          I understand, continue
        </button>
      </div>
    </div>
  );
}
