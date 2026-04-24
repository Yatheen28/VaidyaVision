import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import DropZone from '../components/DropZone';
import LoadingLeaf from '../components/LoadingLeaf';
import { API_URL } from '../config';

const SPECIES_OPTIONS = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi'];

export default function Compare() {
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [techniquesOpen, setTechniquesOpen] = useState(false);

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  }, []);

  const handleCompare = useCallback(async () => {
    if (!selectedFile || !selectedSpecies) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('uploaded_image', selectedFile);
      formData.append('selected_species', selectedSpecies);

      const response = await fetch(`${API_URL}/classical-compare`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Server returned ${response.status}: ${errText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Comparison failed:', err);
      setError(
        'Could not connect to the backend. Please ensure the server is running at ' + API_URL
      );
    } finally {
      setLoading(false);
    }
  }, [selectedFile, selectedSpecies]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setSelectedSpecies('');
    setTechniquesOpen(false);
  }, []);

  const getVerdictStyles = (color) => {
    switch (color) {
      case 'green':
        return 'bg-authentic-bg border-authentic text-authentic';
      case 'red':
        return 'bg-suspicious-bg border-suspicious text-suspicious';
      case 'orange':
        return 'bg-amber-light/20 border-amber text-amber-dark';
      default:
        return 'bg-gray-100 border-gray-300 text-ink-muted';
    }
  };

  const renderSimilarityRow = (label, value, bold = false) => {
    const pct = Math.round(value * 100);
    return (
      <div key={label} className={`flex items-center gap-4 ${bold ? 'py-3' : 'py-2'}`}>
        <span className={`w-44 flex-shrink-0 text-sm ${bold ? 'font-bold text-ink' : 'text-ink-muted'}`}>
          {label}
        </span>
        <div className="flex-1 h-2.5 bg-forest-50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            className={`h-full rounded-full ${bold ? 'bg-forest-700' : 'bg-sage'}`}
          />
        </div>
        <span className={`w-12 text-right text-sm ${bold ? 'font-bold text-ink' : 'text-ink-muted'}`}>
          {pct}%
        </span>
      </div>
    );
  };

  const renderImageColumn = (title, edgesB64, veinsB64, claheB64) => (
    <div className="glass-card-solid p-6">
      <h3 className="font-display text-base font-semibold text-ink mb-4">{title}</h3>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            Canny Edge Detection
          </p>
          <img
            src={`data:image/jpeg;base64,${edgesB64}`}
            alt="Canny edge detection"
            className="w-full rounded-xl border border-forest-100"
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            Vein Pattern (Morphological)
          </p>
          <img
            src={`data:image/jpeg;base64,${veinsB64}`}
            alt="Vein pattern"
            className="w-full rounded-xl border border-forest-100"
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            CLAHE Enhanced
          </p>
          <img
            src={`data:image/jpeg;base64,${claheB64}`}
            alt="CLAHE enhanced"
            className="w-full rounded-xl border border-forest-100"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-16 bg-surface">
      <div className="section-container">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink">
            Classical Comparison
          </h1>
          <p className="text-ink-muted mt-2 max-w-lg mx-auto text-sm">
            Compare a suspect leaf against a genuine reference using classical DIP techniques
            such as edge detection, morphological analysis, and histogram equalisation.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {/* ============ INPUT SECTION ============ */}
          {!result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass-card-solid p-6 md:p-8 max-w-2xl mx-auto">
                {/* Species Dropdown */}
                <div className="mb-6">
                  <label htmlFor="compare-species" className="block text-sm font-medium text-ink mb-2">
                    Select Species
                  </label>
                  <div className="relative">
                    <select
                      id="compare-species"
                      value={selectedSpecies}
                      onChange={(e) => setSelectedSpecies(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-forest-200 bg-white text-ink text-sm
                                 focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage
                                 appearance-none cursor-pointer transition-colors"
                    >
                      <option value="" disabled>Choose a species...</option>
                      {SPECIES_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  </div>
                </div>

                {/* Upload Zone */}
                <p className="text-sm font-medium text-ink mb-2">Upload the suspect leaf image</p>
                <DropZone onFileSelect={handleFileSelect} />

                {/* Compare Button */}
                <div className="mt-6">
                  {loading ? (
                    <LoadingLeaf text="Comparing with genuine reference..." />
                  ) : (
                    <button
                      onClick={handleCompare}
                      disabled={!selectedFile || !selectedSpecies}
                      className={`w-full btn-primary text-base py-3.5 ${
                        !selectedFile || !selectedSpecies ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <Search size={18} />
                      Compare with Genuine Reference
                    </button>
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-suspicious-bg border border-suspicious/20 rounded-xl text-sm text-suspicious flex items-start gap-2"
                  >
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ============ RESULTS SECTION ============ */}
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Verdict Banner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className={`p-6 rounded-2xl border-2 text-center ${getVerdictStyles(result.verdict_color)}`}
              >
                <h2 className="font-display text-xl md:text-2xl font-bold">
                  {result.verdict_message}
                </h2>
              </motion.div>

              {/* Image Comparison Columns */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid md:grid-cols-2 gap-6"
              >
                {renderImageColumn(
                  'Your Uploaded Leaf',
                  result.comparison.suspect_edges_b64,
                  result.comparison.suspect_veins_b64,
                  result.comparison.suspect_clahe_b64
                )}
                {renderImageColumn(
                  `Genuine Reference (${result.selected_species})`,
                  result.comparison.reference_edges_b64,
                  result.comparison.reference_veins_b64,
                  result.comparison.reference_clahe_b64
                )}
              </motion.div>

              {/* Similarity Scores */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card-solid p-6"
              >
                <h3 className="font-display text-lg font-semibold text-ink mb-4">
                  Similarity Scores
                </h3>
                <div className="space-y-1">
                  {renderSimilarityRow('Color Similarity', result.comparison.color_similarity)}
                  {renderSimilarityRow('Texture Similarity', result.comparison.texture_similarity)}
                  {renderSimilarityRow('Vein Pattern Similarity', result.comparison.vein_similarity)}
                  <div className="border-t border-forest-100 mt-2 pt-2">
                    {renderSimilarityRow('Overall Match', result.comparison.overall_similarity, true)}
                  </div>
                </div>
              </motion.div>

              {/* DIP Techniques Used — Collapsible */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card-solid overflow-hidden"
              >
                <button
                  onClick={() => setTechniquesOpen(!techniquesOpen)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-forest-50/50 transition-colors"
                >
                  <h3 className="font-display text-lg font-semibold text-ink">
                    DIP Techniques Used
                  </h3>
                  {techniquesOpen ? (
                    <ChevronUp className="w-5 h-5 text-ink-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-ink-muted" />
                  )}
                </button>
                <AnimatePresence>
                  {techniquesOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6">
                        <ul className="space-y-2">
                          {result.comparison.dip_techniques.map((technique, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-ink-muted"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-sage mt-1.5 flex-shrink-0" />
                              {technique}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Reset */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <button onClick={handleReset} className="btn-secondary">
                  <RotateCcw size={16} />
                  Compare Another Leaf
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
