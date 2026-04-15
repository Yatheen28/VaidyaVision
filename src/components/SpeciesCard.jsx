import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

// Color map for each species
const SPECIES_COLORS = {
  Amla: { bg: 'bg-emerald-50', text: 'text-emerald-700', accent: '#4ADE80' },
  Ashwagandha: { bg: 'bg-purple-50', text: 'text-purple-700', accent: '#A78BFA' },
  Bhrami: { bg: 'bg-cyan-50', text: 'text-cyan-700', accent: '#22D3EE' },
  Curry: { bg: 'bg-amber-50', text: 'text-amber-700', accent: '#FBBF24' },
  Neem: { bg: 'bg-green-50', text: 'text-green-700', accent: '#34D399' },
  Tulsi: { bg: 'bg-pink-50', text: 'text-pink-700', accent: '#F472B6' },
};

export default function SpeciesCard({ name, data, index = 0, onClick }) {
  const colors = SPECIES_COLORS[name] || SPECIES_COLORS.Neem;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="glass-card-solid group cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Colored header with leaf initial */}
      <div
        className={`relative h-44 ${colors.bg} flex items-center justify-center overflow-hidden`}
      >
        {/* Decorative leaves */}
        <motion.div
          className="absolute -top-4 -right-4 opacity-10"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <Leaf size={120} color={colors.accent} />
        </motion.div>
        <motion.div
          className="absolute -bottom-2 -left-2 opacity-10 rotate-45"
          animate={{ rotate: [45, 55, 35, 45] }}
          transition={{ duration: 8, repeat: Infinity }}
        >
          <Leaf size={80} color={colors.accent} />
        </motion.div>

        {/* Species initial */}
        <div
          className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center shadow-glass"
          style={{ backgroundColor: `${colors.accent}20`, borderColor: colors.accent, borderWidth: 2 }}
        >
          <span className={`text-3xl font-display font-bold ${colors.text}`}>
            {name[0]}
          </span>
        </div>

        {/* Accuracy badge */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-white/80 backdrop-blur-sm text-xs font-semibold text-forest-800">
          {data.modelAccuracy} accuracy
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <h3 className="font-display text-xl font-semibold text-ink">{name}</h3>
        <p className="text-xs text-ink-muted mt-0.5 font-medium">{data.hindiName}</p>
        <p className="text-sm text-ink-muted mt-2 line-clamp-2">{data.description}</p>

        {/* Traits */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {data.traits.slice(0, 3).map((trait) => (
            <span
              key={trait}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text}`}
            >
              {trait}
            </span>
          ))}
        </div>

        {/* View Details */}
        <button className="mt-4 text-sm font-medium text-sage group-hover:text-forest-800 transition-colors flex items-center gap-1">
          View Details
          <motion.span
            className="inline-block"
            initial={{ x: 0 }}
            whileHover={{ x: 4 }}
          >
            →
          </motion.span>
        </button>
      </div>
    </motion.div>
  );
}
