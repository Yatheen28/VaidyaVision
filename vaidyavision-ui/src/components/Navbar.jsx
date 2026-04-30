import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Leaf } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Authenticate', to: '/authenticate' },
  { label: 'Bulk Detect', to: '/bulk' },
  { label: 'Species', to: '/species' },
];

function Logo() {
  return (
    <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 2C20 2 8 10 8 22C8 28.627 13.373 34 20 34C26.627 34 32 28.627 32 22C32 10 20 2 20 2Z"
        fill="#1B4332"
        stroke="#52B788"
        strokeWidth="1.5"
      />
      <path d="M20 8V30" stroke="#52B788" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 14L20 18L26 14" stroke="#52B788" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <path d="M12 20L20 24L28 20" stroke="#52B788" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'shadow-glass'
            : ''
        }`}
        style={{
          background: scrolled
            ? 'rgba(9, 22, 14, 0.85)'
            : 'rgba(9, 22, 14, 0.4)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: scrolled
            ? '1px solid rgba(82, 183, 136, 0.1)'
            : '1px solid transparent',
        }}
      >
        <div className="section-container">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <Logo />
              <span className="font-display text-xl font-semibold text-white group-hover:text-sage-light transition-colors">
                Vaidya<span className="text-sage">Vision</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(link.to)
                      ? 'text-sage-light'
                      : 'text-ink-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {isActive(link.to) && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      style={{ background: '#52B788' }}
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
                className="md:hidden p-2 rounded-lg text-sage hover:bg-white/5 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu — Slide-in Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(5, 17, 9, 0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-72 glass-card rounded-none border-r-0"
              style={{
                background: 'rgba(15, 28, 20, 0.95)',
                borderLeft: '1px solid rgba(82, 183, 136, 0.12)',
              }}
            >
              <div className="p-6 pt-20 space-y-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={link.to}
                      className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(link.to)
                          ? 'text-sage-light'
                          : 'text-ink-muted hover:text-white hover:bg-white/5'
                      }`}
                      style={isActive(link.to) ? { background: 'rgba(82,183,136,0.08)' } : {}}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="pt-4">
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
