import { useState, useCallback, useRef, useEffect } from 'react';
import { compressImage } from '../utils/compressImage';
import { motion } from 'framer-motion';
import { Layers, RotateCcw, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import DropZone from '../components/DropZone';
import LoadingLeaf from '../components/LoadingLeaf';
import { MOCK_MODE, API_URL, MOCK_DELAY, AUTH_THRESHOLD } from '../config';

const MOCK_BULK_RESPONSE = {
  detections: [
    { id: 1, bbox: [50, 30, 200, 180], species: 'Neem', confidence_pct: 87.0, fused_score_pct: 82.0, is_authentic: true, status: 'AUTHENTIC', short_msg: 'Genuine Neem leaf confirmed' },
    { id: 2, bbox: [220, 50, 380, 200], species: 'Tulsi', confidence_pct: 92.0, fused_score_pct: 88.0, is_authentic: true, status: 'AUTHENTIC', short_msg: 'Genuine Tulsi leaf confirmed' },
    { id: 3, bbox: [100, 220, 280, 380], species: 'Curry', confidence_pct: 58.0, fused_score_pct: 52.0, is_authentic: false, status: 'SUSPICIOUS', short_msg: 'Low confidence' },
    { id: 4, bbox: [310, 200, 460, 360], species: 'Amla', confidence_pct: 81.0, fused_score_pct: 76.0, is_authentic: true, status: 'AUTHENTIC', short_msg: 'Genuine Amla leaf confirmed' },
  ],
  annotated_image_b64: null,
  summary: { total: 4, authenticated: 3, suspicious: 1 },
};

const SPECIES_COLORS = {
  Amla: '#4ADE80', Ashwagandha: '#A78BFA', Bhrami: '#22D3EE',
  Curry: '#FBBF24', Neem: '#34D399', Tulsi: '#F472B6',
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
    setSelectedFile(file); setResult(null); setError(null); setAnnotatedSrc(null);
    if (file) { const r = new FileReader(); r.onload = (e) => setImagePreview(e.target.result); r.readAsDataURL(file); }
    else setImagePreview(null);
  }, []);

  // Draw mock bounding boxes on canvas when in MOCK_MODE
  useEffect(() => {
    if (!result || !imagePreview || result.annotated_image_b64) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      result.detections.forEach((det) => {
        const [x1, y1, x2, y2] = det.bbox;
        const scaleX = img.width / 500, scaleY = img.height / 400;
        const sx1 = x1 * scaleX, sy1 = y1 * scaleY, sw = (x2 - x1) * scaleX, sh = (y2 - y1) * scaleY;
        const color = SPECIES_COLORS[det.species] || '#52B788';
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(sx1, sy1, sw, sh);
        ctx.fillStyle = color;
        const label = `${det.species} ${det.fused_score_pct || det.confidence_pct}%`;
        const tm = ctx.measureText(label);
        ctx.fillRect(sx1, sy1 - 24, tm.width + 12, 24);
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(label, sx1 + 6, sy1 - 7);
      });
      setAnnotatedSrc(canvas.toDataURL());
    };
    img.src = imagePreview;
  }, [result, imagePreview]);

  const handleDetect = useCallback(async () => {
    if (!selectedFile) return;
    setLoading(true); setError(null);
    try {
      if (MOCK_MODE) { await new Promise(r => setTimeout(r, MOCK_DELAY)); setResult(MOCK_BULK_RESPONSE); }
      else {
        const compressed = await compressImage(selectedFile, 1600, 0.88);
        const fd = new FormData(); fd.append('image', compressed);
        const res = await fetch(`${API_URL}/bulk-predict`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        data.detections = data.detections.map(d => ({ ...d }));
        setResult(data);
        if (data.annotated_image_b64) setAnnotatedSrc(`data:image/jpeg;base64,${data.annotated_image_b64}`);
      }
    } catch (err) {
      const isNet = err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError');
      setError(MOCK_MODE ? 'Mock detection failed.' : isNet ? `Cannot reach backend at ${API_URL}. Ensure firewall allows port 8000.` : `Detection failed: ${err.message}`);
    } finally { setLoading(false); }
  }, [selectedFile]);

  const handleReset = useCallback(() => { setSelectedFile(null); setImagePreview(null); setResult(null); setError(null); setAnnotatedSrc(null); }, []);

  const pieData = result ? [
    { name: 'Authenticated', value: result.summary.authenticated, color: '#52B788' },
    { name: 'Suspicious', value: result.summary.suspicious || (result.summary.total - result.summary.authenticated), color: '#ff6b6b' },
  ] : [];

  return (
    <div className="min-h-screen pt-20 pb-16 bg-surface">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 md:mb-12">
          <div className="glass-pill inline-flex items-center gap-2 text-amber-light mb-4">
            <Layers size={14} className="text-amber" /> Batch Processing
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-heading">
            Bulk Leaf Detection
          </h1>
          <p className="text-ink-muted mt-2 max-w-md mx-auto text-sm">
            Upload an image containing multiple leaves for batch species detection and authentication.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* LEFT: Upload */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="glass-card p-6 md:p-8 sticky top-24">
              <h2 className="text-sm font-semibold text-white mb-4">Upload Image</h2>
              <DropZone onFileSelect={handleFileSelect} />
              <p className="text-xs text-ink-light mt-3">Upload an image containing multiple medicinal leaves</p>
              <div className="mt-6">
                {loading ? <LoadingLeaf text="Detecting leaves..." /> : (
                  <div className="flex gap-3">
                    <button onClick={handleDetect} disabled={!selectedFile}
                      className={`flex-1 btn-primary ${!selectedFile ? 'opacity-40 cursor-not-allowed' : ''}`}>
                      <Layers size={16} /> Detect All Leaves
                    </button>
                    {result && (
                      <button onClick={handleReset} className="btn-secondary px-4"><RotateCcw size={16} /></button>
                    )}
                  </div>
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
          </motion.div>

          {/* RIGHT: Results */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            {!result && !loading && (
              <div className="glass-card p-12 text-center">
                <Layers className="w-12 h-12 text-ink-light mx-auto mb-4" />
                <p className="text-sm text-ink-muted">Upload an image and click "Detect All Leaves" to see results here.</p>
              </div>
            )}

            {result && (
              <>
                {/* Annotated Image */}
                <div className="glass-card p-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Annotated Image</h3>
                    {result.detection_method && (
                      <span className="glass-pill text-xs font-semibold" style={{
                        color: result.detection_method === 'yolo' ? '#52B788' : '#F4A261',
                        background: result.detection_method === 'yolo' ? 'rgba(82,183,136,0.1)' : 'rgba(244,162,97,0.1)',
                      }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5"
                          style={{ background: result.detection_method === 'yolo' ? '#52B788' : '#F4A261' }} />
                        {result.detection_method === 'yolo' ? 'YOLOv8 Detection' : result.detection_method === 'dip' ? 'DIP Segmentation' : 'Grid Scan'}
                      </span>
                    )}
                  </div>
                  {annotatedSrc ? (
                    <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      src={annotatedSrc} alt="Annotated detection result" className="w-full rounded-xl" />
                  ) : (
                    <div className="h-48 rounded-xl flex items-center justify-center text-ink-muted text-sm"
                      style={{ background: 'rgba(62,73,66,0.3)' }}>Processing...</div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Summary */}
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-white mb-4">Summary</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-28 h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div className="text-3xl font-bold font-display text-white">
                        {result.summary.authenticated}{' '}
                        <span className="text-lg font-normal text-ink-muted">/ {result.summary.total}</span>
                      </div>
                      <p className="text-sm text-ink-muted">Authenticated Leaves</p>
                      {result.detection_method === 'yolo' && (
                        <p className="text-xs text-sage mt-1 font-medium">Detected via YOLO object detection</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detection Table */}
                <div className="glass-card overflow-hidden">
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(62,73,66,0.5)' }}>
                    <h3 className="text-sm font-semibold text-white">Detection Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: 'rgba(32,45,36,0.5)' }}>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted">Species</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted">Confidence</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.detections.map((det, i) => (
                          <motion.tr key={det.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            style={{ borderBottom: '1px solid rgba(62,73,66,0.3)' }}>
                            <td className="px-4 py-3 text-sm text-ink-muted">{det.id}</td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-white">{det.species}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(62,73,66,0.5)' }}>
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${det.fused_score_pct || det.confidence_pct}%` }}
                                    transition={{ duration: 0.8, delay: 0.1 * i }} className="h-full rounded-full"
                                    style={{ background: det.is_authentic ? '#52B788' : '#ff6b6b' }} />
                                </div>
                                <span className="text-xs font-mono text-ink-muted">{det.fused_score_pct || det.confidence_pct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
                                style={{
                                  background: det.is_authentic ? 'rgba(82,183,136,0.12)' : 'rgba(255,107,107,0.12)',
                                  color: det.is_authentic ? '#75daa8' : '#ff6b6b',
                                }}>
                                {det.status || (det.is_authentic ? 'Authentic' : 'Suspicious')}
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
