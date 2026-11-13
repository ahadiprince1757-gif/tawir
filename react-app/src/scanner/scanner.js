import Tesseract from 'tesseract.js';
import { parseRegisterText } from './registerParser.js';
import { validateAndDeduplicate } from './registerValidator.js';

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

export function processScannedDocument(rawText, defaultClass = '', existingLearners = []) {
  const candidates = parseRegisterText(rawText, defaultClass);
  return validateAndDeduplicate(candidates, existingLearners);
}
