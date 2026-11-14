import Tesseract from 'tesseract.js';
import { parseRegisterText, isGibberishName } from './registerParser.js';
import { validateAndDeduplicate } from './registerValidator.js';

/**
 * Super Scanner Computer Vision Preprocessor:
 * Designed to handle blurry camera shots, uneven shadows, and low-contrast handwriting.
 * 
 * Pipeline:
 * 1. Rescale to optimal OCR resolution (1600-2400px longest edge)
 * 2. Background Illumination Normalization (Shadow flattening via flatfield division):
 *    Divides pixel values by a low-frequency background map to erase phone shadows and uneven lighting.
 * 3. Laplacian Unsharp Mask Deblurring:
 *    Recovers crisp stroke edges from optical motion blur and soft focus.
 * 4. Dynamic Contrast Stretching:
 *    Maps faint pencil/ballpoint ink into dark readable strokes on pure white paper.
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
        const minDim = 1500;

        // Scale to optimal character stroke resolution
        if (Math.max(width, height) > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        } else if (Math.max(width, height) < minDim && Math.max(width, height) > 0) {
          const scale = minDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        // Main processing canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const numPixels = width * height;

        // Step 1: Grayscale conversion (Rec. 601 luma)
        const gray = new Uint8Array(numPixels);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }

        // Step 2: Background Illumination Map via downscaled blur (Flatfield division)
        // Downscale to 1/16th size to extract low-frequency illumination gradients (shadows)
        const bgSmallW = Math.max(16, Math.round(width / 16));
        const bgSmallH = Math.max(16, Math.round(height / 16));

        const bgSmallCanvas = document.createElement('canvas');
        bgSmallCanvas.width = bgSmallW;
        bgSmallCanvas.height = bgSmallH;
        const bgSmallCtx = bgSmallCanvas.getContext('2d');
        bgSmallCtx.imageSmoothingEnabled = true;
        bgSmallCtx.drawImage(canvas, 0, 0, bgSmallW, bgSmallH);

        // Upscale blurred background back to full image dimensions
        const bgFullCanvas = document.createElement('canvas');
        bgFullCanvas.width = width;
        bgFullCanvas.height = height;
        const bgFullCtx = bgFullCanvas.getContext('2d');
        bgFullCtx.imageSmoothingEnabled = true;
        bgFullCtx.drawImage(bgSmallCanvas, 0, 0, width, height);

        const bgData = bgFullCtx.getImageData(0, 0, width, height).data;

        // Step 3: Flatfield Division + Laplacian Deblurring
        // Divide original grayscale by local background brightness to eliminate shadows
        const normalized = new Uint8Array(numPixels);
        for (let j = 0; j < numPixels; j++) {
          const bgVal = Math.max(20, Math.round(0.299 * bgData[j * 4] + 0.587 * bgData[j * 4 + 1] + 0.114 * bgData[j * 4 + 2]));
          const norm = Math.min(255, Math.round((gray[j] / bgVal) * 235));
          normalized[j] = norm;
        }

        // Step 4: Laplacian Unsharp Mask Filter (3x3 kernel) to deblur handwriting edges
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

        // Step 5: Adaptive Local Contrast Leveling
        // Turns paper background solid clean white while preserving ink strokes
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            let val = (x === 0 || x === width - 1 || y === 0 || y === height - 1)
              ? normalized[idx]
              : sharpened[idx];

            // Ink thresholding: If pixel is significantly darker than paper background (~215),
            // amplify ink darkness; otherwise push to pure white paper
            if (val < 195) {
              // Stretch ink contrast
              val = Math.max(0, Math.round((val / 195) * 110));
            } else {
              val = 255;
            }

            const dIdx = idx * 4;
            data[dIdx] = val;
            data[dIdx + 1] = val;
            data[dIdx + 2] = val;
            data[dIdx + 3] = 255;
          }
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

  const data = result.data;
  if (data.lines && data.lines.length > 0) {
    const validLines = data.lines
      .filter(line => {
        const text = line.text.trim();
        if (text.length < 2) return false;

        // Discard lines with very low confidence (< 40%) unless they contain a definite admission number
        const hasAdmNumber = /\b\d{3,6}\b/.test(text);
        if (line.confidence < 40 && !hasAdmNumber) {
          return false;
        }

        // Discard pure gibberish / hallucinated noise
        if (isGibberishName(text)) {
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
