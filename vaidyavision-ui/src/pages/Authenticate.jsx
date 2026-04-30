import { useState, useCallback } from 'react';
import { compressImage } from '../utils/compressImage';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf, RotateCcw, CheckCircle, XCircle, AlertTriangle,
  HelpCircle, ShieldAlert, ChevronDown, ChevronUp, Shield,
} from 'lucide-react';
import DropZone from '../components/DropZone';
import LoadingLeaf from '../components/LoadingLeaf';
import ConfidenceGauge from '../components/ConfidenceGauge';
import PredictionChart from '../components/PredictionChart';
import { MOCK_MODE, API_URL, MOCK_DELAY } from '../config';
import { SPECIES_DATA } from '../data/speciesData';

const SPECIES_OPTIONS = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi'];

const MOCK_RESPONSE = {
  verdict: {
    status: 'AUTHENTIC', short_msg: 'Genuine Tulsi leaf confirmed',
    detail_msg: 'The model identified this as Tulsi with 92.3% confidence, supported by 81% feature similarity to the reference leaf.',
    color: 'green', fused_score: 0.887, fused_score_pct: 88.7, is_authentic: true,
  },
  dl: {
    species: 'Tulsi', confidence: 0.923, confidence_pct: 92.3,
    all_probs: { Amla: 0.01, Ashwagandha: 0.02, Bhrami: 0.01, Curry: 0.02, Neem: 0.01, Tulsi: 0.923 },
  },
  classical: {
    color_similarity_pct: 85.0, texture_similarity_pct: 78.0, vein_similarity_pct: 79.0,
    overall_similarity_pct: 81.0,
    verdict: 'High similarity -- visual features closely match the genuine reference.',
    suspect_edges_b64: null, suspect_veins_b64: null, suspect_clahe_b64: null,
    reference_edges_b64: null, reference_veins_b64: null, reference_clahe_b64: null,
  },
  selected_species: null, target_species: 'Tulsi',
  species_info: { uses: 'Immunity, respiratory health, stress, sacred plant', adulterants: 'Other Ocimum varieties (identical appearance)', ayush: 'Sacred plant and cornerstone of Ayurvedic medicine' },
};

/* ── Dark theme verdict badge config ── */
const VERDICT_CONFIG = {
  AUTHENTIC:   { icon: CheckCircle,   bg: 'rgba(82,183,136,0.12)',  border: 'rgba(82,183,136,0.3)',  text: '#75daa8' },
  ADULTERATED: { icon: XCircle,       bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.3)', text: '#ff6b6b' },
  SUSPICIOUS:  { icon: AlertTriangle, bg: 'rgba(244,162,97,0.12)',  border: 'rgba(244,162,97,0.3)',  text: '#ffb780' },
  VERIFY:      { icon: ShieldAlert,   bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.3)',  text: '#fcd34d' },
  UNKNOWN:     { icon: HelpCircle,    bg: 'rgba(136,148,139,0.12)', border: 'rgba(136,148,139,0.3)', text: '#88948b' },
};

/* ── Similarity bar (dark) ── */
function SimilarityBar({ label, pct }) {
  const color = pct >= 75 ? '#52B788' : pct >= 55 ? '#F4A261' : '#ff6b6b';
  return (
    <div>
      <div className="flex justify-between text-xs text-ink-muted mb-1">
        <span>{label}</span>
        <span className="font-mono font-medium" style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(62,73,66,0.5)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

/* ── Visual comparison panel (dark) ── */
function VisualPanel({ title, suspectB64, referenceB64, technique }) {
  if (!suspectB64 || !referenceB64) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="label-caps text-ink-muted">{title}</span>
        <span className="text-xs text-ink-light">{technique}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center">
          <img src={`data:image/jpeg;base64,${suspectB64}`} alt={`Uploaded ${title}`}
            className="w-full rounded-lg ghost-border bg-surface" />
          <p className="text-xs text-ink-muted mt-1">Uploaded leaf</p>
        </div>
        <div className="text-center">
          <img src={`data:image/jpeg;base64,${referenceB64}`} alt={`Reference ${title}`}
            className="w-full rounded-lg ghost-border bg-surface" />
          <p className="text-xs text-ink-muted mt-1">Reference leaf</p>
        </div>
      </div>
    </div>
  );
}

/* ── Classical comparison collapsible (dark) ── */
function ClassicalComparison({ classical, targetSpecies, mismatchNote }) {
  const [open, setOpen] = useState(false);
  if (!classical) return null;
  const { color_similarity_pct, texture_similarity_pct, vein_similarity_pct, overall_similarity_pct, verdict } = classical;
  const scoreColor = overall_similarity_pct >= 75 ? '#52B788' : overall_similarity_pct >= 55 ? '#F4A261' : '#ff6b6b';

  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-5 text-left">
        <div>
          <div className="text-sm font-semibold text-white">Feature Verification</div>
          <div className="text-xs text-ink-muted mt-0.5">
            Similarity vs {targetSpecies} reference:{' '}
            <span className="font-mono font-semibold" style={{ color: scoreColor }}>
              {overall_similarity_pct.toFixed(0)}%
            </span>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-5">
              {mismatchNote && (
                <div className="flex items-start gap-2 text-xs rounded-lg p-3" style={{ background: 'rgba(244,162,97,0.08)', border: '1px solid rgba(244,162,97,0.2)', color: '#ffb780' }}>
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{mismatchNote}</span>
                </div>
              )}
              <p className="text-xs text-ink-muted leading-relaxed rounded-lg p-3" style={{ background: 'rgba(62,73,66,0.3)' }}>{verdict}</p>
              <div className="space-y-2.5">
                <SimilarityBar label="Color Analysis" pct={color_similarity_pct} />
                <SimilarityBar label="Texture Analysis" pct={texture_similarity_pct} />
                <SimilarityBar label="Vein Pattern" pct={vein_similarity_pct} />
              </div>
              <div className="space-y-5 pt-1">
                <div className="h-px" style={{ background: 'rgba(62,73,66,0.5)' }} />
                <VisualPanel title="Edge Detection" technique="Gaussian blur + Canny" suspectB64={classical.suspect_edges_b64} referenceB64={classical.reference_edges_b64} />
                <VisualPanel title="Vein Pattern" technique="Morphological closing" suspectB64={classical.suspect_veins_b64} referenceB64={classical.reference_veins_b64} />
                <VisualPanel title="Contrast Enhancement" technique="CLAHE normalisation" suspectB64={classical.suspect_clahe_b64} referenceB64={classical.reference_clahe_b64} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════ MAIN ═══════════════ */
export default function Authenticate() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState('not_sure');

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file); setResult(null); setError(null);
    if (file) { const r = new FileReader(); r.onload = (e) => setImagePreview(e.target.result); r.readAsDataURL(file); }
    else setImagePreview(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setLoading(true); setError(null);
    try {
      if (MOCK_MODE) { await new Promise(r => setTimeout(r, MOCK_DELAY)); setResult(MOCK_RESPONSE); }
      else {
        const compressed = await compressImage(selectedFile);
        const fd = new FormData(); fd.append('image', compressed);
        if (selectedSpecies !== 'not_sure') fd.append('selected_species', selectedSpecies);
        const res = await fetch(`${API_URL}/predict`, { method: 'POST', body: fd });
        if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`Server ${res.status}: ${t}`); }
        setResult(await res.json());
      }
    } catch (err) {
      const isNet = err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError');
      setError(MOCK_MODE ? 'Mock analysis failed.' : isNet ? `Cannot reach backend at ${API_URL}. Ensure firewall allows port 8000.` : `Analysis failed: ${err.message}`);
    } finally { setLoading(false); }
  }, [selectedFile, selectedSpecies]);

  const handleReset = useCallback(() => { setSelectedFile(null); setImagePreview(null); setResult(null); setError(null); setSelectedSpecies('not_sure'); }, []);

  const verdict = result?.verdict, dl = result?.dl, classical = result?.classical;
  const targetSpecies = result?.target_species;
  const speciesInfo = targetSpecies ? SPECIES_DATA?.[targetSpecies] : null;
  const badgeCfg = verdict ? (VERDICT_CONFIG[verdict.status] || VERDICT_CONFIG.UNKNOWN) : null;

  return (
    <div className="min-h-screen pt-20 pb-16 bg-surface">
      <div className="section-container">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 md:mb-12">
          <div className="glass-pill inline-flex items-center gap-2 text-sage-light mb-4">
            <Shield size={14} className="text-sage" />
            Dual-Layer Verification
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-heading">
            Authenticate a Leaf
          </h1>
          <p className="text-ink-muted mt-2 max-w-md mx-auto text-sm">
            Upload a photo of any medicinal leaf for instant species authentication and confidence scoring.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {/* ── Upload ── */}
          {!result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="glass-card p-6 md:p-8">
                {/* Species selector */}
                <div className="mb-6">
                  <label htmlFor="species-select" className="block text-sm font-medium text-white mb-2">
                    Select Species (optional)
                  </label>
                  <div className="relative">
                    <select id="species-select" value={selectedSpecies} onChange={e => setSelectedSpecies(e.target.value)}
                      className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sage"
                      style={{ background: 'rgba(32,45,36,0.8)', border: '1px solid rgba(82,183,136,0.2)' }}>
                      <option value="not_sure">I'm not sure — identify it for me</option>
                      {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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

                <div className="mt-6">
                  {loading ? <LoadingLeaf text="Analyzing leaf..." /> : (
                    <button onClick={handleAnalyze} disabled={!selectedFile}
                      className={`w-full btn-primary text-base py-3.5 ${!selectedFile ? 'opacity-40 cursor-not-allowed' : ''}`}>
                      <Leaf size={18} /> Analyze Leaf
                    </button>
                  )}
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 rounded-xl text-sm flex items-start gap-2"
                    style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', color: '#ff6b6b' }}>
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

          {/* ── Results ── */}
          {result && verdict && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* Verdict card */}
              <div className="glass-card p-6">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {imagePreview && (
                    <motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      src={imagePreview} alt="Analyzed leaf"
                      className="w-36 h-36 object-cover rounded-xl ghost-border shadow-glass flex-shrink-0" />
                  )}
                  <div className="flex-1 text-center md:text-left">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm"
                      style={{ background: badgeCfg.bg, border: `1px solid ${badgeCfg.border}`, color: badgeCfg.text }}>
                      <badgeCfg.icon className="w-5 h-5 flex-shrink-0" />
                      <div className="font-semibold">{verdict.short_msg}</div>
                    </motion.div>
                    <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                      className="font-display text-3xl font-bold text-white mt-3">{targetSpecies}</motion.h2>
                    {speciesInfo?.hindiName && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                        className="text-sm text-ink-muted mt-0.5">{speciesInfo.hindiName}</motion.p>
                    )}
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                      className="text-xs text-ink-muted mt-2 leading-relaxed">{verdict.detail_msg}</motion.p>
                  </div>
                </div>
              </div>

              {/* Gauge + Chart */}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="glass-card p-6 flex flex-col items-center justify-center">
                  <p className="label-caps text-ink-muted mb-3">Authentication Score</p>
                  <ConfidenceGauge value={verdict.fused_score} />
                  {classical && (
                    <p className="text-xs text-ink-muted mt-2 text-center font-mono">
                      DL: {dl.confidence_pct.toFixed(0)}% | Feature: {classical.overall_similarity_pct.toFixed(0)}%
                    </p>
                  )}
                  <p className="text-[10px] text-ink-light mt-1 text-center italic">
                    Score = 60% DL model + 40% feature analysis
                  </p>
                </div>
                <div className="glass-card p-6">
                  <PredictionChart predictions={dl.all_probs} topSpecies={dl.species} />
                </div>
              </div>

              {/* Feature Verification */}
              <ClassicalComparison classical={classical} targetSpecies={targetSpecies} mismatchNote={verdict.mismatch_note} />

              {/* Species Info */}
              {speciesInfo && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-6">
                  <h3 className="font-display text-lg font-semibold text-white mb-3">About {targetSpecies}</h3>
                  {speciesInfo.description && <p className="text-sm text-ink-muted mb-4">{speciesInfo.description}</p>}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {speciesInfo.uses && (
                      <div>
                        <h4 className="label-caps text-ink-muted mb-2">AYUSH Medicinal Uses</h4>
                        <div className="space-y-1.5">
                          {speciesInfo.uses.map(use => (
                            <div key={use} className="flex items-center gap-2 text-sm text-ink">
                              <div className="w-1.5 h-1.5 rounded-full bg-sage flex-shrink-0" /> {use}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      {speciesInfo.traits && (
                        <>
                          <h4 className="label-caps text-ink-muted mb-2">Key Features</h4>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {speciesInfo.traits.map(t => (
                              <span key={t} className="px-2.5 py-1 text-xs font-medium rounded-full text-sage-light"
                                style={{ background: 'rgba(82,183,136,0.1)' }}>{t}</span>
                            ))}
                          </div>
                        </>
                      )}
                      {speciesInfo.adulterants && (
                        <div>
                          <h4 className="label-caps text-ink-muted mb-1.5">Common Adulterants</h4>
                          {speciesInfo.adulterants.map(a => (
                            <p key={a} className="text-xs flex items-center gap-1" style={{ color: '#ffb780' }}>
                              <AlertTriangle size={11} className="flex-shrink-0" /> {a}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Reset */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center">
                <button onClick={handleReset} className="btn-secondary">
                  <RotateCcw size={16} /> Analyze Another Leaf
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}