/**
 * PERSPECTIVE WARP & HOMOGRAPHY CORRECTION ENGINE
 * 
 * Maps an arbitrary quadrilateral (the 4 corners of an A4 page)
 * into a rectified, orthogonal document canvas using projective transformation.
 */

export function getQuadDimensions(corners) {
  const [c0, c1, c2, c3] = corners;

  // Top width & bottom width
  const topWidth = Math.hypot(c1.x - c0.x, c1.y - c0.y);
  const bottomWidth = Math.hypot(c2.x - c3.x, c2.y - c3.y);
  const width = Math.round(Math.max(topWidth, bottomWidth));

  // Left height & right height
  const leftHeight = Math.hypot(c3.x - c0.x, c3.y - c0.y);
  const rightHeight = Math.hypot(c2.x - c1.x, c2.y - c1.y);
  const height = Math.round(Math.max(leftHeight, rightHeight));

  return { width, height };
}

/**
 * Computes the projective mapping from unit square [0,1]^2 to arbitrary quad (x0..x3, y0..y3)
 * Reference: Paul Heckbert, Fundamentals of Texture Mapping and Image Warping
 */
function getUnitSquareToQuadTransform(corners) {
  const [c0, c1, c2, c3] = corners;
  const dx1 = c1.x - c2.x;
  const dx2 = c3.x - c2.x;
  const sx = c0.x - c1.x + c2.x - c3.x;

  const dy1 = c1.y - c2.y;
  const dy2 = c3.y - c2.y;
  const sy = c0.y - c1.y + c2.y - c3.y;

  // Affine case
  if (Math.abs(sx) < 1e-4 && Math.abs(sy) < 1e-4) {
    return {
      a: c1.x - c0.x,
      b: c3.x - c0.x,
      c: c0.x,
      d: c1.y - c0.y,
      e: c3.y - c0.y,
      f: c0.y,
      g: 0,
      h: 0,
    };
  }

  // Projective case
  const denom = dx1 * dy2 - dy1 * dx2;
  const g = (sx * dy2 - sy * dx2) / (Math.abs(denom) < 1e-7 ? 1e-7 : denom);
  const h = (dx1 * sy - dy1 * sx) / (Math.abs(denom) < 1e-7 ? 1e-7 : denom);

  const a = c1.x - c0.x + g * c1.x;
  const b = c3.x - c0.x + h * c3.x;
  const c = c0.x;

  const d = c1.y - c0.y + g * c1.y;
  const e = c3.y - c0.y + h * c3.y;
  const f = c0.y;

  return { a, b, c, d, e, f, g, h };
}

/**
 * Rectifies document perspective from source canvas given 4 corners
 * [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 */
export async function correctDocumentPerspective(sourceCanvas, corners) {
  if (!sourceCanvas || !corners || corners.length !== 4) {
    throw new Error('Valid source canvas and 4 corners required.');
  }

  const { width: targetWidth, height: targetHeight } = getQuadDimensions(corners);

  // Limit output resolution to sensible dimensions (max 2600px)
  const maxDim = 2600;
  let dstW = targetWidth;
  let dstH = targetHeight;
  if (Math.max(dstW, dstH) > maxDim) {
    const scale = maxDim / Math.max(dstW, dstH);
    dstW = Math.round(dstW * scale);
    dstH = Math.round(dstH * scale);
  }

  // Ensure minimum dimensions
  dstW = Math.max(300, dstW);
  dstH = Math.max(300, dstH);

  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const srcImgData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const srcData = srcImgData.data;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true });
  const dstImgData = dstCtx.createImageData(dstW, dstH);
  const dstData = dstImgData.data;

  const T = getUnitSquareToQuadTransform(corners);

  // Fast Bilinear Interpolation for smooth, crisp text edges
  for (let y = 0; y < dstH; y++) {
    const v = y / (dstH - 1);
    const rowOffset = y * dstW;

    for (let x = 0; x < dstW; x++) {
      const u = x / (dstW - 1);

      // Homography mapping: target (u,v) -> source (srcX, srcY)
      const w = T.g * u + T.h * v + 1.0;
      const srcX = (T.a * u + T.b * v + T.c) / w;
      const srcY = (T.d * u + T.e * v + T.f) / w;

      const dstIdx = (rowOffset + x) * 4;

      if (srcX >= 0 && srcX < srcW - 1 && srcY >= 0 && srcY < srcH - 1) {
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const xFrac = srcX - x0;
        const yFrac = srcY - y0;
        const invXFrac = 1.0 - xFrac;
        const invYFrac = 1.0 - yFrac;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        for (let c = 0; c < 3; c++) {
          const top = srcData[idx00 + c] * invXFrac + srcData[idx10 + c] * xFrac;
          const bottom = srcData[idx01 + c] * invXFrac + srcData[idx11 + c] * xFrac;
          dstData[dstIdx + c] = Math.round(top * invYFrac + bottom * yFrac);
        }
        dstData[dstIdx + 3] = 255;
      } else {
        // Fallback boundary color
        dstData[dstIdx] = 255;
        dstData[dstIdx + 1] = 255;
        dstData[dstIdx + 2] = 255;
        dstData[dstIdx + 3] = 255;
      }
    }
  }

  dstCtx.putImageData(dstImgData, 0, 0);

  // Aspect ratio description (e.g. Standard A4, Portrait, Landscape)
  const ratio = dstW / dstH;
  let profile = 'Orthogonal Document';
  if (Math.abs(ratio - 1 / 1.414) < 0.12) {
    profile = 'Standard A4 Portrait (1:1.41)';
  } else if (Math.abs(ratio - 1.414) < 0.12) {
    profile = 'Standard A4 Landscape (1.41:1)';
  } else if (ratio < 1) {
    profile = `Portrait Document (${dstW} × ${dstH}px)`;
  } else {
    profile = `Landscape Document (${dstW} × ${dstH}px)`;
  }

  return {
    canvas: dstCanvas,
    width: dstW,
    height: dstH,
    profile,
  };
}
