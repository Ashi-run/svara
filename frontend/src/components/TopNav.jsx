import { Mic2, UserRound, Stethoscope, Sun, Moon } from "lucide-react";

const TABS = [
  { id: "collect", label: "Data Collection", icon: Mic2 },
  { id: "patient", label: "Patient App", icon: UserRound },
  { id: "clinician", label: "Clinician View", icon: Stethoscope },
];

export default function TopNav({ active, onChange, dark, onToggleDark }) {
  return (
    <div className="w-full border-b border-[#E3DFD6] dark:border-[#3A382F] bg-white/70 dark:bg-[#22201C]/70 backdrop-blur">
      <div className="max-w-[960px] mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 h-10 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[#3E6B64] text-white"
                    : "text-[#6B6862] dark:text-[#A7A399] hover:bg-[#E3DFD6]/60 dark:hover:bg-[#3A382F]/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onToggleDark}
          aria-label="Toggle dark mode"
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[#6B6862] dark:text-[#A7A399] hover:bg-[#E3DFD6]/60 dark:hover:bg-[#3A382F]/60 transition-colors"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
