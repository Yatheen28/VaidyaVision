import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, AlertTriangle, Eye, Leaf } from 'lucide-react';

export default function SpeciesModal({ isOpen, onClose, name, data }) {
  if (!data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(5,17,9,0.7)', backdropFilter: 'blur(8px)' }} />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto glass-card shadow-glass-xl scrollbar-thin"
            style={{ background: 'rgba(15, 28, 20, 0.95)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
              style={{
                background: 'rgba(15, 28, 20, 0.95)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(82,183,136,0.1)',
              }}
            >
              <div>
                <h2 className="font-display text-2xl font-bold text-white">{name}</h2>
                <p className="text-sm text-ink-muted">{data.hindiName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/5 text-ink-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-ink-muted leading-relaxed">{data.description}</p>

              {/* Model Accuracy */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(82,183,136,0.08)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(82,183,136,0.15)' }}>
                  <Shield size={20} className="text-sage" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Model Accuracy</p>
                  <p className="text-lg font-bold text-sage-light">{data.modelAccuracy}</p>
                </div>
              </div>

              {/* AYUSH Medicinal Uses */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <Leaf size={16} className="text-sage" />
                  AYUSH Medicinal Uses
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {data.uses.map((use) => (
                    <div
                      key={use}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-sage-light"
                      style={{ background: 'rgba(82,183,136,0.08)' }}
                    >
                      {use}
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Identification Markers */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <Eye size={16} className="text-sage" />
                  Visual Identification Markers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.traits.map((trait) => (
                    <span
                      key={trait}
                      className="px-3 py-1.5 rounded-full text-xs font-medium text-ink-muted ghost-border"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Common Adulterants */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <AlertTriangle size={16} className="text-amber" />
                  Common Adulterants
                </h3>
                <div className="space-y-2">
                  {data.adulterants.map((adulterant) => (
                    <div
                      key={adulterant}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs text-amber-light"
                      style={{ background: 'rgba(244,162,97,0.08)', border: '1px solid rgba(244,162,97,0.12)' }}
                    >
                      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                      {adulterant}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
