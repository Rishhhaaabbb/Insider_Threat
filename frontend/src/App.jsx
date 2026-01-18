import RiskChart from "./components/RiskChart";
import ExplainabilityCard from "./components/ExplainabilityCard";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Shield, Activity, AlertTriangle, Bell, X, FileText, RefreshCcw } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000",
});

// Small UI atoms
const RiskBadge = ({ level }) => {
  const styles = {
    Critical: "bg-red-500",
    High: "bg-orange-500",
    Moderate: "bg-yellow-400 text-gray-900",
    Low: "bg-emerald-500",
  };
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded-full text-white ${styles[level] || "bg-gray-500"}`}>
      {level || "Unknown"}
    </span>
  );
};

const Card = ({ title, value, icon, gradient = "from-indigo-500 to-indigo-400" }) => (
  <motion.div
    initial={{ opacity: 0, y: 25 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    whileHover={{
      scale: 1.05,
      boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
    }}
    className={`p-5 rounded-2xl shadow-lg bg-gradient-to-br ${gradient} text-white flex items-center justify-between cursor-pointer transition-all duration-300`}
  >

    <div>
      <div className="text-sm opacity-90 font-medium">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
    <div className="opacity-90">{icon}</div>
  </motion.div>
);

// Modal
const Modal = ({ open, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} // closes when background clicked
        >
          <motion.div
            className="w-full max-w-3xl bg-white rounded-2xl shadow-xl"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            onClick={(e) => e.stopPropagation()} // prevents accidental close when clicking inside
          >
            <div className="flex items-center justify-between border-b px-5 py-3 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


export default function App() {
  const [summary, setSummary] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [explain, setExplain] = useState(null);
  const [report, setReport] = useState(null);
  const [alerts, setAlerts] = useState({ critical_count: 0, users: [] });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);


  // Fetch summary + incidents
  const loadData = async () => {
    try {
      setLoading(true);
      const [s, i] = await Promise.all([api.get("/api/summary"), api.get("/api/incidents")]);
      setSummary(s.data || null);
      setIncidents(i.data?.incidents || []);
      toast.success("Data refreshed successfully");
    } catch (e) {
      toast.error("Failed to load data from backend");
    } finally {
      setLoading(false);
    }
  };

  // Poll alerts every 5s
  useEffect(() => {
    loadData();
    const t = setInterval(async () => {
      try {
        const r = await api.get("/api/alerts/scan");
        setAlerts(r.data);
      } catch {
        /* silent */
      }
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Select a user: fetch full details incl. explainability
  const viewUser = async (user_id) => {
    try {
      setSelected(null);
      setExplain(null);
      const { data } = await api.get(`/api/user/${user_id}`);
      setSelected(data);
      setExplain(data.explain || null);
    } catch {
      setError("Failed to load user details.");
    }
  };

  // Load AI report
  const viewReport = async (user_id) => {
    try {
      setReport(null);
      const { data } = await api.get(`/api/report/${user_id}`);
      setReport(data);
    } catch {
      setReport({ text: "No report found." });
    }
  };

  const byRisk = useMemo(() => summary?.by_risk || {}, [summary]);

  const filteredIncidents = incidents.filter(x =>
  x.user_id.toLowerCase().includes(search.toLowerCase())
);


  return (
  <div
    className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${
      dark
        ? "dark bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1120] text-gray-100"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900"
    }`}
  >
    {/* Animated background glow */}
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 0.35,
        background:
          dark
            ? "radial-gradient(800px at 20% 30%, rgba(99,102,241,0.2), transparent 70%), radial-gradient(600px at 80% 70%, rgba(236,72,153,0.15), transparent 70%)"
            : "radial-gradient(800px at 20% 30%, rgba(99,102,241,0.08), transparent 70%), radial-gradient(600px at 80% 70%, rgba(236,72,153,0.08), transparent 70%)",
      }}
      transition={{ duration: 2, ease: "easeInOut" }}
    />


      <Toaster position="top-right" />
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/70 dark:bg-[#0F172A]/70 shadow-md rounded-b-2xl"
      >
        <div className="flex items-center gap-3 text-gray-800 dark:text-gray-100">

          <Shield className="w-6 h-6 text-indigo-500 drop-shadow-[0_0_6px_rgba(99,102,241,0.8)] transition-all duration-300" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100 ml-2">
            Insider Threat Dashboard
          </h1>

        </div>
        <div className="flex items-center gap-3 text-gray-800 dark:text-gray-100">

          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            title="Refresh data"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
          <button
            onClick={() => setDark(!dark)}
            className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        
          <AnimatePresence>
            {alerts.critical_count > 0 ? (
              <motion.div
                key="critical"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: [1, 1.1, 1],
                  boxShadow: "0 0 12px rgba(239,68,68,0.8)",
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-red-500 text-white border border-red-600 shadow-lg"
              >
                <Bell size={16} className="animate-pulse" />
                {`Critical: ${alerts.critical_count} (${alerts.users.join(", ")})`}
              </motion.div>
            ) : (
              <motion.div
                key="safe"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                <Bell size={16} />
                No critical alerts
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.header>

      {/* Summary cards */}
      <main className="px-6 pb-10">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
          className="grid gap-5 md:grid-cols-3"
        >
          <Card title="Total Records" value={summary?.total ?? 0} icon={<Activity />} />
          {Object.entries(byRisk).map(([risk, count]) => (
            <Card
              key={risk}
              title={risk}
              value={count}
              icon={<AlertTriangle />}
              gradient={
                risk === "Critical"
                  ? "from-red-500 to-red-400"
                  : risk === "High"
                  ? "from-orange-500 to-orange-400"
                  : risk === "Moderate"
                  ? "from-yellow-400 to-amber-300"
                  : "from-emerald-500 to-emerald-400"
              }
            />
          ))}
        </motion.div>

        {/* Charts row */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RiskChart summary={summary} dark={dark} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ExplainabilityCard dark={dark} />
            {/* Reserved for future: User Behavior Trends */}
          </div>

          {/* Optional: keep space for another chart later */}
          <div className="hidden lg:block">
            {/* placeholder for Alert Trend or SHAP preview */}
          </div>
        </div>

        {/* Body grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="border-b px-5 py-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Incidents (High/Critical)</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user..."
              className="text-sm border rounded-lg px-3 py-1 outline-none focus:ring-1 focus:ring-indigo-500 
                        bg-white dark:bg-[#1E293B] text-gray-900 dark:text-gray-100 
                        placeholder-gray-500 dark:placeholder-gray-400"
            />

          </div>

          {/* Incidents list */}
          <section className="lg:col-span-1 rounded-2xl border bg-white dark:bg-darkcard border-gray-200 dark:border-darkbordershadow-sm">
            <div className="border-b px-5 py-3">
              <h2 className="text-lg font-semibold">Incidents (High/Critical)</h2>
              <p className="text-xs text-gray-500">Click a user to view details & AI report.</p>
            </div>



            <div className="max-h-[70vh] overflow-auto p-3 space-y-3">

              {loading ? (
                <div className="text-sm text-gray-500 px-2">Loading incidents…</div>
              ) : filteredIncidents.length === 0 ? (
                <div className="text-sm text-gray-500 px-2">No matching incidents.</div>
              ) : (
                filteredIncidents.map((x) => (
                  <motion.div
                    key={`${x.user_id}-${x.anomaly_score}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    whileHover={{
                      scale: 1.03,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                    }}
                    className="rounded-xl border px-4 py-3 bg-white dark:bg-darkcard dark:border-darkborder cursor-pointer transition-all"
                  >

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{x.user_id}</div>
                        <div className="text-xs text-gray-500">score: {Number(x.anomaly_score).toFixed(3)}</div>
                      </div>
                      <RiskBadge level={x.risk_level} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => viewUser(x.user_id)}
                        className="text-xs rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => viewReport(x.user_id)}
                        className="text-xs inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                      >
                        <FileText size={14} /> AI Report
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Details + Explainability */}
          <section className="lg:col-span-2 rounded-2xl border bg-gray-50 dark:bg-[#1E293B] dark:border-gray-700 shadow-md transition-colors">
            <div className="border-b px-5 py-3">
              <h2 className="text-lg font-semibold">User Details & Explainability</h2>
            </div>

            {!selected ? (
              <div className="p-6 text-sm text-gray-500">Select an incident from the left.</div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-[#1E293B] px-4 py-2 rounded-md">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selected.user_id}</div>
                <RiskBadge level={selected.risk_level} />
                <div className="text-xs text-gray-700 dark:text-gray-300 ml-auto">
                  anomaly_score: {Number(selected.anomaly_score).toFixed(3)}
                </div>
              </div>


                {/* Signals */}
                <div>
                  <div className="text-sm font-semibold mb-2">Signals</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <KV k="Off-hour logins" v={selected.off_hour_login_count} />
                    <KV k="USB activity" v={selected.usb_activity_score} />
                    <KV k="File access freq" v={selected.file_access_freq} />
                    <KV k="Decoy flag" v={selected.decoy_access_flag} />
                    <KV k="Failed logins" v={selected.failed_logins} />
                    <KV k="Session duration" v={selected.session_duration} />
                  </div>
                </div>

                {/* Explainability */}
                <div>
                  <div className="text-sm font-semibold mb-2">
                    Top Contributors {explain?.mode ? `(${explain.mode})` : ""}
                  </div>
                  {!explain ? (
                    <div className="text-sm text-gray-500">Loading explainability…</div>
                  ) : explain.top_contributors?.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {explain.top_contributors.map((t) => (
                        <div key={t.feature} className="rounded-lg border px-3 py-2 flex items-center justify-between">
                          <span className="text-sm">{t.feature}</span>
                          <span className={`text-xs font-mono ${Number(t.value) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {Number(t.value).toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No explainability available.</div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* AI Report Modal */}
      <Modal
        open={!!report}
        onClose={() => setReport(null)}
        title={report?.user_id ? `AI Report — ${report.user_id}` : "AI Report"}
      >
        <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {report?.text || "No report found."}
        </pre>
      </Modal>
    </div>
  );
}

const KV = ({ k, v }) => (
  <div className="rounded-lg border px-3 py-2 bg-gray-100 dark:bg-[#2C384C] flex items-center justify-between">
    <span className="text-xs text-gray-600 dark:text-gray-300">{k}</span>
    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{String(v)}</span>

  </div>
);
