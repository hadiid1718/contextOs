import {
  ArrowRight,
  BarChart3,
  Bell,
  Cable,
  LayoutDashboard,
  Settings,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const modulesList = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Get real-time insights and metrics across all your data sources.',
    slug: 'dashboard',
    accent: 'text-accent',
  },
  {
    icon: Settings,
    title: 'Organisation',
    description: 'Manage teams, invites, roles, and secure multi-org workflows.',
    slug: 'organisation',
    accent: 'text-accent2',
  },
  {
    icon: Cable,
    title: 'Ingestion',
    description: 'Ingest tickets, messages, and docs from your connected tools.',
    slug: 'ingestion',
    accent: 'text-accent3',
  },
  {
    icon: BarChart3,
    title: 'Graph',
    description: 'Map relationships between people, events, and knowledge nodes.',
    slug: 'graph',
    accent: 'text-accent4',
  },
  {
    icon: Sparkles,
    title: 'Query Engine',
    description: 'Build complex queries with an intuitive interface and AI assistance.',
    slug: 'query',
    accent: 'text-accent5',
  },
  {
    icon: Cable,
    title: 'Integrations',
    description: 'Connect with 100+ data sources and APIs seamlessly.',
    slug: 'integrations',
    accent: 'text-text',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Stay updated with real-time alerts and notifications.',
    slug: 'notifications',
    accent: 'text-text',
  },
  {
    icon: Wallet,
    title: 'Billing',
    description: 'Manage subscriptions, usage, and payments with ease.',
    slug: 'billing',
    accent: 'text-text',
  },
];

const Home = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <Navbar isPublic />

      <section className="section-divider px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="section-label">Unified Intelligence Platform</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl md:leading-tight">
            Connect, query, and reason over your org knowledge in one platform.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-text2">
            ContextOS brings authentication, ingestion, graph intelligence, AI query, notifications, and billing into one developer-first experience.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button className="px-7 py-3 text-base">Get Started Free</Button>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-text2 transition hover:text-text"
            >
              Sign in to workspace
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section id="about" className="section-divider px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="section-label">About Website</p>
            <h2 className="mt-2 text-3xl font-semibold">Built for modern product and platform teams</h2>
            <p className="mt-3 max-w-3xl text-sm text-text2">
              ContextOS helps teams unify fragmented operational data, keep context live, and make confident decisions faster.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Unified architecture',
                desc: 'All modules share org-aware identity, events, and one consistent knowledge graph.',
              },
              {
                title: 'Realtime first',
                desc: 'Live updates through events, notifications, and graph changes across teams.',
              },
              {
                title: 'Secure by default',
                desc: 'JWT sessions, protected routes, org boundaries, and role-based access controls.',
              },
            ].map((feat, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-bg2 p-6">
                <h3 className="text-lg font-semibold text-text">{feat.title}</h3>
                <p className="mt-2 text-sm text-text2">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-to-use" className="section-divider px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="section-label">How To Use</p>
          <h2 className="mt-2 text-3xl font-semibold">Start in minutes</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              'Create your workspace and verify email access.',
              'Connect tools in Integrations and enable ingestion pipelines.',
              'Explore relationships in Graph and ask AI-powered queries.',
              'Collaborate with your team and monitor billing + notifications.',
            ].map((step, idx) => (
              <div key={step} className="rounded-xl border border-border bg-bg2 p-5">
                <p className="font-mono text-[11px] tracking-[2px] text-text3">STEP {idx + 1}</p>
                <p className="mt-3 text-sm text-text2">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="section-divider px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <p className="section-label">Modules</p>
            <h2 className="mt-2 text-3xl font-semibold">8 Integrated Tools</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {modulesList.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.slug}
                  className="rounded-xl border border-border bg-bg2 p-6 transition hover:border-border-strong hover:bg-bg3"
                >
                  <Icon size={24} className={module.accent} />
                  <h3 className="mt-4 text-lg font-semibold text-text">{module.title}</h3>
                  <p className="mt-2 text-sm text-text2">{module.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="section-divider px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-bg2 p-8 text-center">
          <p className="section-label">Pricing</p>
          <h2 className="mt-2 text-3xl font-semibold">Plans moved to a dedicated pricing page</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-text2">
            Compare plans with monthly/yearly toggle and select the plan that matches your needs.
          </p>
          <div className="mt-6">
            <Link to="/pricing">
              <Button>View pricing</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="section-divider bg-bg2 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold">Ready to get started?</h2>
          <p className="mt-4 text-text2">
            Join teams using ContextOS to unlock operational intelligence from their data.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button>Create Free Account</Button>
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium text-text2 transition hover:text-text"
            >
              Schedule a demo
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;

