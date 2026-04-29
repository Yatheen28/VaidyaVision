import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf, RotateCcw, CheckCircle, XCircle, AlertTriangle,
  HelpCircle, ShieldAlert, ChevronDown, ChevronUp,
} from 'lucide-react';
import DropZone from '../components/DropZone';
import LoadingLeaf from '../components/LoadingLeaf';
import ConfidenceGauge from '../components/ConfidenceGauge';
import PredictionChart from '../components/PredictionChart';
import { MOCK_MODE, API_URL, MOCK_DELAY } from '../config';
import { SPECIES_DATA } from '../data/speciesData';

const SPECIES_OPTIONS = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi'];

// ── Mock response — matches new backend shape exactly ────────────────────────
const MOCK_RESPONSE = {
  verdict: {
    status: 'AUTHENTIC',
    short_msg: 'Genuine Tulsi leaf confirmed',
    detail_msg: 'The AI model identified this as Tulsi with 92.3% confidence, supported by 81% classical DIP similarity to the reference leaf.',
    color: 'green',
    fused_score: 0.887,
    fused_score_pct: 88.7,
    is_authentic: true,
  },
  dl: {
    species: 'Tulsi',
    confidence: 0.923,
    confidence_pct: 92.3,
    all_probs: {
      Amla: 0.01, Ashwagandha: 0.02, Bhrami: 0.01,
      Curry: 0.02, Neem: 0.01, Tulsi: 0.923,
    },
  },
  classical: {
    color_similarity_pct: 85.0,
    texture_similarity_pct: 78.0,
    vein_similarity_pct: 79.0,
    overall_similarity_pct: 81.0,
    verdict: 'High similarity — DIP features closely match the genuine reference.',
    suspect_edges_b64: null,
    suspect_veins_b64: null,
    suspect_clahe_b64: null,
    reference_edges_b64: null,
    reference_veins_b64: null,
    reference_clahe_b64: null,
  },
  selected_species: null,
  target_species: 'Tulsi',
  species_info: {
    uses: 'Immunity, respiratory health, stress, sacred plant',
    adulterants: 'Other Ocimum varieties (identical appearance)',
    ayush: 'Sacred plant and cornerstone of Ayurvedic medicine',
  },
};

// ── Verdict badge configuration ───────────────────────────────────────────────
const VERDICT_CONFIG = {
  AUTHENTIC: {
    icon: CheckCircle,
    classes: 'bg-green-50 text-green-800 border-green-200',
  },
  ADULTERATED: {
    icon: XCircle,
    classes: 'bg-red-50 text-red-800 border-red-200',
  },
  SUSPICIOUS: {
    icon: AlertTriangle,
    classes: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  VERIFY: {
    icon: ShieldAlert,
    classes: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  UNKNOWN: {
    icon: HelpCircle,
    classes: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

// ── Classical similarity bar ──────────────────────────────────────────────────
function SimilarityBar({ label, pct }) {
  const color =
    pct >= 75 ? 'bg-green-500' :
      pct >= 55 ? 'bg-amber-400' :
        'bg-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs text-ink-muted mb-1">
        <span>{label}</span>
        <span className="font-medium">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

// ── Classical comparison collapsible section ──────────────────────────────────
function ClassicalComparison({ classical }) {
  const [open, setOpen] = useState(false);
  if (!classical) return null;

  const { color_similarity_pct, texture_similarity_pct, vein_similarity_pct, overall_similarity_pct, verdict } = classical;

  return (
    <div className="glass-card-solid overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-ink">
            Classical DIP Verification
          </div>
          <div className="text-xs text-ink-muted mt-0.5">
            Overall similarity: <span className="font-medium text-ink">{overall_similarity_pct.toFixed(0)}%</span>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Verdict text */}
              <p className="text-xs text-ink-muted leading-relaxed">{verdict}</p>

              {/* Similarity bars */}
              <div className="space-y-2.5">
                <SimilarityBar label="Color pattern" pct={color_similarity_pct} />
                <SimilarityBar label="Texture profile" pct={texture_similarity_pct} />
                <SimilarityBar label="Vein structure" pct={vein_similarity_pct} />
              </div>

              {/* Visual comparisons — only if base64 data present */}
              {classical.suspect_edges_b64 && classical.reference_edges_b64 && (
                <div>
                  <div className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                    Edge / Vein Pattern
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <img
                        src={`data:image/jpeg;base64,${classical.suspect_edges_b64}`}
                        alt="Uploaded leaf edges"
                        className="w-full rounded-lg border border-gray-100"
                      />
                      <p className="text-xs text-ink-muted mt-1">Uploaded</p>
                    </div>
                    <div className="text-center">
                      <img
                        src={`data:image/jpeg;base64,${classical.reference_edges_b64}`}
                        alt="Reference leaf edges"
                        className="w-full rounded-lg border border-gray-100"
                      />
                      <p className="text-xs text-ink-muted mt-1">Reference</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function Authenticate() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState('not_sure');

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    try {
      if (MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        setResult(MOCK_RESPONSE);
      } else {
        const formData = new FormData();
        formData.append('image', selectedFile);
        if (selectedSpecies !== 'not_sure') {
          formData.append('selected_species', selectedSpecies);
        }

        const response = await fetch(`${API_URL}/predict`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`Server returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        // data already matches the shape we expect — use it directly
        setResult(data);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(
        MOCK_MODE
          ? 'Mock analysis failed unexpectedly.'
          : `Could not connect to the backend. Please ensure the server is running at ${API_URL}`
      );
    } finally {
      setLoading(false);
    }
  }, [selectedFile, selectedSpecies]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setSelectedSpecies('not_sure');
  }, []);

  // Derived display values — all from verdict (single source of truth)
  const verdict = result?.verdict;
  const dl = result?.dl;
  const classical = result?.classical;
  const targetSpecies = result?.target_species;
  const speciesInfo = targetSpecies ? SPECIES_DATA?.[targetSpecies] : null;

  const badgeCfg = verdict ? (VERDICT_CONFIG[verdict.status] || VERDICT_CONFIG.UNKNOWN) : null;

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
            Leaf Authentication
          </h1>
          <p className="text-ink-muted mt-2 max-w-md mx-auto text-sm">
            Upload a single medicinal leaf image for AI-powered species identification and authentication.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">

          {/* ============ UPLOAD SECTION ============ */}
          {!result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass-card-solid p-6 md:p-8">
                {/* Species Selector */}
                <div className="mb-6">
                  <label htmlFor="species-select" className="block text-sm font-medium text-ink mb-2">
                    Select Species (optional)
                  </label>
                  <div className="relative">
                    <select
                      id="species-select"
                      value={selectedSpecies}
                      onChange={e => setSelectedSpecies(e.target.value)}
                      className="w-full appearance-none bg-white border border-forest-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest-300"
                    >
                      <option value="not_sure">I'm not sure — identify it for me</option>
                      {SPECIES_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <ChevronDown size={16} className="text-ink-muted" />
                    </div>
                  </div>
                  {selectedSpecies !== 'not_sure' && (
                    <p className="text-xs text-ink-muted mt-1.5">
                      The system will verify whether the uploaded leaf is genuine {selectedSpecies}.
                    </p>
                  )}
                </div>

                <DropZone onFileSelect={handleFileSelect} />

                {/* Analyze button */}
                <div className="mt-6">
                  {loading ? (
                    <LoadingLeaf text="Analyzing leaf..." />
                  ) : (
                    <button
                      onClick={handleAnalyze}
                      disabled={!selectedFile}
                      className={`w-full btn-primary text-base py-3.5 ${!selectedFile ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                    >
                      <Leaf size={18} />
                      Analyze Leaf
                    </button>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2"
                  >
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              <p className="text-center text-xs text-ink-light mt-4">
                Supported species: Amla · Ashwagandha · Bhrami · Curry Leaf · Neem · Tulsi
              </p>
            </motion.div>
          )}

          {/* ============ RESULTS SECTION ============ */}
          {result && verdict && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              {/* ── Verdict Card ── */}
              <div className="glass-card-solid p-6">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* Uploaded image */}
                  {imagePreview && (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={imagePreview}
                      alt="Analyzed leaf"
                      className="w-36 h-36 object-cover rounded-xl border border-forest-100 shadow-card flex-shrink-0"
                    />
                  )}

                  {/* Badge + species name */}
                  <div className="flex-1 text-center md:text-left">
                    {/* Verdict badge */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                      className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm border ${badgeCfg.classes}`}
                    >
                      <badgeCfg.icon className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold">{verdict.short_msg}</div>
                      </div>
                    </motion.div>

                    {/* Species name */}
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="font-display text-3xl font-bold text-ink mt-3"
                    >
                      {targetSpecies}
                    </motion.h2>

                    {speciesInfo?.hindiName && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.45 }}
                        className="text-sm text-ink-muted mt-0.5"
                      >
                        {speciesInfo.hindiName}
                      </motion.p>
                    )}

                    {/* Detail message */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-xs text-ink-muted mt-2 leading-relaxed"
                    >
                      {verdict.detail_msg}
                    </motion.p>
                  </div>
                </div>
              </div>

              {/* ── Confidence Gauge + Prediction Chart ── */}
              {/* Gauge shows fused_score — the single source of truth */}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="glass-card-solid p-6 flex flex-col items-center justify-center">
                  <p className="text-xs text-ink-muted font-medium uppercase tracking-wide mb-3">
                    Authentication Score
                  </p>
                  <ConfidenceGauge value={verdict.fused_score} />
                  {classical && (
                    <p className="text-xs text-ink-muted mt-2 text-center">
                      AI {dl.confidence_pct.toFixed(0)}% + DIP {classical.overall_similarity_pct.toFixed(0)}%
                    </p>
                  )}
                </div>

                <div className="glass-card-solid p-6">
                  <PredictionChart
                    predictions={dl.all_probs}
                    topSpecies={dl.species}
                  />
                </div>
              </div>

              {/* ── Classical DIP Verification (collapsible) ── */}
              <ClassicalComparison classical={classical} />

              {/* ── Species Info ── */}
              {speciesInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="glass-card-solid p-6"
                >
                  <h3 className="font-display text-lg font-semibold text-ink mb-3">
                    About {targetSpecies}
                  </h3>
                  {speciesInfo.description && (
                    <p className="text-sm text-ink-muted mb-4">{speciesInfo.description}</p>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Medicinal Uses */}
                    {speciesInfo.uses && (
                      <div>
                        <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                          AYUSH Medicinal Uses
                        </h4>
                        <div className="space-y-1.5">
                          {speciesInfo.uses.map(use => (
                            <div key={use} className="flex items-center gap-2 text-sm text-ink">
                              <div className="w-1.5 h-1.5 rounded-full bg-sage flex-shrink-0" />
                              {use}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Visual Traits + Adulterants */}
                    <div>
                      {speciesInfo.traits && (
                        <>
                          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                            Key Identification Features
                          </h4>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {speciesInfo.traits.map(trait => (
                              <span
                                key={trait}
                                className="px-2.5 py-1 bg-forest-50 text-forest-800 text-xs font-medium rounded-full"
                              >
                                {trait}
                              </span>
                            ))}
                          </div>
                        </>
                      )}

                      {speciesInfo.adulterants && (
                        <div>
                          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                            Common Adulterants
                          </h4>
                          {speciesInfo.adulterants.map(a => (
                            <p key={a} className="text-xs text-amber-700 flex items-center gap-1">
                              <AlertTriangle size={11} className="flex-shrink-0" />
                              {a}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Analyze Another ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center"
              >
                <button onClick={handleReset} className="btn-secondary">
                  <RotateCcw size={16} />
                  Analyze Another Leaf
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}