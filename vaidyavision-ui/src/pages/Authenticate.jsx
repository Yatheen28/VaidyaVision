import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Leaf, RotateCcw, CheckCircle, XCircle, AlertTriangle, HelpCircle, ChevronDown } from 'lucide-react';
import DropZone from '../components/DropZone';
import LoadingLeaf from '../components/LoadingLeaf';
import AuthBadge from '../components/AuthBadge';
import ConfidenceGauge from '../components/ConfidenceGauge';
import PredictionChart from '../components/PredictionChart';
import { MOCK_MODE, API_URL, MOCK_DELAY, AUTH_THRESHOLD } from '../config';
import { SPECIES_DATA } from '../data/speciesData';

const SPECIES_OPTIONS = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi'];

// Mock API response
const MOCK_RESPONSE = {
  species: 'Tulsi',
  confidence: 0.923,
  authentic: true,
  all_probs: {
    Amla: 0.01,
    Ashwagandha: 0.02,
    Bhrami: 0.01,
    Curry: 0.02,
    Neem: 0.01,
    Tulsi: 0.93,
  },
};

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
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));
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
        // Map response — backend returns: predicted_species, predicted_confidence, authentic, all_probs, status, message
        setResult({
          species: data.predicted_species,
          confidence: data.predicted_confidence,
          authentic: data.authentic ?? (data.predicted_confidence >= AUTH_THRESHOLD),
          all_probs: data.all_probs || {},
          status: data.status,
          message: data.message,
          selected_species: data.selected_species || null,
        });
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(
        MOCK_MODE
          ? 'Mock analysis failed unexpectedly.'
          : 'Could not connect to the backend. Please ensure the server is running at ' + API_URL
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

  const speciesInfo = result ? SPECIES_DATA[result.species] : null;

  // Renders the status badge for species-selected authentication mode
  const renderStatusBadge = () => {
    if (!result || !result.selected_species) return null;

    const badgeConfig = {
      AUTHENTIC: {
        icon: CheckCircle,
        title: `Confirmed Genuine ${result.selected_species}`,
        subtitle: null,
        classes: 'bg-authentic-bg text-authentic border-authentic/20',
      },
      ADULTERATED: {
        icon: XCircle,
        title: 'Adulteration Detected',
        subtitle: result.message,
        classes: 'bg-suspicious-bg text-suspicious border-suspicious/20',
      },
      SUSPICIOUS: {
        icon: AlertTriangle,
        title: 'Low Confidence \u2014 Possibly Adulterated',
        subtitle: null,
        classes: 'bg-amber-light/20 text-amber-dark border-amber/20',
      },
      UNKNOWN: {
        icon: HelpCircle,
        title: 'Cannot Identify \u2014 Try a Clearer Image',
        subtitle: null,
        classes: 'bg-gray-100 text-ink-muted border-gray-200',
      },
    };

    const config = badgeConfig[result.status] || badgeConfig.UNKNOWN;
    const Icon = config.icon;

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
        className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm border ${config.classes}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-base">{config.title}</div>
          {config.subtitle && (
            <div className="text-xs opacity-80 mt-0.5">{config.subtitle}</div>
          )}
        </div>
      </motion.div>
    );
  };

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
                      onChange={(e) => setSelectedSpecies(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-forest-200 bg-white text-ink text-sm
                                 focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage
                                 appearance-none cursor-pointer transition-colors"
                    >
                      <option value="not_sure">Not sure &mdash; identify for me</option>
                      {SPECIES_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  </div>
                  <p className="text-xs text-ink-light mt-1.5">
                    Select a species to verify authenticity, or leave as &ldquo;Not sure&rdquo; for identification.
                  </p>
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
                      className={`w-full btn-primary text-base py-3.5 ${
                        !selectedFile ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <Leaf size={18} />
                      Analyze Leaf
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

              {/* Hint text */}
              <p className="text-center text-xs text-ink-light mt-4">
                Supported species: Amla, Ashwagandha, Bhrami, Curry Leaf, Neem, Tulsi
              </p>
            </motion.div>
          )}

          {/* ============ RESULTS SECTION ============ */}
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Image + Badge Row */}
              <div className="glass-card-solid p-6">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* Uploaded image */}
                  {imagePreview && (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={imagePreview}
                      alt="Analyzed leaf"
                      className="w-40 h-40 object-cover rounded-xl border border-forest-100 shadow-card"
                    />
                  )}

                  {/* Auth badge or status badge + species name */}
                  <div className="flex-1 text-center md:text-left">
                    {result.selected_species ? (
                      /* Species-selected mode: show status badge */
                      renderStatusBadge()
                    ) : (
                      /* Generic mode: existing AuthBadge + species name */
                      <>
                        <AuthBadge
                          authentic={result.authentic}
                          species={result.species}
                          confidence={result.confidence}
                        />
                        <motion.h2
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="font-display text-3xl font-bold text-ink mt-4"
                        >
                          {result.species}
                        </motion.h2>
                        {speciesInfo && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-sm text-ink-muted mt-1"
                          >
                            {speciesInfo.hindiName}
                          </motion.p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Confidence Gauge + Chart */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Gauge */}
                <div className="glass-card-solid p-6 flex flex-col items-center justify-center">
                  <ConfidenceGauge value={result.confidence} />
                </div>

                {/* Prediction chart */}
                <div className="glass-card-solid p-6">
                  <PredictionChart
                    predictions={result.all_probs}
                    topSpecies={result.species}
                  />
                </div>
              </div>

              {/* Species Info Card */}
              {speciesInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="glass-card-solid p-6"
                >
                  <h3 className="font-display text-lg font-semibold text-ink mb-4">
                    About {result.species}
                  </h3>
                  <p className="text-sm text-ink-muted mb-4">{speciesInfo.description}</p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Medicinal Uses */}
                    <div>
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                        AYUSH Medicinal Uses
                      </h4>
                      <div className="space-y-1.5">
                        {speciesInfo.uses.map((use) => (
                          <div
                            key={use}
                            className="flex items-center gap-2 text-sm text-ink"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-sage" />
                            {use}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Visual Traits */}
                    <div>
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                        Key Identification Features
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {speciesInfo.traits.map((trait) => (
                          <span
                            key={trait}
                            className="px-2.5 py-1 bg-forest-50 text-forest-800 text-xs font-medium rounded-full"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>

                      {/* Adulterants warning */}
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                          Common Adulterants
                        </h4>
                        {speciesInfo.adulterants.map((a) => (
                          <p key={a} className="text-xs text-amber-dark flex items-center gap-1">
                            <AlertTriangle size={11} className="flex-shrink-0" />
                            {a}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Analyze Another */}
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
