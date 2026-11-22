/**
 * Grading and Performance Descriptor Policies
 */

export const GRADING_SYSTEMS = {
  // Competency-Based Education (CBC/CBE) Standard Descriptors
  CBC_LEVELS: {
    id: 'cbc_levels',
    name: 'Competency-Based Performance Levels',
    bands: [
      { code: 'EE', label: 'Exceeding Expectations', min: 80, max: 100, points: 4 },
      { code: 'ME', label: 'Meeting Expectations', min: 65, max: 79.999, points: 3 },
      { code: 'AE', label: 'Approaching Expectations', min: 50, max: 64.999, points: 2 },
      { code: 'BE', label: 'Below Expectations', min: 0, max: 49.999, points: 1 },
    ],
  },

  // Standard 5-Tier Percentage Scale
  STANDARD_PERCENTAGE: {
    id: 'standard_percentage',
    name: 'Standard Percentage Scale (A-E)',
    bands: [
      { code: 'A', label: 'Distinction', min: 80, max: 100, points: 5 },
      { code: 'B', label: 'Credit', min: 65, max: 79.999, points: 4 },
      { code: 'C', label: 'Pass', min: 50, max: 64.999, points: 3 },
      { code: 'D', label: 'Subsidiary', min: 35, max: 49.999, points: 2 },
      { code: 'E', label: 'Fail', min: 0, max: 34.999, points: 1 },
    ],
  },
};

/**
 * Resolves performance descriptor / grade for a given percentage
 */
export function resolveGrade(percentage, system = GRADING_SYSTEMS.STANDARD_PERCENTAGE) {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return { code: '—', label: 'No Grade', points: 0 };
  }

  const p = Number(percentage);
  const bands = system?.bands || GRADING_SYSTEMS.STANDARD_PERCENTAGE.bands;

  for (const band of bands) {
    if (p >= band.min && (p <= band.max || p >= 100 && band.max === 100)) {
      return band;
    }
  }

  return bands[bands.length - 1] || { code: '—', label: 'Unclassified', points: 0 };
}
