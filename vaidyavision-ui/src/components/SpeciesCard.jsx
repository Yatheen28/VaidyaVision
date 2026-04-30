import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

const SPECIES_COLORS = {
  Amla:        { gradient: 'from-emerald-900/40 to-emerald-800/20', accent: '#4ADE80', text: 'text-emerald-400' },
  Ashwagandha: { gradient: 'from-purple-900/40 to-purple-800/20',  accent: '#A78BFA', text: 'text-purple-400' },
  Bhrami:      { gradient: 'from-cyan-900/40 to-cyan-800/20',      accent: '#22D3EE', text: 'text-cyan-400' },
  Curry:       { gradient: 'from-amber-900/40 to-amber-800/20',    accent: '#FBBF24', text: 'text-amber-400' },
  Neem:        { gradient: 'from-green-900/40 to-green-800/20',    accent: '#34D399', text: 'text-green-400' },
  Tulsi:       { gradient: 'from-pink-900/40 to-pink-800/20',      accent: '#F472B6', text: 'text-pink-400' },
};

export default function SpeciesCard({ name, data, index = 0, onClick }) {
  const colors = SPECIES_COLORS[name] || SPECIES_COLORS.Neem;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="glass-card group cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Header gradient */}
      <div className={`relative h-48 bg-gradient-to-br ${colors.gradient} flex flex-col items-center justify-start overflow-hidden`}>
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

        <div className="mt-6 flex justify-center w-full">
          <img
            src={data.image}
            alt={name}
            className="w-24 h-24 object-cover rounded-xl shadow-glass border border-white/10"
          />
        </div>

        <div className="absolute top-2 right-2 glass-pill text-xs font-semibold text-sage-light">
          {data.modelAccuracy}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="font-display text-xl font-semibold text-white">{name}</h3>
        <p className="text-xs text-ink-muted mt-0.5 font-medium">{data.hindiName}</p>
        <p className="text-sm text-ink-muted mt-2 line-clamp-2">{data.description}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {data.traits.slice(0, 3).map((trait) => (
            <span
              key={trait}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.text}`}
              style={{ background: `${colors.accent}15` }}
            >
              {trait}
            </span>
          ))}
        </div>

        <button className="mt-4 text-sm font-medium text-sage group-hover:text-sage-light transition-colors flex items-center gap-1">
          View Details
          <motion.span className="inline-block" initial={{ x: 0 }} whileHover={{ x: 4 }}>
            &rarr;
          </motion.span>
        </button>
      </div>
    </motion.div>
  );
}