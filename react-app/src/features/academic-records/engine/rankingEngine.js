/**
 * Ranking Engine
 * 
 * Class Position calculation with standard competition ranking (1224 ranking)
 * and strict tie preservation.
 * 
 * Rules:
 * - Only ranks eligible learners with sufficient records.
 * - Preserves ties (e.g. two 1st places -> next rank is 3rd).
 * - Never invents ranks for incomplete or excluded records.
 */

export function rankLearners(learnerRecords = [], options = {}) {
  const {
    requireCompleteRecords = false,
    rankingPolicyEnabled = true,
  } = options;

  if (!rankingPolicyEnabled) {
    return learnerRecords.map(r => ({ ...r, rank: null, rankSuffix: '—' }));
  }

  // Determine eligible pool
  const eligible = learnerRecords.filter(r => {
    if (r.overallMean === null || isNaN(r.overallMean)) return false;
    if (requireCompleteRecords && !r.isComplete) return false;
    return true;
  });

  // Sort descending by overall mean (secondary sort by total score for stability)
  const sorted = [...eligible].sort((a, b) => {
    if (Math.abs(b.overallMean - a.overallMean) > 0.0001) {
      return b.overallMean - a.overallMean;
    }
    return (b.totalScore || 0) - (a.totalScore || 0);
  });

  const rankMap = new Map();
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (i > 0) {
      const prev = sorted[i - 1];
      const isTie = Math.abs(current.overallMean - prev.overallMean) < 0.0001;
      if (!isTie) {
        currentRank = i + 1; // 1224 ranking
      }
    }
    rankMap.set(current.learnerId, currentRank);
  }

  return learnerRecords.map(record => {
    const rank = rankMap.get(record.learnerId) || null;
    let rankSuffix = '—';
    if (rank !== null) {
      const j = rank % 10;
      const k = rank % 100;
      if (j === 1 && k !== 11) rankSuffix = `${rank}st`;
      else if (j === 2 && k !== 12) rankSuffix = `${rank}nd`;
      else if (j === 3 && k !== 13) rankSuffix = `${rank}rd`;
      else rankSuffix = `${rank}th`;
    }

    return {
      ...record,
      rank,
      rankLabel: rank !== null ? `${rankSuffix} / ${eligible.length}` : '—',
    };
  });
}
