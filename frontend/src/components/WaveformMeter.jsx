export default function WaveformMeter({ levels, active }) {
  return (
    <div
      className="flex items-end justify-center gap-[3px] h-12 w-full max-w-[280px]"
      aria-hidden="true"
    >
      {levels.map((lvl, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all duration-75 ${
            active ? "bg-[#C1604A]" : "bg-[#D8D3C8] dark:bg-[#4A473F]"
          }`}
          style={{ height: `${Math.max(8, lvl * 48)}px` }}
        />
      ))}
    </div>
  );
}
