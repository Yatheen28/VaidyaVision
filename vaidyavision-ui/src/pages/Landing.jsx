import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Leaf, Layers, BookOpen, ArrowRight, Shield, Target, Zap, Check, ArrowUpRight } from 'lucide-react';

/* ── Animated counter ── */
function CountUp({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, isInView]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Hero floating leaf illustration ── */
function FloatingLeaf() {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(82,183,136,0.12) 0%, rgba(82,183,136,0.03) 50%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.svg
        viewBox="0 0 200 250"
        className="w-full h-full relative z-10"
        animate={{ y: [0, -12, 0], rotate: [0, 2, -2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#52B788" />
            <stop offset="50%" stopColor="#40916C" />
            <stop offset="100%" stopColor="#2D6A4F" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M100 20C100 20 30 70 30 150C30 195 60 230 100 230C140 230 170 195 170 150C170 70 100 20 100 20Z"
          fill="url(#leafGrad)" opacity="0.85" filter="url(#glow)"
        />
        <path d="M100 35V215" stroke="#0d1a12" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M60 100L100 80L140 100" stroke="#0d1a12" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
        <path d="M50 130L100 105L150 130" stroke="#0d1a12" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
        <path d="M55 160L100 135L145 160" stroke="#0d1a12" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
        <path d="M65 185L100 165L135 185" stroke="#0d1a12" strokeWidth="1" strokeLinecap="round" opacity="0.15" />
        {/* AI nodes */}
        <circle cx="100" cy="80" r="5" fill="#F4A261" opacity="0.8" />
        <circle cx="100" cy="80" r="10" stroke="#F4A261" strokeWidth="1" fill="none" opacity="0.3" />
        <circle cx="70" cy="120" r="3" fill="#F4A261" opacity="0.5" />
        <circle cx="130" cy="120" r="3" fill="#F4A261" opacity="0.5" />
        <line x1="100" y1="80" x2="70" y2="120" stroke="#F4A261" strokeWidth="0.8" opacity="0.3" />
        <line x1="100" y1="80" x2="130" y2="120" stroke="#F4A261" strokeWidth="0.8" opacity="0.3" />
        <circle cx="85" cy="155" r="2.5" fill="#F4A261" opacity="0.4" />
        <circle cx="115" cy="155" r="2.5" fill="#F4A261" opacity="0.4" />
        <line x1="70" y1="120" x2="85" y2="155" stroke="#F4A261" strokeWidth="0.5" opacity="0.2" />
        <line x1="130" y1="120" x2="115" y2="155" stroke="#F4A261" strokeWidth="0.5" opacity="0.2" />
      </motion.svg>
      {/* Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
            background: i % 2 === 0 ? 'rgba(82,183,136,0.4)' : 'rgba(244,162,97,0.4)',
          }}
          animate={{ y: [0, -20, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}
    </div>
  );
}

/* ── Stats data ── */
const STATS = [
  { icon: '🧠', label: 'AI-Powered', sublabel: 'Advanced Analysis', iconEl: <Shield size={20} className="text-sage" /> },
  { value: 6, suffix: '+', label: '6+ Species', sublabel: 'Validated Models' },
  { value: 1500, suffix: '+', label: '1500+', sublabel: 'Training Samples' },
  { icon: '🔍', label: 'Detection', sublabel: 'Adulteration ID', iconEl: <Target size={20} className="text-amber" /> },
];

/* ── Feature cards ── */
const FEATURES = [
  {
    icon: Leaf,
    title: 'Single Leaf Authentication',
    description: 'Capture or upload a high-resolution image of a medicinal specimen. Our dual-layer neural network verifies taxonomic identity and checks for common adulterants in real-time.',
    link: '/authenticate',
    accent: '#52B788',
    large: true,
  },
  {
    icon: Layers,
    title: 'Bulk Batch Detection',
    description: 'Process industrial-scale batches for quality control pipelines.',
    link: '/bulk',
    accent: '#F4A261',
  },
  {
    icon: BookOpen,
    title: 'Species Library',
    description: 'Explore our curated database of verified medicinal botanical markers.',
    link: '/species',
    accent: '#75daa8',
  },
];

/* ── Pricing data ── */
const PRICING = [
  {
    name: 'Free',
    badge: 'Get Started',
    price: '0',
    period: '/month',
    features: ['5 authentications per day', 'Basic species identification', 'Community support'],
    cta: 'Start Free',
    ctaStyle: 'secondary',
  },
  {
    name: 'Basic',
    badge: 'Popular',
    badgeColor: 'sage',
    price: '99',
    period: '/month',
    features: ['50 authentications per day', 'Species identification', 'Authentication reports (PDF)', 'Email support'],
    cta: 'Upgrade',
    ctaStyle: 'primary',
  },
  {
    name: 'Pro',
    badge: 'For Professionals',
    badgeColor: 'amber',
    price: '499',
    period: '/month',
    features: ['Unlimited authentications', 'Bulk detection (up to 20 leaves)', 'Detailed analysis reports', 'Priority support', 'API access (100 calls/day)'],
    cta: 'Go Pro',
    ctaStyle: 'accent',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    badge: 'Custom',
    price: '25,000',
    period: '/year',
    features: ['Unlimited everything', 'Custom API integration', 'Dedicated support', 'On-premise deployment', 'Institutional dashboard'],
    cta: 'Contact Us',
    ctaStyle: 'secondary',
  },
];

export default function Landing() {
  return (
    <div className="relative bg-surface min-h-screen">
      {/* Subtle background gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #52B788, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, #F4A261, transparent 70%)' }} />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center pt-16 z-10">
        <div className="section-container w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center py-12 md:py-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-xl"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-pill inline-flex items-center gap-2 text-sage-light mb-6"
              >
                <Shield size={14} className="text-sage" />
                Powered by dual-layer verification
              </motion.div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.1] tracking-display">
                Authenticate{' '}
                <span className="text-gradient">Medicinal Leaves</span>{' '}
                with Precision
              </h1>

              <p className="mt-5 text-base md:text-lg text-ink-muted leading-relaxed max-w-lg">
                Protecting India's AYUSH heritage from adulteration using advanced
                computer vision and deep learning models designed for botanical excellence.
              </p>

              <div className="flex flex-wrap gap-3 mt-8">
                <Link to="/authenticate" className="btn-primary text-base px-7 py-3.5">
                  <Leaf size={18} />
                  Authenticate a Leaf
                </Link>
                <Link to="/bulk" className="btn-secondary text-base px-7 py-3.5">
                  <Layers size={18} />
                  Bulk Detection
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-4 mt-8">
                {[
                  { icon: Target, label: '95.7% Accuracy', color: 'text-sage' },
                  { icon: Zap, label: 'Real-time Analysis', color: 'text-amber' },
                  { icon: Shield, label: '6 Species', color: 'text-sage-light' },
                ].map((badge, i) => (
                  <span key={i} className="glass-pill flex items-center gap-1.5 text-ink-muted">
                    <badge.icon size={14} className={badge.color} />
                    {badge.label}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex justify-center lg:justify-end"
            >
              <FloatingLeaf />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="relative z-10 py-8 md:py-12" style={{ background: 'rgba(17, 30, 22, 0.6)' }}>
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card text-center py-5 px-4"
              >
                <div className="flex justify-center mb-2">
                  {stat.iconEl || null}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white font-display tracking-heading">
                  {stat.value ? <CountUp end={stat.value} suffix={stat.suffix} /> : stat.label}
                </div>
                <div className="text-xs text-ink-muted mt-1">{stat.sublabel}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ("System Operations") ═══ */}
      <section className="py-20 md:py-28 relative z-10">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <span className="label-caps">Core Capabilities</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mt-2 tracking-heading">
              System Operations
            </h2>
          </motion.div>

          {/* Asymmetric grid: large left, two stacked right */}
          <div className="grid md:grid-cols-5 gap-5">
            {/* Large card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-3"
            >
              {(() => { const FeatureIcon = FEATURES[0].icon; return (
              <Link to={FEATURES[0].link} className="block group h-full">
                <div className="glass-card p-8 h-full hover:shadow-glow-sage transition-all duration-300 group-hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: 'rgba(82,183,136,0.1)' }}>
                    <FeatureIcon size={24} style={{ color: FEATURES[0].accent }} />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white">{FEATURES[0].title}</h3>
                  <p className="text-sm text-ink-muted mt-3 leading-relaxed max-w-md">{FEATURES[0].description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-sage mt-6 group-hover:gap-2 transition-all">
                    Learn more <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
              ); })()}
            </motion.div>

            {/* Right stacked cards */}
            <div className="md:col-span-2 flex flex-col gap-5">
              {FEATURES.slice(1).map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i + 1) * 0.1 }}
                >
                  <Link to={feature.link} className="block group">
                    <div className="glass-card p-6 hover:shadow-glow-sage transition-all duration-300 group-hover:-translate-y-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ background: `${feature.accent}15` }}>
                        <feature.icon size={20} style={{ color: feature.accent }} />
                      </div>
                      <h3 className="font-display text-lg font-semibold text-white">{feature.title}</h3>
                      <p className="text-xs text-ink-muted mt-2 leading-relaxed">{feature.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="py-20 md:py-28 relative z-10" style={{ background: 'rgba(17, 30, 22, 0.3)' }}>
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="label-caps">Plans</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mt-2 tracking-heading">
              Choose Your Plan
            </h2>
            <p className="text-ink-muted mt-3 max-w-lg mx-auto">
              From individual researchers to large AYUSH institutions
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative ${plan.highlighted ? 'lg:-mt-4 lg:mb-[-1rem]' : ''}`}
              >
                <div
                  className={`glass-card p-6 h-full flex flex-col ${
                    plan.highlighted ? 'ring-1 ring-amber/30 shadow-glow-amber' : ''
                  }`}
                >
                  {/* Badge */}
                  <span
                    className="inline-flex self-start px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4"
                    style={{
                      background: plan.badgeColor === 'sage' ? 'rgba(82,183,136,0.15)'
                        : plan.badgeColor === 'amber' ? 'rgba(244,162,97,0.15)'
                        : 'rgba(136,148,139,0.15)',
                      color: plan.badgeColor === 'sage' ? '#75daa8'
                        : plan.badgeColor === 'amber' ? '#ffb780'
                        : '#88948b',
                    }}
                  >
                    {plan.badge}
                  </span>

                  <h3 className="font-display text-xl font-bold text-white">{plan.name}</h3>

                  <div className="mt-3 mb-5">
                    <span className="text-3xl font-bold text-white font-display">
                      Rs. {plan.price}
                    </span>
                    <span className="text-sm text-ink-muted">{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-ink-muted">
                        <Check size={14} className="text-sage mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={
                      plan.ctaStyle === 'primary' ? 'btn-primary w-full text-sm'
                      : plan.ctaStyle === 'accent' ? 'btn-accent w-full text-sm'
                      : 'btn-secondary w-full text-sm'
                    }
                  >
                    {plan.cta}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-ink-light mt-8">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 py-10" style={{ background: 'rgba(5, 17, 9, 0.8)', borderTop: '1px solid rgba(82,183,136,0.08)' }}>
        <div className="section-container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
              <path d="M20 2C20 2 8 10 8 22C8 28.627 13.373 34 20 34C26.627 34 32 28.627 32 22C32 10 20 2 20 2Z" fill="#52B788" />
              <path d="M20 8V30" stroke="#0d1a12" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="20" cy="16" r="2" fill="#F4A261" opacity="0.9" />
            </svg>
            <span className="font-display text-lg font-semibold text-white">
              Vaidya<span className="text-sage">Vision</span>
            </span>
          </div>
          <p className="text-ink-muted text-sm">
            Powered by dual-layer verification
          </p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-ink-light">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Documentation</span>
          </div>
          <p className="text-outline-variant text-xs mt-4">
            &copy; {new Date().getFullYear()} VaidyaVision. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
