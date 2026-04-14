import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Zap } from "lucide-react";

// ---------- Types ----------

interface Suggestion {
  jobberClientId: string;
  clientName: string;
  jobTitle: string;
  detectedFrequency: string;
  lastJobDate: string;
  suggestedRenewalDate: string;
  confidence: "high" | "medium" | "low";
  jobCount: number;
}

interface Contract {
  id: string;
  jobberClientId: string;
  clientName: string;
  title: string;
  frequency: string;
  lastJobDate: string | null;
  nextRenewalDate: string | null;
  contractValue: string | null;
  confirmedAt: string;
  renewalStatus: "ok" | "due" | "overdue";
}

// ---------- Helpers ----------

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const statusConfig = {
  ok: { label: "OK", pill: "bg-green-100 text-green-700", border: "border-l-green-500" },
  due: { label: "Due Soon", pill: "bg-amber-100 text-amber-700", border: "border-l-amber-500" },
  overdue: { label: "Overdue", pill: "bg-red-100 text-red-700", border: "border-l-red-500" },
};

const confidenceConfig = {
  high: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-500",
};

// ---------- Section header ----------

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-4">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <span className="text-sm text-slate-400">{count}</span>
    </div>
  );
}

// ---------- Dashboard ----------

export default function Dashboard() {
  const navigate = useNavigate();
  const accountId = localStorage.getItem("jobberAccountId") ?? "";

  const [accountName, setAccountName] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [renewingIds, setRenewingIds] = useState<Set<string>>(new Set());
  const [renewingAll, setRenewingAll] = useState(false);

  const enc = encodeURIComponent(accountId);

  const fetchDashboard = useCallback(async () => {
    try {
      const [meRes, suggestRes, contractsRes] = await Promise.all([
        fetch(`${API}/api/me?jobberAccountId=${enc}`),
        fetch(`${API}/api/detect-contracts?jobberAccountId=${enc}`),
        fetch(`${API}/api/contracts?jobberAccountId=${enc}`),
      ]);
      const me = await meRes.json() as { name?: string };
      setAccountName(me.name ?? "");
      setSuggestions(await suggestRes.json() as Suggestion[]);
      setContracts(await contractsRes.json() as Contract[]);
    } finally {
      setLoading(false);
    }
  }, [enc]);

  useEffect(() => {
    if (!accountId) { navigate("/"); return; }
    void fetchDashboard();
  }, [accountId, navigate, fetchDashboard]);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch(`${API}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobberAccountId: accountId }),
      });
      await fetchDashboard();
    } finally {
      setSyncing(false);
    }
  }

  async function handleConfirm(s: Suggestion) {
    const key = `${s.jobberClientId}|||${s.jobTitle}`;
    setConfirmingIds((p) => new Set(p).add(key));
    try {
      await fetch(`${API}/api/contracts/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobberAccountId: accountId,
          contracts: [s],
        }),
      });
      await fetchDashboard();
    } finally {
      setConfirmingIds((p) => { const n = new Set(p); n.delete(key); return n; });
    }
  }

  async function handleDismiss(s: Suggestion) {
    const key = `${s.jobberClientId}|||${s.jobTitle}`;
    setDismissingIds((p) => new Set(p).add(key));
    try {
      await fetch(`${API}/api/contracts/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobberAccountId: accountId,
          jobberClientId: s.jobberClientId,
          jobTitle: s.jobTitle,
        }),
      });
      await fetchDashboard();
    } finally {
      setDismissingIds((p) => { const n = new Set(p); n.delete(key); return n; });
    }
  }

  async function handleRenew(contractId: string) {
    setRenewingIds((p) => new Set(p).add(contractId));
    try {
      await fetch(`${API}/api/contracts/${contractId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobberAccountId: accountId }),
      });
      await fetchDashboard();
    } finally {
      setRenewingIds((p) => { const n = new Set(p); n.delete(contractId); return n; });
    }
  }

  async function handleRenewAll() {
    setRenewingAll(true);
    try {
      await fetch(`${API}/api/contracts/renew-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobberAccountId: accountId }),
      });
      await fetchDashboard();
    } finally {
      setRenewingAll(false);
    }
  }

  const dueContracts = contracts.filter((c) => c.renewalStatus !== "ok");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", backgroundColor: "#f8fafc" }} className="min-h-screen">

      {/* Header */}
      <header style={{ backgroundColor: "#1e293b" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-white font-semibold text-lg tracking-tight">ContractMinder</span>
          <div className="flex items-center gap-3">
            {accountName && (
              <span className="text-slate-400 text-sm">{accountName}</span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Jobber"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* Renew All banner */}
        {dueContracts.length > 0 && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                {dueContracts.length} contract{dueContracts.length > 1 ? "s" : ""} due or overdue
              </p>
              <p className="text-amber-700 text-xs mt-0.5">Renew them all with one click</p>
            </div>
            <Button
              onClick={handleRenewAll}
              disabled={renewingAll}
              className="bg-amber-500 hover:bg-amber-600 text-white border-0"
            >
              <Zap className="h-4 w-4" />
              {renewingAll ? "Renewing…" : "Renew All Due"}
            </Button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <section>
            <SectionHeader title="Suggested Contracts" count={suggestions.length} />
            <p className="text-sm text-slate-500 mb-4">
              ContractMinder detected these recurring patterns in your Jobber job history. Confirm the ones that are real contracts.
            </p>
            <div className="grid gap-3">
              {suggestions.map((s) => {
                const key = `${s.jobberClientId}|||${s.jobTitle}`;
                return (
                  <Card key={key} className="border-l-4 border-l-slate-300">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-slate-800">{s.clientName}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceConfig[s.confidence]}`}>
                              {capitalize(s.confidence)} confidence
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{capitalize(s.jobTitle)}</p>
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span>Frequency: <strong className="text-slate-700">{capitalize(s.detectedFrequency)}</strong></span>
                            <span>Jobs found: <strong className="text-slate-700">{s.jobCount}</strong></span>
                            <span>Suggested renewal: <strong className="text-slate-700">{formatDate(s.suggestedRenewalDate)}</strong></span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismiss(s)}
                            disabled={dismissingIds.has(key)}
                          >
                            {dismissingIds.has(key) ? "Dismissing…" : "Dismiss"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(s)}
                            disabled={confirmingIds.has(key)}
                            style={{ backgroundColor: "#1e293b" }}
                          >
                            {confirmingIds.has(key) ? "Confirming…" : "Confirm"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Contracts */}
        <section>
          <SectionHeader title="Active Contracts" count={contracts.length} />
          {contracts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No confirmed contracts yet. Confirm suggestions above or sync your Jobber data.
            </div>
          ) : (
            <div className="grid gap-3">
              {contracts.map((c) => {
                const sc = statusConfig[c.renewalStatus];
                return (
                  <Card key={c.id} className={`border-l-4 ${sc.border}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-slate-800">{c.clientName}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.pill}`}>
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{capitalize(c.title)}</p>
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span>Frequency: <strong className="text-slate-700">{capitalize(c.frequency)}</strong></span>
                            <span>Last job: <strong className="text-slate-700">{formatDate(c.lastJobDate)}</strong></span>
                            <span>Next renewal: <strong className="text-slate-700">{formatDate(c.nextRenewalDate)}</strong></span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRenew(c.id)}
                          disabled={renewingIds.has(c.id)}
                          style={{ backgroundColor: "#1e293b" }}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {renewingIds.has(c.id) ? "Renewing…" : "Renew"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
