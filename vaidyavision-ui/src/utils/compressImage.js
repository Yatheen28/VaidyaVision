/**
 * Compress an image file before uploading to the backend.
 * Phone cameras produce 10-20MB images at 4000-8000px resolution.
 * This resizes to max 1200px and compresses to JPEG ~85% quality,
 * reducing file size from ~10MB to ~200KB.
 * 
 * @param {File} file  - Original image file from input/camera
 * @param {number} maxDim - Maximum width/height (default 1200)
 * @param {number} quality - JPEG quality 0-1 (default 0.85)
 * @returns {Promise<File>} - Compressed file ready for FormData
 */
export function compressImage(file, maxDim = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    // Skip if file is already small (< 500KB)
    if (file.size < 500 * 1024) {
      return resolve(file);
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      
      // Only downscale if larger than maxDim
      if (Math.max(width, height) > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Canvas compression failed'));
          const compressed = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          console.log(
            `[VaidyaVision] Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB ` +
            `(${img.naturalWidth}×${img.naturalHeight} → ${width}×${height})`
          );
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: return original file if we can't compress
      resolve(file);
    };

    img.src = url;
  });
}
