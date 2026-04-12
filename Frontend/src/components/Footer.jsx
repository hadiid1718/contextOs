import { Github, Linkedin, Mail, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-bg2">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-strong bg-surface2 font-mono text-xs font-bold text-brand">
                SM
              </div>
              <span className="text-sm font-semibold text-text">Stackmind</span>
            </div>
            <p className="text-xs text-text2">
              Unified data intelligence for teams that ship quickly and stay aligned.
            </p>
            <div className="flex gap-3">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="text-text2 transition hover:text-brand">
                <Github size={16} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-text2 transition hover:text-brand">
                <Twitter size={16} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-text2 transition hover:text-brand">
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="section-label">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/#about" className="text-text2 transition hover:text-text">
                  About
                </Link>
              </li>
              <li>
                <Link to="/#how-to-use" className="text-text2 transition hover:text-text">
                  How to use
                </Link>
              </li>
              <li>
                <Link to="/#modules" className="text-text2 transition hover:text-text">
                  Modules
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-text2 transition hover:text-text">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-text2 transition hover:text-text">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="section-label">Modules</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/dashboard" className="text-text2 transition hover:text-text">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/query" className="text-text2 transition hover:text-text">
                  AI Query
                </Link>
              </li>
              <li>
                <Link to="/integrations" className="text-text2 transition hover:text-text">
                  Integrations
                </Link>
              </li>
              <li>
                <Link to="/settings/team" className="text-text2 transition hover:text-text">
                  Team
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="section-label">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-text2 transition hover:text-text">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-text2 transition hover:text-text">
                  Status
                </a>
              </li>
              <li>
                <a href="#" className="text-text2 transition hover:text-text">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="text-text2 transition hover:text-text">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="my-8 border-t border-border" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-text3">
            © {currentYear} Stackmind. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-text3">
            <a href="mailto:support@stackmind.io" className="transition hover:text-brand">
              <Mail size={14} className="inline mr-1" />
              support@stackmind.io
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

