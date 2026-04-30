import { useCallback, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, Image } from 'lucide-react';

export default function DropZone({ onFileSelect, accept = '.jpg,.jpeg,.png' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) { alert('Please select a JPG or PNG image.'); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }, [handleFile]);
  const handleInputChange = useCallback((e) => { handleFile(e.target.files?.[0]); }, [handleFile]);
  const clearSelection = useCallback(() => { setPreview(null); setFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; if (cameraInputRef.current) cameraInputRef.current.value = ''; onFileSelect(null); }, [onFileSelect]);

  return (
    <div className="w-full">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
          isDragging ? 'scale-[1.02]' : ''
        }`}
        style={{
          borderColor: isDragging ? '#52B788' : preview ? 'rgba(82,183,136,0.2)' : 'rgba(82,183,136,0.15)',
          background: isDragging ? 'rgba(82,183,136,0.08)' : preview ? 'rgba(21,34,26,0.4)' : 'rgba(21,34,26,0.3)',
        }}
        whileHover={{ scale: preview ? 1 : 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {preview ? (
          <div className="p-4">
            <div className="relative group">
              <img src={preview} alt="Selected leaf" className="w-full max-h-64 object-contain rounded-xl bg-surface" />
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                className="absolute top-2 right-2 p-1.5 rounded-lg shadow-glass transition-colors text-ink-muted hover:text-red-400"
                style={{ background: 'rgba(9,22,14,0.8)', backdropFilter: 'blur(8px)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            </div>
            <p className="mt-2 text-xs text-ink-muted text-center truncate">{fileName}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-8 md:p-12" onClick={() => fileInputRef.current?.click()}>
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(82,183,136,0.1)' }}
              animate={isDragging ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: isDragging ? Infinity : 0 }}
            >
              <Upload className="w-7 h-7 text-sage" />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Drag and drop a leaf image</p>
              <p className="text-xs text-ink-muted mt-1">or click to browse — JPG, PNG only</p>
            </div>
            <div className="flex gap-3 mt-2">
              <button type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors text-sage-light hover:bg-white/5"
                style={{ background: 'rgba(82,183,136,0.08)' }}>
                <Image size={14} /> Gallery
              </button>
              <button type="button"
                onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors text-sage-light hover:bg-white/5"
                style={{ background: 'rgba(82,183,136,0.08)' }}>
                <Camera size={14} /> Camera
              </button>
            </div>
          </div>
        )}
      </motion.div>
      <input ref={fileInputRef} type="file" accept={accept} onChange={handleInputChange} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleInputChange} className="hidden" />
    </div>
  );
}
