/**
 * REGISTER LAYOUT & ROW BOUNDARY DETECTOR
 * 
 * Computes horizontal & vertical projection profiles to locate:
 * 1. Physical text row boundaries (baselines and row heights)
 * 2. Table bounding box (header region vs student rows)
 * 3. Document structure type ('ruled_table' vs 'free_list')
 */

export function detectRegisterLayout(gray, width, height) {
  if (!gray || width <= 0 || height <= 0) {
    return {
      type: 'free_list',
      rows: [],
      estimatedRowCount: 0,
    };
  }

  // 1. Horizontal Projection Profile (Row Darkness Sum)
  const horizontalProfile = new Int32Array(height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    let darkCount = 0;
    for (let x = 0; x < width; x += 3) {
      if (gray[rowOffset + x] < 170) {
        darkCount++;
      }
    }
    horizontalProfile[y] = darkCount;
  }

  // 2. Identify Continuous Horizontal Rulings (Table Grid Lines)
  // Rulings appear as sharp narrow peaks in the horizontal profile
  const rulingYPositions = [];
  const rulingThreshold = (width / 3) * 0.45; // 45% of width is dark line

  for (let y = 10; y < height - 10; y++) {
    if (horizontalProfile[y] > rulingThreshold) {
      // Local peak check
      if (
        horizontalProfile[y] >= horizontalProfile[y - 1] &&
        horizontalProfile[y] >= horizontalProfile[y + 1]
      ) {
        // Debounce: don't count duplicate lines within 12px
        if (
          rulingYPositions.length === 0 ||
          y - rulingYPositions[rulingYPositions.length - 1] > 12
        ) {
          rulingYPositions.push(y);
        }
      }
    }
  }

  // 3. Segment Text Rows between Rulings or via Valleys
  const rows = [];
  const isRuledTable = rulingYPositions.length >= 4;

  if (isRuledTable) {
    for (let i = 0; i < rulingYPositions.length - 1; i++) {
      const top = rulingYPositions[i];
      const bottom = rulingYPositions[i + 1];
      const rowHeight = bottom - top;

      // School register row heights are typically 20px to 80px
      if (rowHeight >= 18 && rowHeight <= 120) {
        rows.push({
          index: rows.length,
          top,
          bottom,
          height: rowHeight,
          type: 'ruled_row',
        });
      }
    }
  } else {
    // Free list / text bands: detect clusters of non-zero horizontal profile
    let inBand = false;
    let bandStart = 0;

    for (let y = 0; y < height; y++) {
      const isDark = horizontalProfile[y] > (width / 3) * 0.04;
      if (isDark && !inBand) {
        inBand = true;
        bandStart = y;
      } else if (!isDark && inBand) {
        inBand = false;
        const bHeight = y - bandStart;
        if (bHeight >= 12 && bHeight <= 140) {
          rows.push({
            index: rows.length,
            top: Math.max(0, bandStart - 2),
            bottom: Math.min(height - 1, y + 2),
            height: bHeight + 4,
            type: 'text_band',
          });
        }
      }
    }
  }

  return {
    type: isRuledTable ? 'ruled_table' : 'free_list',
    rulingsCount: rulingYPositions.length,
    rows,
    estimatedRowCount: rows.length,
  };
}
