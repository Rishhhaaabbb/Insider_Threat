// src/components/ExplainabilityCard.jsx
import { motion } from "framer-motion";
import { BarChart2 } from "lucide-react";

export default function ExplainabilityCard({ dark }) {
  const data = [
    { feature: "Off-hour logins", value: 0.85 },
    { feature: "Decoy file access", value: 0.75 },
    { feature: "USB activity", value: 0.62 },
    { feature: "Failed logins", value: 0.50 },
    { feature: "Session duration", value: 0.35 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
        }}

      transition={{ duration: 0.8 }}
      className={`rounded-2xl border ${
        dark ? "bg-[#1E293B] border-gray-700" : "bg-white"
      } p-5 shadow-md`}
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart2
          className={`w-5 h-5 ${
            dark ? "text-indigo-400" : "text-indigo-600"
          }`}
        />
        <h2
          className={`font-semibold text-lg ${
            dark ? "text-gray-100" : "text-gray-800"
          }`}
        >
          Explainability Preview
        </h2>
      </div>

      <div className="space-y-2">
        {data.map((d) => (
          <div
            key={d.feature}
            className={`flex items-center justify-between text-sm ${
              dark ? "text-gray-200" : "text-gray-800"
            }`}
          >
            <span>{d.feature}</span>
            <div className="w-40 h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full ${
                  dark ? "bg-indigo-400" : "bg-indigo-600"
                }`}
                style={{ width: `${d.value * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
