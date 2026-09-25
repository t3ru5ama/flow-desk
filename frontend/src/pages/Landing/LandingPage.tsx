import { Link } from "react-router-dom";

const FEATURES = [
  { title: "Projects & Tasks", desc: "Plan, assign, and track work across every team in one place." },
  { title: "Incidents", desc: "Coordinate response with a live timeline and full audit trail." },
  { title: "Approvals", desc: "Multi-step sign-off workflows with named approvers per step." },
  { title: "Documents & Team", desc: "Centralized files and role-based access control for your org." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-fd-pearl">
      <header className="flex items-center justify-between px-8 py-5">
        <span className="text-lg font-semibold text-fd-cacao">FlowDesk</span>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="rounded-md px-4 py-2 text-sm font-medium text-fd-cacao hover:bg-fd-khaki/50 transition-colors duration-150">
            Log in
          </Link>
          <Link to="/signup" className="rounded-md bg-fd-leather px-4 py-2 text-sm font-medium text-white hover:bg-fd-leather-hover transition-colors duration-150">
            Sign up
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold text-fd-cacao sm:text-5xl">
          Project management, incidents, and approvals&mdash;one platform.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-fd-taupe">
          FlowDesk gives your team a single, information-dense home for tasks, incident response, and
          multi-step approvals.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/signup" className="rounded-md bg-fd-leather px-6 py-3 text-sm font-medium text-white hover:bg-fd-leather-hover transition-colors duration-150">
            Get started
          </Link>
          <Link to="/login" className="rounded-md border border-fd-khaki bg-white px-6 py-3 text-sm font-medium text-fd-cacao hover:bg-fd-pearl transition-colors duration-150">
            Log in
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-lg border border-fd-khaki bg-white p-5">
            <h3 className="font-medium text-fd-cacao">{f.title}</h3>
            <p className="mt-2 text-sm text-fd-taupe">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
