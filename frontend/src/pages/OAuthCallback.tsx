import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hashSearch = window.location.hash.includes("?")
      ? window.location.hash.slice(window.location.hash.indexOf("?"))
      : "";
    const params = new URLSearchParams(hashSearch);
    const jobberAccountId = params.get("jobberAccountId");

    if (!jobberAccountId) {
      navigate("/?error=missing_account_id");
      return;
    }

    localStorage.setItem("jobberAccountId", jobberAccountId);
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Connecting to Jobber…</p>
    </div>
  );
}
