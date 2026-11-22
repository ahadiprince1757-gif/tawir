/**
 * Result Normalizer
 * 
 * Handles differing assessment maximums and applies explicit, configured weighting rules.
 * Does not round intermediate numbers to preserve full mathematical precision.
 */

export const WEIGHTING_MODELS = {
  EQUAL_PER_MARK: 'equal_per_mark', // Raw sum of obtained marks divided by sum of maximums
  WEIGHTED_COMPONENTS: 'weighted_components', // Weighted sum of percentage contributions
};

/**
 * Normalizes and calculates a composite score from multiple assessment items
 * 
 * @param {Array} items - List of { score, outOf, weight }
 * @param {string} model - WEIGHTING_MODELS value
 * @returns {Object} { totalScore, totalOutOf, percentage }
 */
export function normalizeAssessments(items = [], model = WEIGHTING_MODELS.EQUAL_PER_MARK) {
  if (!items || items.length === 0) {
    return null;
  }

  // Filter valid, non-missing items
  const valid = items.filter(
    i => i && typeof i.score === 'number' && typeof i.outOf === 'number' && i.outOf > 0
  );

  if (valid.length === 0) {
    return null;
  }

  if (model === WEIGHTING_MODELS.WEIGHTED_COMPONENTS) {
    let weightedSum = 0;
    let totalWeight = 0;
    let rawScoreSum = 0;
    let rawOutOfSum = 0;

    for (const item of valid) {
      const w = typeof item.weight === 'number' && item.weight > 0 ? item.weight : 1.0;
      const pct = (item.score / item.outOf) * 100;
      weightedSum += pct * w;
      totalWeight += w;
      rawScoreSum += item.score;
      rawOutOfSum += item.outOf;
    }

    if (totalWeight <= 0) return null;

    const finalPercentage = weightedSum / totalWeight;
    return {
      rawScore: rawScoreSum,
      rawOutOf: rawOutOfSum,
      percentage: finalPercentage,
      isWeighted: true,
      itemsCount: valid.length,
    };
  }

  // Default: EQUAL_PER_MARK (sum(scores) / sum(outOf) * 100)
  let sumScore = 0;
  let sumOutOf = 0;

  for (const item of valid) {
    sumScore += item.score;
    sumOutOf += item.outOf;
  }

  if (sumOutOf <= 0) return null;

  return {
    rawScore: sumScore,
    rawOutOf: sumOutOf,
    percentage: (sumScore / sumOutOf) * 100,
    isWeighted: false,
    itemsCount: valid.length,
  };
}
