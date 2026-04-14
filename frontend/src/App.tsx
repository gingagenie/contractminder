import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import OAuthCallback from "@/pages/OAuthCallback";
import Dashboard from "@/pages/Dashboard";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const id = localStorage.getItem("jobberAccountId");
  return id ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
    </Routes>
  );
}
