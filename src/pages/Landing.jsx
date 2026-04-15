import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Leaf, Layers, BookOpen, ArrowRight, Shield, Target, Zap } from 'lucide-react';

// Animated counter component
function CountUp({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const startTime = Date.now();
    const isFloat = end % 1 !== 0;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * end;
      setCount(isFloat ? parseFloat(current.toFixed(1)) : Math.round(current));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, isInView]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Decorative background leaves
function BackgroundLeaves() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Top-right leaf */}
      <motion.div
        className="absolute -top-20 -right-20 opacity-[0.04]"
        animate={{ rotate: [0, 5, -3, 0], y: [0, -10, 5, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 300 300" className="w-96 h-96" fill="#1B4332">
          <path d="M150 10C150 10 40 80 40 190C40 245.228 84.772 290 140 290C140 290 100 230 100 180C100 120 150 80 150 80C150 80 200 120 200 180C200 230 160 290 160 290C215.228 290 260 245.228 260 190C260 80 150 10 150 10Z" />
        </svg>
      </motion.div>

      {/* Bottom-left leaf */}
      <motion.div
        className="absolute -bottom-32 -left-20 opacity-[0.03] rotate-45"
        animate={{ rotate: [45, 50, 40, 45] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 300 300" className="w-80 h-80" fill="#52B788">
          <path d="M150 10C150 10 40 80 40 190C40 245.228 84.772 290 140 290C140 290 100 230 100 180C100 120 150 80 150 80C150 80 200 120 200 180C200 230 160 290 160 290C215.228 290 260 245.228 260 190C260 80 150 10 150 10Z" />
        </svg>
      </motion.div>

      {/* Center-right small leaf */}
      <motion.div
        className="absolute top-1/3 right-10 opacity-[0.03]"
        animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 200 200" className="w-40 h-40" fill="#40916C">
          <path d="M100 10C100 10 30 50 30 120C30 160 60 190 100 190C140 190 170 160 170 120C170 50 100 10 100 10Z" />
        </svg>
      </motion.div>
    </div>
  );
}

// Hero floating leaf illustration
function FloatingLeaf() {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
      {/* Glow background */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(82,183,136,0.15) 0%, rgba(82,183,136,0.05) 50%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main leaf */}
      <motion.svg
        viewBox="0 0 200 250"
        className="w-full h-full relative z-10"
        animate={{ y: [0, -12, 0], rotate: [0, 2, -2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Leaf body */}
        <defs>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#52B788" />
            <stop offset="50%" stopColor="#40916C" />
            <stop offset="100%" stopColor="#2D6A4F" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M100 20C100 20 30 70 30 150C30 195 60 230 100 230C140 230 170 195 170 150C170 70 100 20 100 20Z"
          fill="url(#leafGrad)"
          opacity="0.85"
          filter="url(#glow)"
        />
        {/* Vein - center */}
        <path d="M100 35V215" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        {/* Veins - lateral */}
        <path d="M60 100L100 80L140 100" stroke="#1B4332" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
        <path d="M50 130L100 105L150 130" stroke="#1B4332" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
        <path d="M55 160L100 135L145 160" stroke="#1B4332" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
        <path d="M65 185L100 165L135 185" stroke="#1B4332" strokeWidth="1" strokeLinecap="round" opacity="0.15" />

        {/* Circuit / AI node overlay */}
        <circle cx="100" cy="80" r="5" fill="#F4A261" opacity="0.8" />
        <circle cx="100" cy="80" r="10" stroke="#F4A261" strokeWidth="1" fill="none" opacity="0.3" />
        <circle cx="70" cy="120" r="3" fill="#F4A261" opacity="0.5" />
        <circle cx="130" cy="120" r="3" fill="#F4A261" opacity="0.5" />
        <line x1="100" y1="80" x2="70" y2="120" stroke="#F4A261" strokeWidth="0.8" opacity="0.3" />
        <line x1="100" y1="80" x2="130" y2="120" stroke="#F4A261" strokeWidth="0.8" opacity="0.3" />
      </motion.svg>

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-sage/30"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.8,
          }}
        />
      ))}
    </div>
  );
}

const STATS = [
  { value: 88.6, suffix: '%', label: 'Model Accuracy' },
  { value: 6, suffix: '', label: 'Species Classified' },
  { value: 1509, suffix: '', label: 'Training Images' },
  { value: 70, suffix: '-90%', label: 'Adulteration Rate in AYUSH Industry' },
];

const FEATURES = [
  {
    icon: Leaf,
    title: 'Single Leaf Authentication',
    description: 'Upload a photo of any medicinal leaf for instant AI-powered species authentication and confidence scoring.',
    link: '/authenticate',
    color: 'bg-forest-50 text-sage',
  },
  {
    icon: Layers,
    title: 'Bulk Batch Detection',
    description: 'Detect and classify multiple leaves in a single image using YOLOv8 object detection with bounding box annotations.',
    link: '/bulk',
    color: 'bg-amber-light/10 text-amber',
  },
  {
    icon: BookOpen,
    title: 'Species Library',
    description: 'Explore detailed profiles of 6 AYUSH medicinal species including visual markers, uses, and common adulterants.',
    link: '/species',
    color: 'bg-purple-50 text-purple-600',
  },
];

export default function Landing() {
  return (
    <div className="relative">
      <BackgroundLeaves />

      {/* ============ HERO SECTION ============ */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="section-container w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center py-12 md:py-20">
            {/* Left — Text */}
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
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-forest-50 rounded-full text-xs font-semibold text-forest-800 mb-6"
              >
                <Shield size={14} className="text-sage" />
                Powered by EfficientNetB0 + YOLOv8
              </motion.div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-ink leading-tight">
                Authenticate{' '}
                <span className="text-gradient bg-gradient-to-r from-forest-800 via-sage to-forest-600">
                  Medicinal Leaves
                </span>{' '}
                with AI
              </h1>

              <p className="mt-5 text-base md:text-lg text-ink-muted leading-relaxed max-w-lg">
                Protecting India's AYUSH heritage from adulteration using Deep Learning and Digital Image Processing.
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

              {/* Mini trust badges */}
              <div className="flex items-center gap-4 mt-8 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Target size={14} className="text-sage" />
                  88.6% Accuracy
                </span>
                <span className="w-1 h-1 bg-ink-light rounded-full" />
                <span className="flex items-center gap-1.5">
                  <Zap size={14} className="text-amber" />
                  Real-time Analysis
                </span>
                <span className="w-1 h-1 bg-ink-light rounded-full" />
                <span className="flex items-center gap-1.5">
                  <Shield size={14} className="text-forest-600" />
                  6 Species
                </span>
              </div>
            </motion.div>

            {/* Right — Floating Leaf */}
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

      {/* ============ STATS BAR ============ */}
      <section className="relative bg-forest-800 py-8 md:py-12">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-white font-display">
                  {stat.suffix === '-90%' ? (
                    <span>{<CountUp end={stat.value} />}{stat.suffix}</span>
                  ) : (
                    <CountUp end={stat.value} suffix={stat.suffix} />
                  )}
                </div>
                <div className="text-sm text-forest-200 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURE CARDS ============ */}
      <section className="py-20 md:py-28 relative">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink">
              How It Works
            </h2>
            <p className="text-ink-muted mt-3 max-w-lg mx-auto">
              Our AI pipeline combines computer vision with deep learning to authenticate AYUSH medicinal leaves in seconds.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Link to={feature.link} className="block group">
                  <div className="glass-card-solid p-6 h-full hover:shadow-card-hover transition-all duration-300 group-hover:-translate-y-1">
                    <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                      <feature.icon size={22} />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-ink">{feature.title}</h3>
                    <p className="text-sm text-ink-muted mt-2 leading-relaxed">{feature.description}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-sage mt-4 group-hover:gap-2 transition-all">
                      Learn more <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-forest-800 py-10 border-t border-forest-700">
        <div className="section-container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
              <path d="M20 2C20 2 8 10 8 22C8 28.627 13.373 34 20 34C26.627 34 32 28.627 32 22C32 10 20 2 20 2Z" fill="#52B788" />
              <path d="M20 8V30" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="20" cy="16" r="2" fill="#F4A261" opacity="0.9" />
            </svg>
            <span className="font-display text-lg font-semibold text-white">
              Vaidya<span className="text-sage">Vision</span>
            </span>
          </div>
          <p className="text-forest-300 text-sm">

          </p>
          <p className="text-forest-400 text-xs mt-2">
            Powered by EfficientNetB0 + YOLOv8 · Digital Image Processing Project
          </p>
          <p className="text-forest-500 text-xs mt-4">
            © {new Date().getFullYear()} VaidyaVision. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
