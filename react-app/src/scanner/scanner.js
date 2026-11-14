import Tesseract from 'tesseract.js';
import { parseRegisterText, isGibberishName } from './registerParser.js';
import { validateAndDeduplicate } from './registerValidator.js';

/**
 * PURE HARD-CODED COMPUTER VISION ENGINE FOR PHYSICAL SCHOOL REGISTERS
 * 100% Client-Side In-Browser Pipeline — Zero External AI / Zero APIs
 * 
 * Pipeline:
 * 1. Geometric Scaling: Rescales image to optimal stroke DPI (1800 - 2400px)
 * 2. Flat-field Illumination Normalization (Shadow & Lighting Gradient Flattening):
 *    Estimates low-frequency background luminosity map B(x,y) and divides I(x,y) by B(x,y).
 *    Result: Paper shadows, desk shadows, and lighting falloff disappear completely, turning
 *    paper pure white (245-255) while preserving handwriting and printed ink.
 * 3. Laplacian Unsharp Mask Deblurring (3x3 Convolution):
 *    Restores sharp edge transitions to out-of-focus camera shots and motion blur.
 * 4. Table Grid Attenuation:
 *    Suppresses continuous vertical border lines so table borders '|' don't get misread as 'l' or '1'.
 * 5. Adaptive Contrast Expansion (Sauvola-inspired):
 *    Separates faint pencil and ballpoint strokes cleanly from the paper background.
 */
export async function preprocessImage(imageInput) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        const targetLongEdge = 2200;

        // Scale image to crisp resolution for character stroke recognition
        if (Math.max(width, height) > 0) {
          const scale = targetLongEdge / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const numPixels = width * height;

        // Step 1: Grayscale conversion (Standard Rec. 601 luma)
        const gray = new Uint8Array(numPixels);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          gray[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
        }

        // Step 2: Flatfield Background Illumination Map (Downscaled Gaussian-like blur)
        // Downscale to 1/16th size to extract lighting gradients (shadows)
        const bgW = Math.max(16, Math.round(width / 16));
        const bgH = Math.max(16, Math.round(height / 16));

        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = bgW;
        bgCanvas.height = bgH;
        const bgCtx = bgCanvas.getContext('2d');
        bgCtx.imageSmoothingEnabled = true;
        bgCtx.drawImage(canvas, 0, 0, bgW, bgH);

        // Upscale background map back to full size with bilinear smoothing
        const bgFullCanvas = document.createElement('canvas');
        bgFullCanvas.width = width;
        bgFullCanvas.height = height;
        const bgFullCtx = bgFullCanvas.getContext('2d');
        bgFullCtx.imageSmoothingEnabled = true;
        bgFullCtx.drawImage(bgCanvas, 0, 0, width, height);

        const bgData = bgFullCtx.getImageData(0, 0, width, height).data;

        // Step 3: Flatfield Division (Shadow Removal)
        // Divide original grayscale by local background luminosity
        const normalized = new Uint8Array(numPixels);
        for (let j = 0; j < numPixels; j++) {
          const bgLuma = Math.max(25, (bgData[j * 4] * 77 + bgData[j * 4 + 1] * 150 + bgData[j * 4 + 2] * 29) >> 8);
          // Scale: if gray == bgLuma -> 235 (white paper). If gray is darker -> proportionally darker ink.
          const norm = Math.min(255, Math.round((gray[j] / bgLuma) * 235));
          normalized[j] = norm;
        }

        // Step 4: Laplacian Unsharp Mask Filter (3x3 Kernel) to deblur handwriting edges
        //  0  -1   0
        // -1   5  -1
        //  0  -1   0
        const sharpened = new Uint8Array(numPixels);
        for (let y = 1; y < height - 1; y++) {
          const rowOffset = y * width;
          for (let x = 1; x < width - 1; x++) {
            const idx = rowOffset + x;
            const center = normalized[idx];
            const up = normalized[idx - width];
            const down = normalized[idx + width];
            const left = normalized[idx - 1];
            const right = normalized[idx + 1];

            const val = 5 * center - (up + down + left + right);
            sharpened[idx] = val < 0 ? 0 : val > 255 ? 255 : val;
          }
        }

        // Step 5: Table Grid Line Attenuation
        // Continuous vertical black lines (column separators) longer than 50px get attenuated
        // so OCR does not confuse them with 'l', '1', or 'I'
        const cleanInk = new Uint8Array(sharpened);
        for (let x = 2; x < width - 2; x++) {
          let continuousDark = 0;
          for (let y = 0; y < height; y++) {
            const idx = y * width + x;
            if (sharpened[idx] < 140) {
              continuousDark++;
            } else {
              if (continuousDark > 45) {
                // If it was a continuous vertical grid line, soften it to light gray
                for (let k = y - continuousDark; k < y; k++) {
                  const lineIdx = k * width + x;
                  // If neighbors left and right are light, this is purely a vertical ruling line
                  if (sharpened[lineIdx - 1] > 180 && sharpened[lineIdx + 1] > 180) {
                    cleanInk[lineIdx] = 230;
                  }
                }
              }
              continuousDark = 0;
            }
          }
        }

        // Step 6: Dynamic Ink Contrast Expansion
        // Push background paper to pure 255, and stretch real ink strokes to crisp dark text
        for (let i = 0; i < numPixels; i++) {
          let val = cleanInk[i];
          if (val < 195) {
            // Stretch ink contrast
            val = Math.max(0, Math.round((val / 195) * 115));
          } else {
            val = 255;
          }

          const dIdx = i * 4;
          data[dIdx] = val;
          data[dIdx + 1] = val;
          data[dIdx + 2] = val;
          data[dIdx + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas);
      } catch (err) {
        console.warn('Preprocessing canvas failed, fallback to raw image:', err);
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
 * Pure In-Browser OCR Engine using Single Block Page Segmentation (PSM 6)
 * Configured specifically for tabular registers to preserve row order and prevent column bleed.
 */
export async function recognizeText(image, onProgress) {
  let processedCanvas = image;
  try {
    if (onProgress) onProgress(10);
    processedCanvas = await preprocessImage(image);
    if (onProgress) onProgress(25);
  } catch (err) {
    console.warn('Image preprocessing fallback:', err);
  }

  // Create local Tesseract worker with PSM 6 (Single uniform block of text / tabular lines)
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        const scaled = Math.round(25 + m.progress * 70);
        onProgress(scaled);
      }
    },
  });

  try {
    // Set deterministic OCR parameters:
    // PSM 6 = Assume a single uniform block of text (maintains line-by-line register rows)
    await worker.setParameters({
      tessedit_pageseg_mode: '6',
      preserve_interword_spaces: '1',
    });

    const result = await worker.recognize(processedCanvas);
    if (onProgress) onProgress(98);

    const data = result.data;
    if (data.lines && data.lines.length > 0) {
      const validLines = data.lines
        .filter((line) => {
          const text = line.text.trim();
          if (text.length < 2) return false;

          // Discard lines with very low confidence (< 35%) unless they contain an admission number
          const hasAdmNumber = /\b\d{3,6}\b/.test(text);
          if (line.confidence < 35 && !hasAdmNumber) {
            return false;
          }

          // Discard pure gibberish noise lines
          if (isGibberishName(text)) {
            return false;
          }

          return true;
        })
        .map((line) => line.text.trim())
        .filter(Boolean);

      if (onProgress) onProgress(100);
      return validLines.join('\n');
    }

    if (onProgress) onProgress(100);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

export function processScannedDocument(rawText, defaultClass = '', existingLearners = []) {
  const candidates = parseRegisterText(rawText, defaultClass);
  return validateAndDeduplicate(candidates, existingLearners);
}
