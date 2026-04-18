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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-forest-900/30 backdrop-blur-sm" />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-glass-xl scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-6 py-4 border-b border-forest-100/50 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">{name}</h2>
                <p className="text-sm text-ink-muted">{data.hindiName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-forest-50 text-ink-muted hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              <p className="text-sm text-ink-muted leading-relaxed">{data.description}</p>

              {/* Model Accuracy */}
              <div className="flex items-center gap-3 p-3 bg-forest-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-sage/20 flex items-center justify-center">
                  <Shield size={20} className="text-sage" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Model Accuracy</p>
                  <p className="text-lg font-bold text-forest-800">{data.modelAccuracy}</p>
                </div>
              </div>

              {/* AYUSH Medicinal Uses */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
                  <Leaf size={16} className="text-sage" />
                  AYUSH Medicinal Uses
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {data.uses.map((use) => (
                    <div
                      key={use}
                      className="px-3 py-2 bg-forest-50 rounded-lg text-xs font-medium text-forest-800"
                    >
                      {use}
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Identification Markers */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
                  <Eye size={16} className="text-sage" />
                  Visual Identification Markers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.traits.map((trait) => (
                    <span
                      key={trait}
                      className="px-3 py-1.5 bg-white border border-forest-200 rounded-full text-xs font-medium text-ink"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Common Adulterants */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
                  <AlertTriangle size={16} className="text-amber" />
                  Common Adulterants
                </h3>
                {data.adulterants.map((adulterant) => (
                  <div
                    key={adulterant}
                    className="px-3 py-2 bg-amber-light/10 border border-amber/20 rounded-lg text-xs text-ink-muted"
                  >
                    ⚠️ {adulterant}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
