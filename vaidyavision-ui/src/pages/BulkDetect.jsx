import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, RotateCcw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import DropZone from '../components/DropZone';
import LoadingLeaf from '../components/LoadingLeaf';
import { MOCK_MODE, API_URL, MOCK_DELAY, AUTH_THRESHOLD } from '../config';

// Mock bulk detection response
const MOCK_BULK_RESPONSE = {
  detections: [
    { id: 1, bbox: [50, 30, 200, 180], species: 'Neem', confidence: 0.87, authentic: true },
    { id: 2, bbox: [220, 50, 380, 200], species: 'Tulsi', confidence: 0.92, authentic: true },
    { id: 3, bbox: [100, 220, 280, 380], species: 'Curry', confidence: 0.58, authentic: false },
    { id: 4, bbox: [310, 200, 460, 360], species: 'Amla', confidence: 0.81, authentic: true },
  ],
  annotated_image_base64: null,
  summary: { total: 4, authenticated: 3 },
};

const SPECIES_COLORS = {
  Amla: '#4ADE80',
  Ashwagandha: '#A78BFA',
  Bhrami: '#22D3EE',
  Curry: '#FBBF24',
  Neem: '#34D399',
  Tulsi: '#F472B6',
};

export default function BulkDetect() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [annotatedSrc, setAnnotatedSrc] = useState(null);
  const canvasRef = useRef(null);

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setAnnotatedSrc(null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }, []);

  // Draw mock bounding boxes on canvas when in MOCK_MODE
  useEffect(() => {
    if (!result || !imagePreview || result.annotated_image_base64) return;
    // In mock mode, draw boxes on the uploaded image
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      result.detections.forEach((det) => {
        const [x1, y1, x2, y2] = det.bbox;
        // Scale bbox to image dimensions
        const scaleX = img.width / 500;
        const scaleY = img.height / 400;
        const sx1 = x1 * scaleX;
        const sy1 = y1 * scaleY;
        const sw = (x2 - x1) * scaleX;
        const sh = (y2 - y1) * scaleY;

        const color = SPECIES_COLORS[det.species] || '#52B788';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(sx1, sy1, sw, sh);

        // Label background
        ctx.fillStyle = color;
        const label = `${det.species} ${(det.confidence * 100).toFixed(0)}%`;
        const textMetrics = ctx.measureText(label);
        ctx.fillRect(sx1, sy1 - 24, textMetrics.width + 12, 24);

        // Label text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(label, sx1 + 6, sy1 - 7);
      });

      setAnnotatedSrc(canvas.toDataURL());
    };
    img.src = imagePreview;
  }, [result, imagePreview]);

  const handleDetect = useCallback(async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    try {
      if (MOCK_MODE) {
        await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));
        setResult(MOCK_BULK_RESPONSE);
      } else {
        const formData = new FormData();
        formData.append('image', selectedFile);

        const response = await fetch(`${API_URL}/bulk-predict`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const data = await response.json();
        // Mark authentic based on threshold
        data.detections = data.detections.map((d) => ({
          ...d,
          authentic: d.authentic ?? (d.confidence >= AUTH_THRESHOLD),
        }));
        setResult(data);

        // If backend provides annotated image
        if (data.annotated_image_base64) {
          setAnnotatedSrc(`data:image/jpeg;base64,${data.annotated_image_base64}`);
        }
      }
    } catch (err) {
      console.error('Bulk detection failed:', err);
      setError(
        MOCK_MODE
          ? 'Mock detection failed unexpectedly.'
          : 'Could not connect to backend. Is the server running?'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setAnnotatedSrc(null);
  }, []);

  const pieData = result
    ? [
        { name: 'Authenticated', value: result.summary.authenticated, color: '#2D6A4F' },
        { name: 'Suspicious', value: result.summary.total - result.summary.authenticated, color: '#9B1C1C' },
      ]
    : [];

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
            Bulk Leaf Detection
          </h1>
          <p className="text-ink-muted mt-2 max-w-md mx-auto text-sm">
            Upload an image containing multiple leaves for batch species detection and authentication.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* ============ LEFT: UPLOAD ============ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass-card-solid p-6 md:p-8 sticky top-24">
              <h2 className="text-sm font-semibold text-ink mb-4">Upload Image</h2>
              <DropZone onFileSelect={handleFileSelect} />

              <p className="text-xs text-ink-light mt-3">
                Upload an image containing multiple medicinal leaves
              </p>

              <div className="mt-6">
                {loading ? (
                  <LoadingLeaf text="Detecting leaves..." />
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleDetect}
                      disabled={!selectedFile}
                      className={`flex-1 btn-primary ${
                        !selectedFile ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <Layers size={16} />
                      Detect All Leaves
                    </button>
                    {result && (
                      <button onClick={handleReset} className="btn-secondary px-4">
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-suspicious-bg border border-suspicious/20 rounded-xl text-sm text-suspicious"
                >
                  ⚠️ {error}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* ============ RIGHT: RESULTS ============ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {!result && !loading && (
              <div className="glass-card-solid p-12 text-center">
                <Layers className="w-12 h-12 text-ink-light mx-auto mb-4" />
                <p className="text-sm text-ink-muted">
                  Upload an image and click "Detect All Leaves" to see results here.
                </p>
              </div>
            )}

            {result && (
              <>
                {/* Annotated Image */}
                <div className="glass-card-solid p-4 overflow-hidden">
                  <h3 className="text-sm font-semibold text-ink mb-3">Annotated Image</h3>
                  {annotatedSrc ? (
                    <motion.img
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={annotatedSrc}
                      alt="Annotated detection result"
                      className="w-full rounded-xl"
                    />
                  ) : (
                    <div className="h-48 bg-surface rounded-xl flex items-center justify-center text-ink-muted text-sm">
                      Processing...
                    </div>
                  )}
                  {/* Hidden canvas for mock bbox drawing */}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Summary Stats */}
                <div className="glass-card-solid p-6">
                  <h3 className="text-sm font-semibold text-ink mb-4">Summary</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-28 h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div className="text-3xl font-bold font-display text-ink">
                        {result.summary.authenticated}{' '}
                        <span className="text-lg font-normal text-ink-muted">
                          / {result.summary.total}
                        </span>
                      </div>
                      <p className="text-sm text-ink-muted">Authenticated Leaves</p>
                    </div>
                  </div>
                </div>

                {/* Detection Table */}
                <div className="glass-card-solid overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-ink">Detection Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-surface-muted">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted">Species</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted">Confidence</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.detections.map((det, i) => (
                          <motion.tr
                            key={det.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="border-b border-gray-50 last:border-0"
                          >
                            <td className="px-4 py-3 text-sm text-ink-muted">{det.id}</td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-ink">{det.species}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${det.confidence * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.1 * i }}
                                    className="h-full rounded-full"
                                    style={{
                                      backgroundColor: det.authentic ? '#2D6A4F' : '#9B1C1C',
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-ink-muted">
                                  {(det.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  det.authentic
                                    ? 'bg-authentic-bg text-authentic'
                                    : 'bg-suspicious-bg text-suspicious'
                                }`}
                              >
                                {det.authentic ? 'Authentic' : 'Suspicious'}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
