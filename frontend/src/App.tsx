import { Routes, Route, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

function ConnectPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">ContractMinder</h1>
        <p className="text-gray-600">Contract renewal automation for Jobber</p>
        <a
          href="/auth/jobber/connect"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Connect Jobber
        </a>
      </div>
    </div>
  );
}

function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const jobberAccountId = params.get("jobberAccountId");
  const [account, setAccount] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobberAccountId) return;
    fetch(`/api/me?jobberAccountId=${encodeURIComponent(jobberAccountId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setAccount(data as { id: string; name: string });
      })
      .catch((e: unknown) => setError(String(e)));
  }, [jobberAccountId]);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!account) return <div className="p-8 text-gray-500">Connecting…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Connected!</h2>
        <p className="text-gray-600">Account: <strong>{account.name}</strong></p>
        <p className="text-xs text-gray-400">{account.id}</p>
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-gray-600 mt-2">Contract renewal dashboard — coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ConnectPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}
