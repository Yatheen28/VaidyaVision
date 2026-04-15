import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Authenticate', to: '/authenticate' },
  { label: 'Bulk Detect', to: '/bulk' },
  { label: 'Species', to: '/species' },
];

// VaidyaVision logo SVG inline (leaf with circuit pattern)
function Logo() {
  return (
    <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 2C20 2 8 10 8 22C8 28.627 13.373 34 20 34C26.627 34 32 28.627 32 22C32 10 20 2 20 2Z"
        fill="#1B4332"
        stroke="#2D6A4F"
        strokeWidth="1.5"
      />
      <path
        d="M20 8V30"
        stroke="#52B788"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 14L20 18L26 14"
        stroke="#52B788"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M12 20L20 24L28 20"
        stroke="#52B788"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <circle cx="20" cy="16" r="2" fill="#F4A261" opacity="0.9" />
      <circle cx="20" cy="16" r="3.5" stroke="#F4A261" strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? 'bg-white/90 backdrop-blur-lg shadow-glass border-b border-forest-100/50'
            : 'bg-transparent'
          }`}
      >
        <div className="section-container">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <img src="/logo.png" alt="VaidyaVision" className="h-10 w-auto" />
              <span className="font-display text-xl font-semibold text-forest-800 group-hover:text-sage transition-colors">
                Vaidya<span className="text-sage">Vision</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive(link.to)
                      ? 'text-forest-800'
                      : 'text-ink-muted hover:text-forest-800 hover:bg-forest-50/50'
                    }`}
                >
                  {link.label}
                  {isActive(link.to) && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-sage rounded-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* CTA + Mobile Toggle */}
            <div className="flex items-center gap-3">
              <Link
                to="/authenticate"
                className="hidden md:inline-flex btn-primary text-sm py-2 px-5"
              >
                Try Now
              </Link>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-forest-800 hover:bg-forest-50 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div
              className="absolute inset-0 bg-forest-900/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="relative mt-16 mx-4 bg-white rounded-2xl shadow-glass-xl border border-forest-100/50 overflow-hidden"
            >
              <div className="p-4 space-y-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive(link.to)
                        ? 'bg-forest-50 text-forest-800'
                        : 'text-ink-muted hover:bg-forest-50 hover:text-forest-800'
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-2">
                  <Link
                    to="/authenticate"
                    className="btn-primary w-full text-sm"
                  >
                    Try Now
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
