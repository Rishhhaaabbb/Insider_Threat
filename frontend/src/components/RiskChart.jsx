// src/components/RiskChart.jsx
import { motion } from "framer-motion";
import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export default function RiskChart({ summary, dark=false }) {
  // transform summary.by_risk -> [{name:"Low", value:3}, ...]
  const data = useMemo(() => {
    const src = summary?.by_risk || {};
    const order = ["Low","Moderate","High","Critical"];
    return order
      .filter(k => src[k] !== undefined)
      .map(k => ({ name: k, value: src[k] }));
  }, [summary]);

  const colors = {
    Low: dark ? "#34d399" : "#10b981",
    Moderate: "#f59e0b",
    High: "#f97316",
    Critical: "#ef4444",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
        }}

      transition={{ duration: 0.8 }}
      className={`rounded-2xl border ${dark ? "bg-[#1E293B] border-gray-700" : "bg-white"} p-4 shadow-md`}
    >

      <div className={`text-lg font-semibold mb-2 ${dark ? "text-gray-100" : "text-gray-800"}`}>
        Risk Distribution
      </div>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} barCategoryGap={30}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#e5e7eb"} />
            <XAxis dataKey="name" stroke={dark ? "#cbd5e1" : "#374151"} />
            <YAxis allowDecimals={false} stroke={dark ? "#cbd5e1" : "#374151"} />
            <Tooltip
                cursor={{ fill: dark ? "rgba(51,65,85,0.25)" : "rgba(0,0,0,0.05)" }}
                contentStyle={{
                    background: dark ? "#1E293B" : "#fff",
                    border: `1px solid ${dark ? "#475569" : "#e5e7eb"}`,
                    color: dark ? "#F8FAFC" : "#111827",
                    borderRadius: 10,
                    fontSize: "0.9rem",
                    padding: "8px 12px",
                    boxShadow: dark
                    ? "0 2px 12px rgba(0,0,0,0.4)"
                    : "0 2px 8px rgba(0,0,0,0.1)",
                }}
                itemStyle={{
                    color: dark ? "#F8FAFC" : "#111827",
                    fontWeight: 500,
                }}
                labelStyle={{
                    color: dark ? "#93C5FD" : "#2563EB",
                    fontWeight: 600,
                }}
            />

            <Bar dataKey="value" radius={[8,8,0,0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={colors[entry.name] || "#64748b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
