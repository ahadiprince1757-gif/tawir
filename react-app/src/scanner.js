import Tesseract from 'tesseract.js';

/**
 * Run OCR on an image (canvas element, img element, File, Blob, or data-URL).
 * Returns the extracted text. `onProgress(0-100)` fires during recognition.
 */
export async function recognizeText(image, onProgress) {
  const result = await Tesseract.recognize(image, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text;
}

/**
 * Post-process raw OCR text into an array of cleaned-up names.
 * Handles common register formats:
 *   1. Brian Mwangi        ->  Brian Mwangi
 *   2) Mary Wanjiku        ->  Mary Wanjiku
 *   - John Kamau           ->  John Kamau
 *   Aisha Hassan           ->  Aisha Hassan
 */
export function extractNames(rawText) {
  if (!rawText) return [];

  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 1)
    .map((line) => {
      // Strip leading numbering: "1.", "1)", "1 ", "- ", "• "
      return line.replace(/^[\d#.\-•)\s]+/, '').trim();
    })
    .filter((line) => {
      // Keep lines that look like names (mostly letters, at least 2 chars)
      if (line.length < 2) return false;
      const alphaCount = (line.match(/[A-Za-z]/g) || []).length;
      return alphaCount / line.length > 0.7;
    })
    .map((name) => {
      // Title-case each word
      return name
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    })
    .filter((name, i, arr) => arr.indexOf(name) === i);
}
