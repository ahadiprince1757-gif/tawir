/**
 * UNIVERSAL SCHOOL DIGITIZATION REVIEW RECORD
 *
 * Standard metadata structure for every photographed page, regardless of document type.
 * References image metadata rather than storing heavy byte streams directly.
 */

export function createDocumentRecord({
  originalFile,
  correctedCanvas,
  classification = {},
  quality = {},
}) {
  const safeId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);

  return {
    id: safeId,

    source: {
      originalFile: originalFile
        ? {
            name: originalFile.name || 'document_scan.jpg',
            size: originalFile.size || 0,
            type: originalFile.type || 'image/jpeg',
            lastModified: originalFile.lastModified || Date.now(),
          }
        : null,
      capturedAt: new Date().toISOString(),
    },

    document: {
      type: classification.type || 'unknown',
      label: classification.label || 'Unknown Document',
      classificationStatus: classification.status || 'needs_review',
      classificationConfidence: classification.confidence || 0,

      dimensions: {
        width: correctedCanvas?.width || null,
        height: correctedCanvas?.height || null,
      },
    },

    quality: {
      status: quality.quality || quality.status || 'acceptable',
      metrics: quality.metrics || {},
      issues: quality.issues || [],
    },

    extraction: {
      status: 'pending',
      records: [],
      errors: [],
    },

    verification: {
      status: 'not_started',
      verifiedBy: null,
      verifiedAt: null,
    },

    import: {
      status: 'not_imported',
      importedAt: null,
      importedBy: null,
    },
  };
}
