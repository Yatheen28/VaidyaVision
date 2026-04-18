import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import SpeciesCard from '../components/SpeciesCard';
import SpeciesModal from '../components/SpeciesModal';
import { SPECIES_DATA } from '../data/speciesData';

export default function Species() {
  const [selectedSpecies, setSelectedSpecies] = useState(null);

  const speciesEntries = Object.entries(SPECIES_DATA);

  return (
    <div className="min-h-screen pt-20 pb-16 bg-surface">
      <div className="section-container">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 md:mb-14"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-forest-50 rounded-full text-xs font-semibold text-forest-800 mb-4"
          >
            <BookOpen size={14} className="text-sage" />
            6 AYUSH Medicinal Species
          </motion.div>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink">
            Species Library
          </h1>
          <p className="text-ink-muted mt-2 max-w-lg mx-auto text-sm">
            Explore detailed profiles of each medicinal leaf species our AI model can authenticate, including visual markers, uses, and common adulterants.
          </p>
        </motion.div>

        {/* Species Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {speciesEntries.map(([name, data], index) => (
            <SpeciesCard
              key={name}
              name={name}
              data={data}
              index={index}
              onClick={() => setSelectedSpecies(name)}
            />
          ))}
        </div>

        {/* Species Modal */}
        <SpeciesModal
          isOpen={!!selectedSpecies}
          onClose={() => setSelectedSpecies(null)}
          name={selectedSpecies}
          data={selectedSpecies ? SPECIES_DATA[selectedSpecies] : null}
        />
      </div>
    </div>
  );
}
