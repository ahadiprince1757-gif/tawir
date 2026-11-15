/**
 * TAWI DRE (Document Reconstruction Engine) API Client
 * 
 * Communicates with the local tawi-dre FastAPI backend at http://localhost:8000
 * Provides graceful fallback to in-browser OCR if backend is offline.
 */

const DRE_DEFAULT_URL = 'http://localhost:8000';

export async function checkDREHealth(baseUrl = DRE_DEFAULT_URL) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { online: true, ...data };
    }
    return { online: false };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

export async function processWithDRE(file, documentType = 'attendance_register', baseUrl = DRE_DEFAULT_URL) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const res = await fetch(`${baseUrl}/documents/process`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DRE Backend returned status ${res.status}: ${errText}`);
  }

  const result = await res.json();
  return result;
}

export async function verifyDRECell(documentId, row, column, mark, baseUrl = DRE_DEFAULT_URL) {
  const url = `${baseUrl}/documents/${documentId}/verify?row=${row}&column=${column}&verified_mark=${encodeURIComponent(mark)}`;
  const res = await fetch(url, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error(`Failed to verify cell: ${res.statusText}`);
  }

  return await res.json();
}
