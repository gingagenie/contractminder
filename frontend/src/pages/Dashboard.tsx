import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Zap, ChevronDown, ChevronUp } from "lucide-react";

// ---------- Types ----------

interface Suggestion {
  jobberClientId: string;
  clientName: string;
  jobTitle: string;
  propertyAddress: string;
  detectedFrequency: string;
  lastJobDate: string;
  suggestedRenewalDate: string;
  confidence: "high" | "medium" | "low";
  jobCount: number;
}

interface LineItem {
  name: string;
  quantity: string;
  unitPrice: string;
}

interface CustomField {
  label: string;
  value: string;
}

interface Contract {
  id: string;
  jobberClientId: string;
  clientName: string;
  title: string;
  propertyAddress: string;
  frequency: string;
  lastJobDate: string | null;
  nextRenewalDate: string | null;
  contractValue: string | null;
  confirmedAt: string;
  renewalStatus: "ok" | "due" | "overdue";
  timesRenewed: number;
  daysUntilRenewal: number | null;
  lineItems: LineItem[];
  totalPrice: string | null;
  notes: string | null;
  customFields: CustomField[];
}

// ---------- Helpers ----------

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatCurrency(value: string | null) {
  if (!value) return null;
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function countdownLabel(days: number | null): string {
  if (days === null) return "—";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d`;
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

// ---------- Contract card ----------

function ContractCard({
  c,
  renewing,
  onRenew,
}: {
  c: Contract;
  renewing: boolean;
  onRenew: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sc = statusConfig[c.renewalStatus];
  const price = formatCurrency(c.totalPrice ?? c.contractValue);
  const countdownDays = c.daysUntilRenewal;
  const lineItems = c.lineItems ?? [];
  const customFields = c.customFields ?? [];
  const hasDetail = lineItems.length > 0 || !!c.notes || customFields.length > 0;

  return (
    <Card
      className={`border-l-4 ${sc.border} select-none`}
      style={{ cursor: "pointer" }}
      onClick={() => {
        console.log("card clicked", c.id, { hasDetail, lineItems: lineItems.length, notes: c.notes, customFields: customFields.length });
        setExpanded((v) => !v);
      }}
    >
      <CardContent className="pt-4 pb-4">

        {/* Name / status / renew row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="font-semibold text-slate-800">{c.clientName}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.pill}`}>
                {sc.label}
              </span>
            </div>
            <p className="text-sm text-slate-600">{capitalize(c.title)}</p>
            {c.propertyAddress && (
              <p className="text-xs text-slate-400 mt-0.5">{c.propertyAddress}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasDetail && (
              <span className="text-slate-400">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            )}
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onRenew(); }}
              disabled={renewing}
              style={{ backgroundColor: "#1e293b" }}
            >
              <Zap className="h-3.5 w-3.5" />
              {renewing ? "Renewing…" : "Renew"}
            </Button>
          </div>
        </div>

          {/* Stats row */}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
            <span>
              Frequency: <strong className="text-slate-700">{capitalize(c.frequency)}</strong>
            </span>
            {price && (
              <span>
                Agreed price: <strong className="text-slate-700">{price}</strong>
              </span>
            )}
            <span>
              Next renewal: <strong className="text-slate-700">{formatDate(c.nextRenewalDate)}</strong>
            </span>
            <span>
              In:{" "}
              <strong className={
                countdownDays !== null && countdownDays < 0 ? "text-red-600" :
                countdownDays !== null && countdownDays <= 30 ? "text-amber-600" :
                "text-slate-700"
              }>
                {countdownLabel(countdownDays)}
              </strong>
            </span>
            <span>
              Renewed: <strong className="text-slate-700">{c.timesRenewed}×</strong>
            </span>
            <span>
              Last job: <strong className="text-slate-700">{formatDate(c.lastJobDate)}</strong>
            </span>
          </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 space-y-3">
            {/* Line items */}
            {lineItems.length > 0 && (
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="text-left px-3 py-1.5 font-medium">Item</th>
                      <th className="text-right px-3 py-1.5 font-medium">Qty</th>
                      <th className="text-right px-3 py-1.5 font-medium">Unit price</th>
                      <th className="text-right px-3 py-1.5 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, i) => {
                      const lineTotal = parseFloat(li.quantity) * parseFloat(li.unitPrice);
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 text-slate-700">{li.name}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{li.quantity}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">
                            {formatCurrency(li.unitPrice)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium text-slate-700">
                            {formatCurrency(String(lineTotal))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notes */}
            {c.notes && (
              <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 leading-relaxed">
                <span className="font-medium text-slate-500 uppercase tracking-wide text-[10px]">Notes / Terms</span>
                <p className="mt-1 whitespace-pre-wrap">{c.notes}</p>
              </div>
            )}

            {/* Custom fields */}
            {customFields.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {customFields.map((cf, i) => (
                  <span key={i}>
                    {cf.label}: <strong className="text-slate-700">{cf.value}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
  const [disconnecting, setDisconnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [renewingIds, setRenewingIds] = useState<Set<string>>(new Set());
  const [renewingAll, setRenewingAll] = useState(false);
  const [renewAllMessage, setRenewAllMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

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

  async function handleDisconnect() {
    if (!window.confirm("Disconnect ContractMinder from Jobber? This will delete all synced data and revoke access. This cannot be undone.")) return;
    setDisconnecting(true);
    try {
      await fetch(`${API}/api/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobberAccountId: accountId }),
      });
    } finally {
      localStorage.removeItem("jobberAccountId");
      navigate("/");
    }
  }

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
    const key = `${s.jobberClientId}|||${s.jobTitle}|||${s.propertyAddress}`;
    setConfirmingIds((p) => new Set(p).add(key));
    try {
      await fetch(`${API}/api/contracts/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobberAccountId: accountId, contracts: [s] }),
      });
      await fetchDashboard();
    } finally {
      setConfirmingIds((p) => { const n = new Set(p); n.delete(key); return n; });
    }
  }

  async function handleDismiss(s: Suggestion) {
    const key = `${s.jobberClientId}|||${s.jobTitle}|||${s.propertyAddress}`;
    setDismissingIds((p) => new Set(p).add(key));
    try {
      await fetch(`${API}/api/contracts/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobberAccountId: accountId,
          jobberClientId: s.jobberClientId,
          jobTitle: s.jobTitle,
          propertyAddress: s.propertyAddress,
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
    setRenewAllMessage(null);
    try {
      const res = await fetch(`${API}/api/contracts/renew-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobberAccountId: accountId }),
      });
      const data = await res.json() as {
        renewed?: number;
        failed?: number;
        jobs?: { error?: string; clientName?: string }[];
        message?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        setRenewAllMessage({ type: "error", text: data.error ?? "Renewal failed" });
      } else if ((data.renewed ?? 0) === 0 && (data.failed ?? 0) === 0) {
        setRenewAllMessage({ type: "info", text: data.message ?? "No contracts are currently due" });
      } else if (data.failed && data.failed > 0) {
        const failedNames = data.jobs?.filter(j => j.error).map(j => j.clientName).filter(Boolean).join(", ");
        setRenewAllMessage({
          type: "error",
          text: `${data.renewed} renewed, ${data.failed} failed${failedNames ? `: ${failedNames}` : ""}`,
        });
      } else {
        setRenewAllMessage({
          type: "success",
          text: `${data.renewed} contract${(data.renewed ?? 0) !== 1 ? "s" : ""} renewed successfully`,
        });
      }

      await fetchDashboard();
    } catch (err) {
      setRenewAllMessage({ type: "error", text: String(err) });
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
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* Bulk renew — always visible */}
        <div className={`flex items-center justify-between rounded-xl px-5 py-4 border ${
          dueContracts.length > 0
            ? "bg-amber-50 border-amber-200"
            : "bg-slate-50 border-slate-200"
        }`}>
          <div>
            {dueContracts.length > 0 ? (
              <>
                <p className="font-semibold text-amber-900 text-sm">
                  {dueContracts.length} contract{dueContracts.length > 1 ? "s" : ""} due or overdue
                </p>
                <p className="text-amber-700 text-xs mt-0.5">Renew them all with one click</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-600 text-sm">All contracts are up to date</p>
                <p className="text-slate-400 text-xs mt-0.5">No renewals due in the next 30 days</p>
              </>
            )}
          </div>
          <Button
            onClick={handleRenewAll}
            disabled={renewingAll || dueContracts.length === 0}
            className={dueContracts.length > 0
              ? "bg-amber-500 hover:bg-amber-600 text-white border-0"
              : "bg-slate-200 text-slate-400 border-0 cursor-not-allowed"
            }
          >
            <Zap className="h-4 w-4" />
            {renewingAll ? "Renewing…" : "Renew All Due"}
          </Button>
        </div>

        {/* Renew-all result message */}
        {renewAllMessage && (
          <div className={`rounded-xl px-5 py-3 text-sm font-medium border ${
            renewAllMessage.type === "success" ? "bg-green-50 border-green-200 text-green-800" :
            renewAllMessage.type === "error"   ? "bg-red-50 border-red-200 text-red-800" :
                                                 "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
            {renewAllMessage.text}
            <button onClick={() => setRenewAllMessage(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
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
                const key = `${s.jobberClientId}|||${s.jobTitle}|||${s.propertyAddress}`;
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
                          <p className="text-sm text-slate-600">{capitalize(s.jobTitle)}</p>
                          {s.propertyAddress && (
                            <p className="text-xs text-slate-400 mt-0.5 mb-2">{s.propertyAddress}</p>
                          )}
                          {!s.propertyAddress && <div className="mb-2" />}
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

        {/* Active Contracts */}
        <section>
          <SectionHeader title="Active Contracts" count={contracts.length} />
          {contracts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No confirmed contracts yet. Confirm suggestions above or sync your Jobber data.
            </div>
          ) : (
            <div className="grid gap-3">
              {contracts.map((c) => (
                <ContractCard
                  key={c.id}
                  c={c}
                  renewing={renewingIds.has(c.id)}
                  onRenew={() => handleRenew(c.id)}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
