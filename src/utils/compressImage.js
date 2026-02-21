import { PHOTO_MAX_SIZE, PHOTO_QUALITY, PHOTO_FORMAT } from '../config';

/**
 * Compresse et redimensionne une image (File) avant de la stocker en base64.
 * Retourne une Promise<string> avec le data URL compressé.
 *
 * @param {File} file — Le fichier image uploadé
 * @param {object} [options]
 * @param {number} [options.maxSize] — Dimension max (px)
 * @param {number} [options.quality] — Qualité JPEG (0–1)
 * @param {string} [options.format] — MIME type de sortie
 * @returns {Promise<string>} data URL compressé
 */
export default function compressImage(file, options = {}) {
  const maxSize = options.maxSize ?? PHOTO_MAX_SIZE;
  const quality = options.quality ?? PHOTO_QUALITY;
  const format = options.format ?? PHOTO_FORMAT;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions while keeping aspect ratio
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      // Draw to offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed data URL
      const dataUrl = canvas.toDataURL(format, quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de charger l\'image'));
    };

    img.src = url;
  });
}
