import React, { useEffect, useMemo, useState } from "react";
import { Stethoscope, Users, TrendingUp, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { getAllSessionHistory } from "../lib/db";

const fraunces = { fontFamily: "'Fraunces', serif", fontWeight: 500 };

export default function ClinicianView() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAllSessionHistory().then((data) => {
      if (!cancelled) setRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byPatient = useMemo(() => {
    if (!rows) return [];
    const map = new Map();
    for (const r of rows) {
      const key = r.patientId || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return Array.from(map.entries())
      .map(([patientId, entries]) => {
        const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
        const avg = Math.round(
          entries.reduce((s, e) => s + (e.accuracyPct || 0), 0) / entries.length
        );
        return {
          patientId,
          sessions: entries.length,
          avgAccuracy: avg,
          lastSeen: sorted[0]?.date,
        };
      })
      .sort((a, b) => a.avgAccuracy - b.avgAccuracy);
  }, [rows]);

  const phonemeFrequency = useMemo(() => {
    if (!rows) return [];
    const counts = new Map();
    for (const r of rows) {
      for (const p of r.erroredSounds || []) {
        counts.set(p, (counts.get(p) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([phoneme, count]) => ({ phoneme: `/${phoneme}/`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rows]);

  const totalSessions = rows?.length ?? 0;

  return (
    <div className="w-full max-w-[720px] mx-auto px-5 py-6 sm:py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#3E6B64]/10 flex items-center justify-center shrink-0">
          <Stethoscope className="w-5 h-5 text-[#3E6B64]" />
        </div>
        <div>
          <h1 className="text-xl" style={fraunces}>
            Clinician view
          </h1>
          <p className="text-sm text-[#6B6862] dark:text-[#A7A399]">
            Read-only summary across everyone who has used the Patient App on this device.
          </p>
        </div>
      </div>

      {rows === null ? (
        <p className="text-sm text-[#6B6862] dark:text-[#A7A399]">Loading…</p>
      ) : totalSessions === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] p-8 text-center">
          <Users className="w-8 h-8 text-[#9A968D] mx-auto mb-3" />
          <p className="text-[#6B6862] dark:text-[#A7A399]">
            No sessions yet. Once patients record and review in the Patient App tab, their
            results will summarize here automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total sessions" value={totalSessions} icon={TrendingUp} />
            <StatCard label="Patients tracked" value={byPatient.length} icon={Users} />
            <StatCard
              label="Needs attention"
              value={byPatient.filter((p) => p.avgAccuracy < 70).length}
              icon={AlertTriangle}
              tone="warn"
            />
          </div>

          <section className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] p-5">
            <h2 className="text-sm font-medium text-[#262624] dark:text-[#EDEAE2] mb-4">
              Patients
            </h2>
            <div className="flex flex-col divide-y divide-[#E3DFD6] dark:divide-[#3A382F]">
              {byPatient.map((p) => (
                <div key={p.patientId} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-[#262624] dark:text-[#EDEAE2] truncate">
                      {p.patientId}
                    </span>
                    <span className="text-xs text-[#9A968D]">
                      {p.sessions} session{p.sessions === 1 ? "" : "s"} ·{" "}
                      {p.lastSeen ? new Date(p.lastSeen).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div
                    className={`shrink-0 text-sm font-semibold tabular-nums px-3 py-1.5 rounded-full ${
                      p.avgAccuracy >= 80
                        ? "bg-[#3E6B64]/10 text-[#3E6B64]"
                        : p.avgAccuracy >= 60
                        ? "bg-[#F4A261]/20 text-[#8A5A2A]"
                        : "bg-[#FBEEEA] dark:bg-[#3A2A22] text-[#8A3E2A] dark:text-[#E9A88E]"
                    }`}
                  >
                    {p.avgAccuracy}%
                  </div>
                </div>
              ))}
            </div>
          </section>

          {phonemeFrequency.length > 0 && (
            <section className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] p-5">
              <h2 className="text-sm font-medium text-[#262624] dark:text-[#EDEAE2] mb-4">
                Most common error sounds across all patients
              </h2>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={phonemeFrequency} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3DFD6" />
                    <XAxis dataKey="phoneme" tick={{ fontSize: 12, fill: "#9A968D" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9A968D" }} />
                    <RTooltip
                      contentStyle={{ borderRadius: 10, border: "1px solid #E3DFD6", fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="#3E6B64" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#22201C] border border-[#E3DFD6] dark:border-[#3A382F] p-4 flex flex-col gap-2">
      <Icon className={`w-4 h-4 ${tone === "warn" ? "text-[#C1604A]" : "text-[#3E6B64]"}`} />
      <span className="text-2xl font-semibold tabular-nums text-[#262624] dark:text-[#EDEAE2]">
        {value}
      </span>
      <span className="text-xs text-[#9A968D]">{label}</span>
    </div>
  );
}
