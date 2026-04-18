import { motion } from 'framer-motion';

export default function LoadingLeaf({ text = 'Analyzing...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        <svg
          viewBox="0 0 64 64"
          className="w-16 h-16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            d="M32 4C32 4 12 16 12 36C12 47.046 20.954 56 32 56C43.046 56 52 47.046 52 36C52 16 32 4 32 4Z"
            fill="#52B788"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <path
            d="M32 12V48"
            stroke="#1B4332"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M22 22L32 28L42 22"
            stroke="#1B4332"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
          <path
            d="M18 32L32 38L46 32"
            stroke="#1B4332"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />
        </svg>
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(82,183,136,0.3) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.p
        className="text-ink-muted font-medium text-sm"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {text}
      </motion.p>
    </div>
  );
}
