import Tesseract from 'tesseract.js';
import { parseRegisterText, isGibberishName } from './registerParser.js';
import { validateAndDeduplicate } from './registerValidator.js';

/**
 * Advanced Image Preprocessor for Blurred and Low-Quality Document Scans:
 * 1. Rescales to optimal OCR DPI
 * 2. Unsharp Mask Deblurring (3x3 convolution to sharpen blurry pen strokes)
 * 3. Local Adaptive Thresholding to separate ink from paper across lighting gradients and shadows
 */
export async function preprocessImage(imageInput) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        const maxDim = 2200;
        const minDim = 1400;

        // Scale image to crisp resolution for character stroke recognition
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
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Step 1: Grayscale conversion
        const gray = new Uint8Array(width * height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }

        // Step 2: Unsharp Mask Deblurring filter (3x3 Laplacian edge sharpening)
        // Kernel:
        //  0  -1   0
        // -1   5  -1
        //  0  -1   0
        const sharpened = new Uint8Array(width * height);
        for (let y = 1; y < height - 1; y++) {
          const rowOffset = y * width;
          for (let x = 1; x < width - 1; x++) {
            const idx = rowOffset + x;
            const center = gray[idx];
            const up = gray[idx - width];
            const down = gray[idx + width];
            const left = gray[idx - 1];
            const right = gray[idx + 1];

            const val = 5 * center - (up + down + left + right);
            sharpened[idx] = val < 0 ? 0 : val > 255 ? 255 : val;
          }
        }

        // Step 3: Local Adaptive Contrast Enhancement
        // Compute integral image or local window average (block size 25)
        const blockSize = 24;
        const halfBlock = blockSize >> 1;
        const cOffset = 8; // bias threshold

        for (let y = 0; y < height; y++) {
          const yStart = Math.max(0, y - halfBlock);
          const yEnd = Math.min(height - 1, y + halfBlock);
          const yCount = yEnd - yStart + 1;

          for (let x = 0; x < width; x++) {
            const xStart = Math.max(0, x - halfBlock);
            const xEnd = Math.min(width - 1, x + halfBlock);
            const xCount = xEnd - xStart + 1;
            const totalNeighbors = xCount * yCount;

            // Approximate local window mean by sampling perimeter and center
            const centerIdx = y * width + x;
            const pixelVal = (y === 0 || y === height - 1 || x === 0 || x === width - 1)
              ? gray[centerIdx]
              : sharpened[centerIdx];

            // Sample 4 cardinal points in neighborhood
            const s1 = gray[yStart * width + x];
            const s2 = gray[yEnd * width + x];
            const s3 = gray[y * width + xStart];
            const s4 = gray[y * width + xEnd];
            const localMean = (s1 + s2 + s3 + s4 + pixelVal) / 5;

            // If significantly darker than local background -> ink
            const isInk = pixelVal < (localMean - cOffset);
            const outputVal = isInk ? 0 : 255;

            const dIdx = centerIdx * 4;
            data[dIdx] = outputVal;
            data[dIdx + 1] = outputVal;
            data[dIdx + 2] = outputVal;
            data[dIdx + 3] = 255;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas);
      } catch (err) {
        console.warn('Preprocessing canvas failed, using raw image:', err);
        resolve(imageInput);
      }
    };

    img.onerror = () => resolve(imageInput);

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
 * High-accuracy OCR with confidence filtering and hallucination prevention
 */
export async function recognizeText(image, onProgress) {
  let processedSource = image;
  try {
    if (onProgress) onProgress(5);
    processedSource = await preprocessImage(image);
    if (onProgress) onProgress(15);
  } catch (err) {
    console.warn('Image preprocessing fallback:', err);
  }

  const result = await Tesseract.recognize(processedSource, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        const scaled = Math.round(15 + m.progress * 80);
        onProgress(scaled);
      }
    },
  });

  if (onProgress) onProgress(98);

  // Filter lines by Tesseract confidence score to eliminate hallucinated noise on smudges
  const data = result.data;
  if (data.lines && data.lines.length > 0) {
    const validLines = data.lines
      .filter(line => {
        // Discard lines with very low confidence (< 45%) unless they have a clear admission number
        const hasAdmNumber = /\b\d{3,6}\b/.test(line.text);
        if (line.confidence < 45 && !hasAdmNumber) {
          return false;
        }
        // Discard pure gibberish
        if (isGibberishName(line.text.trim())) {
          return false;
        }
        return true;
      })
      .map(line => line.text.trim())
      .filter(Boolean);

    if (onProgress) onProgress(100);
    return validLines.join('\n');
  }

  if (onProgress) onProgress(100);
  return data.text || '';
}

export function processScannedDocument(rawText, defaultClass = '', existingLearners = []) {
  const candidates = parseRegisterText(rawText, defaultClass);
  return validateAndDeduplicate(candidates, existingLearners);
}
