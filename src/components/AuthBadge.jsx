import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

export default function AuthBadge({ authentic, species, confidence }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 15,
        delay: 0.2,
      }}
      className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm ${
        authentic
          ? 'bg-authentic-bg text-authentic border border-authentic/20'
          : 'bg-suspicious-bg text-suspicious border border-suspicious/20'
      }`}
    >
      {authentic ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <XCircle className="w-5 h-5" />
      )}
      <div>
        <div className="font-semibold text-base">
          {authentic ? '✓ AUTHENTICATED' : '✗ LOW CONFIDENCE'}
        </div>
        <div className="text-xs opacity-80 mt-0.5">
          {species} · {(confidence * 100).toFixed(1)}% confidence
        </div>
      </div>
    </motion.div>
  );
}
