import { API } from "@/lib/api";

const steps = [
  {
    number: "01",
    title: "Connect Jobber",
    body: "OAuth in seconds. We pull your clients and full job history automatically.",
  },
  {
    number: "02",
    title: "Review suggestions",
    body: "ContractMinder analyses your job patterns and surfaces clients on likely recurring contracts.",
  },
  {
    number: "03",
    title: "One-click renewal",
    body: "When renewal time comes, one click creates all the jobs in Jobber. No manual work.",
  },
];

const benefits = [
  {
    title: "Never miss a renewal again",
    body: "Green, amber, and red indicators show exactly which contracts need attention — weeks before they're due.",
  },
  {
    title: "Works with your existing Jobber data",
    body: "No manual contract entry. ContractMinder reads your job history and identifies the patterns already there.",
  },
  {
    title: "Built for recurring service businesses",
    body: "Pest control, lawn care, HVAC, cleaning, mosquito programs — any business with annual or quarterly agreements.",
  },
];

export default function Landing() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", backgroundColor: "#f8fafc" }} className="min-h-screen flex flex-col">

      {/* Nav */}
      <header style={{ backgroundColor: "#1e293b" }}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <span className="text-white font-semibold text-lg tracking-tight">ContractMinder</span>
        </div>
      </header>

      {/* Hero */}
      <section style={{ backgroundColor: "#1e293b" }} className="pb-24 pt-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 tracking-wide uppercase">
            Built for Jobber users
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
            Stop spending weeks on<br className="hidden sm:block" /> contract renewals
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            ContractMinder connects to Jobber, analyses your job history to find recurring service contracts, and lets you renew them all in one click — no manual job creation, ever again.
          </p>
          <a
            href={`${API}/auth/jobber/connect`}
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-white text-slate-800 font-semibold text-sm hover:bg-slate-100 transition-colors shadow-lg"
          >
            Connect to Jobber
          </a>
        </div>
      </section>

      {/* Wave divider */}
      <div style={{ backgroundColor: "#1e293b" }}>
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none" style={{ height: 60 }}>
          <path d="M0,0 C360,60 1080,60 1440,0 L1440,60 L0,60 Z" fill="#f8fafc" />
        </svg>
      </div>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">How it works</p>
            <h2 className="text-2xl font-bold text-slate-800">Up and running in minutes</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.number} className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-7">
                <p style={{ color: "#1e293b" }} className="text-3xl font-bold mb-4 opacity-20">{step.number}</p>
                <p className="font-semibold text-slate-800 mb-2">{step.title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why ContractMinder */}
      <section className="py-20" style={{ backgroundColor: "#f1f5f9" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Why ContractMinder</p>
            <h2 className="text-2xl font-bold text-slate-800">The renewal engine Jobber doesn't have</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-7">
                <div className="h-1 w-8 rounded-full mb-5" style={{ backgroundColor: "#1e293b" }} />
                <p className="font-semibold text-slate-800 mb-2">{benefit.title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{benefit.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Ready to automate your renewals?</h2>
          <p className="text-slate-500 text-sm mb-8">Connect your Jobber account and see your first contract suggestions in under a minute.</p>
          <a
            href={`${API}/auth/jobber/connect`}
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
            style={{ backgroundColor: "#1e293b" }}
          >
            Connect to Jobber
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-6">
        <p className="text-center text-xs text-slate-400">
          ContractMinder · Built for Jobber users
        </p>
      </footer>

    </div>
  );
}
