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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 md:mb-14"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-pill inline-flex items-center gap-2 text-sage-light mb-4"
          >
            <BookOpen size={14} className="text-sage" />
            6 AYUSH Medicinal Species
          </motion.div>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-heading">
            Species Library
          </h1>
          <p className="text-ink-muted mt-2 max-w-lg mx-auto text-sm">
            Explore detailed profiles of each medicinal leaf species our system can authenticate,
            including visual markers, uses, and common adulterants.
          </p>
        </motion.div>

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
