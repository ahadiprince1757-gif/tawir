/**
 * Academic Records Validation Engine
 * 
 * Strict boundary checking, precision safety, and integrity verification.
 */

export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export function validateAssessmentRecord({ score, outOf, status = 'submitted' }) {
  if (outOf === undefined || outOf === null || isNaN(outOf) || Number(outOf) <= 0) {
    throw new ValidationError(`Assessment maximum marks (outOf) must be a positive number, got: ${outOf}`);
  }

  if (score === undefined || score === null || score === '') {
    return { isValid: true, isMissing: true };
  }

  const numScore = Number(score);
  const numOutOf = Number(outOf);

  if (isNaN(numScore)) {
    throw new ValidationError(`Score must be a valid number, got: ${score}`);
  }

  if (numScore < 0) {
    throw new ValidationError(`Score cannot be negative: ${numScore}`);
  }

  if (numScore > numOutOf) {
    throw new ValidationError(`Score (${numScore}) exceeds maximum available marks (${numOutOf})`);
  }

  return {
    isValid: true,
    score: numScore,
    outOf: numOutOf,
    percentage: (numScore / numOutOf) * 100,
    isDraft: status === 'draft',
    isMissing: false,
  };
}
