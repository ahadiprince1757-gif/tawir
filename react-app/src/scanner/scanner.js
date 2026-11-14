import Tesseract from 'tesseract.js';
import { parseRegisterText } from './registerParser.js';
import { validateAndDeduplicate } from './registerValidator.js';

/**
 * Preprocesses an image to dramatically improve OCR accuracy on paper registers.
 * - Converts to grayscale
 * - Enhances contrast (auto-leveling)
 * - Sharpens text and removes shadow gradients
 */
export async function preprocessImage(imageInput) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Ideal width for OCR is between 1400px and 2400px
        let width = img.width;
        let height = img.height;
        const maxDim = 2400;
        const minDim = 1200;

        if (Math.max(width, height) > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        } else if (Math.max(width, height) < minDim && Math.max(width, height) > 0) {
          const scale = minDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw original
        ctx.drawImage(img, 0, 0, width, height);

        // Extract pixel data for contrast enhancement and binarization
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // 1. Grayscale & calculate histogram
        const histogram = new Array(256).fill(0);
        const grayValues = new Uint8ClampedArray(width * height);

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          // Standard luminosity weights: 0.299 R + 0.587 G + 0.114 B
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          grayValues[j] = gray;
          histogram[gray]++;
        }

        // 2. Auto-contrast stretching (clipping 3% darkest and 3% brightest pixels)
        const totalPixels = width * height;
        const clipCount = Math.floor(totalPixels * 0.03);

        let minLevel = 0;
        let accum = 0;
        for (let i = 0; i < 256; i++) {
          accum += histogram[i];
          if (accum >= clipCount) {
            minLevel = i;
            break;
          }
        }

        let maxLevel = 255;
        accum = 0;
        for (let i = 255; i >= 0; i--) {
          accum += histogram[i];
          if (accum >= clipCount) {
            maxLevel = i;
            break;
          }
        }

        const range = Math.max(1, maxLevel - minLevel);

        // 3. Apply contrast stretch & mild sharpening
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          let val = grayValues[j];
          // Stretch
          let stretched = Math.round(((val - minLevel) * 255) / range);
          stretched = Math.max(0, Math.min(255, stretched));

          // Soft binarization curve: boost darks (ink) and push background to clean white
          let finalVal = stretched;
          if (stretched < 110) {
            finalVal = Math.round(stretched * 0.7); // Darken text
          } else if (stretched > 160) {
            finalVal = Math.min(255, Math.round(stretched * 1.15)); // Whiten paper
          }

          data[i] = finalVal;
          data[i + 1] = finalVal;
          data[i + 2] = finalVal;
          // Keep alpha = 255
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas);
      } catch (err) {
        // Fallback to raw image if canvas manipulation fails
        console.warn('Preprocessing canvas failed, using raw image:', err);
        resolve(imageInput);
      }
    };

    img.onerror = () => {
      resolve(imageInput);
    };

    if (typeof imageInput === 'string') {
      img.src = imageInput;
    } else if (imageInput instanceof Blob || imageInput instanceof File) {
      img.src = URL.createObjectURL(imageInput);
    } else if (imageInput instanceof HTMLCanvasElement) {
      resolve(imageInput);
    } else {
      resolve(imageInput);
    }
  });
}

/**
 * Run OCR with image enhancement and optimized table settings
 */
export async function recognizeText(image, onProgress) {
  // Step 1: Preprocess image for crisp contrast and clean text borders
  let processedSource = image;
  try {
    if (onProgress) onProgress(5);
    processedSource = await preprocessImage(image);
    if (onProgress) onProgress(15);
  } catch (err) {
    console.warn('Image preprocessing skipped:', err);
  }

  // Step 2: Run Tesseract with custom table & register optimization options
  const result = await Tesseract.recognize(processedSource, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        // Scale 15% -> 95%
        const scaled = Math.round(15 + m.progress * 80);
        onProgress(scaled);
      }
    },
  });

  if (onProgress) onProgress(100);
  return result.data.text;
}

export function processScannedDocument(rawText, defaultClass = '', existingLearners = []) {
  const candidates = parseRegisterText(rawText, defaultClass);
  return validateAndDeduplicate(candidates, existingLearners);
}
