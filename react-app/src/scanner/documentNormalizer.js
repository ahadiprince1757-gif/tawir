/**
 * DOCUMENT NORMALIZATION & GEOMETRY ENGINE
 * 
 * Prepares physical register photographs for high-precision OCR:
 * 1. Aspect-Ratio Preserving Scaling (Smart 1500 - 2400px dynamic range)
 * 2. Projection-Based Auto-Deskew (-4° to +4° tilt correction)
 * 3. Flatfield Illumination Normalization (Gradient & phone shadow removal)
 * 4. Adaptive Stroke Sharpening (Gentle unsharp mask without digital noise artifacts)
 */

export async function normalizeDocument(imageInput) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;
        const maxDim = Math.max(width, height);
        const minTarget = 1500;
        const maxTarget = 2400;

        // Dynamic scaling: only rescale if outside the optimal 1500-2400px range
        let scale = 1.0;
        if (maxDim < minTarget && maxDim > 0) {
          scale = minTarget / maxDim;
        } else if (maxDim > maxTarget) {
          scale = maxTarget / maxDim;
        }

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        // Canvas for scaled original
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const numPixels = width * height;

        // 1. Grayscale Conversion (Rec. 601 Luma)
        const gray = new Uint8Array(numPixels);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          gray[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
        }

        // 2. Skew Detection via Horizontal Projection Profile
        // Measures projection variance across candidate angles (-4° to +4°)
        const skewAngle = detectSkewAngle(gray, width, height);
        let workingCanvas = canvas;
        let workingGray = gray;
        let workingWidth = width;
        let workingHeight = height;

        if (Math.abs(skewAngle) >= 0.5) {
          const deskewed = rotateCanvas(canvas, -skewAngle);
          workingCanvas = deskewed.canvas;
          workingWidth = deskewed.canvas.width;
          workingHeight = deskewed.canvas.height;
          workingGray = deskewed.gray;
        }

        // 3. Flatfield Background Illumination Normalization
        // Extracts low-frequency lighting gradients (phone shadows, vignette) and flattens them
        const normalizedGray = removeShadows(workingGray, workingWidth, workingHeight);

        // 4. Controlled Unsharp Mask Deblurring (Edge accentuation without noise amplification)
        const sharpened = applyGentleSharpen(normalizedGray, workingWidth, workingHeight);

        // Render final normalized image back onto working canvas
        const finalCtx = workingCanvas.getContext('2d', { willReadFrequently: true });
        const finalImgData = finalCtx.getImageData(0, 0, workingWidth, workingHeight);
        const finalData = finalImgData.data;

        for (let i = 0; i < workingWidth * workingHeight; i++) {
          const val = sharpened[i];
          const dIdx = i * 4;
          finalData[dIdx] = val;
          finalData[dIdx + 1] = val;
          finalData[dIdx + 2] = val;
          finalData[dIdx + 3] = 255;
        }

        finalCtx.putImageData(finalImgData, 0, 0);

        resolve({
          canvas: workingCanvas,
          width: workingWidth,
          height: workingHeight,
          gray: sharpened,
          skewAngle,
        });
      } catch (err) {
        console.warn('Document normalization fallback to raw canvas:', err);
        resolve({
          canvas: imageInput,
          width: img.width || 1800,
          height: img.height || 1200,
          gray: null,
          skewAngle: 0,
        });
      }
    };

    img.onerror = () => resolve({ canvas: imageInput, width: 1800, height: 1200, gray: null, skewAngle: 0 });

    if (typeof imageInput === 'string') {
      img.src = imageInput;
    } else if (imageInput instanceof Blob || imageInput instanceof File) {
      img.src = URL.createObjectURL(imageInput);
    } else if (typeof HTMLCanvasElement !== 'undefined' && imageInput instanceof HTMLCanvasElement) {
      try {
        img.src = imageInput.toDataURL('image/jpeg', 0.95);
      } catch (e) {
        resolve({
          canvas: imageInput,
          width: imageInput.width,
          height: imageInput.height,
          gray: null,
          skewAngle: 0,
        });
      }
    } else {
      resolve({ canvas: imageInput, width: 1800, height: 1200, gray: null, skewAngle: 0 });
    }
  });
}

/**
 * Fast Projection Profile Skew Detection
 * Samples the central 60% of the document and measures row variance across small angles
 */
function detectSkewAngle(gray, width, height) {
  const startX = Math.round(width * 0.2);
  const endX = Math.round(width * 0.8);
  const sampleW = endX - startX;
  const startY = Math.round(height * 0.2);
  const endY = Math.round(height * 0.8);
  const sampleH = endY - startY;

  let bestAngle = 0;
  let maxVariance = -1;

  // Test angles from -3.5 deg to +3.5 deg in steps of 0.7 deg
  for (let angle = -3.5; angle <= 3.5; angle += 0.7) {
    const rad = (angle * Math.PI) / 180;
    const tan = Math.tan(rad);
    const profile = new Float64Array(sampleH);

    for (let y = 0; y < sampleH; y += 2) {
      const origY = startY + y;
      let sum = 0;
      for (let x = 0; x < sampleW; x += 4) {
        const origX = startX + x;
        const skewedY = Math.round(origY + (x - sampleW / 2) * tan);
        if (skewedY >= 0 && skewedY < height) {
          sum += 255 - gray[skewedY * width + origX];
        }
      }
      profile[y] = sum;
    }

    // Calculate variance
    let mean = 0;
    let count = 0;
    for (let y = 0; y < sampleH; y += 2) {
      mean += profile[y];
      count++;
    }
    mean /= count;

    let variance = 0;
    for (let y = 0; y < sampleH; y += 2) {
      const diff = profile[y] - mean;
      variance += diff * diff;
    }

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

/**
 * Rotates an HTML canvas by angle degrees and computes new grayscale buffer
 */
function rotateCanvas(srcCanvas, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const newW = Math.round(srcCanvas.width * cos + srcCanvas.height * sin);
  const newH = Math.round(srcCanvas.width * sin + srcCanvas.height * cos);

  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = newW;
  rotCanvas.height = newH;
  const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });

  rotCtx.fillStyle = '#ffffff';
  rotCtx.fillRect(0, 0, newW, newH);

  rotCtx.translate(newW / 2, newH / 2);
  rotCtx.rotate(rad);
  rotCtx.drawImage(srcCanvas, -srcCanvas.width / 2, -srcCanvas.height / 2);

  const imgData = rotCtx.getImageData(0, 0, newW, newH);
  const data = imgData.data;
  const gray = new Uint8Array(newW * newH);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
  }

  return { canvas: rotCanvas, gray };
}

/**
 * Flatfield background illumination normalization:
 * Divides grayscale pixels by smoothed low-frequency background map to erase shadows
 */
function removeShadows(gray, width, height) {
  const bgW = Math.max(16, Math.round(width / 16));
  const bgH = Math.max(16, Math.round(height / 16));

  // Small background canvas for blur
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = bgW;
  smallCanvas.height = bgH;
  const smallCtx = smallCanvas.getContext('2d');

  // Fill with downsampled grayscale
  const smallImgData = smallCtx.createImageData(bgW, bgH);
  const sData = smallImgData.data;
  const xRatio = width / bgW;
  const yRatio = height / bgH;

  for (let sy = 0; sy < bgH; sy++) {
    const origY = Math.min(height - 1, Math.round(sy * yRatio));
    const rowOffset = origY * width;
    for (let sx = 0; sx < bgW; sx++) {
      const origX = Math.min(width - 1, Math.round(sx * xRatio));
      const val = gray[rowOffset + origX];
      const idx = (sy * bgW + sx) * 4;
      sData[idx] = val;
      sData[idx + 1] = val;
      sData[idx + 2] = val;
      sData[idx + 3] = 255;
    }
  }
  smallCtx.putImageData(smallImgData, 0, 0);

  // Upscale back with bilinear smoothing
  const fullBgCanvas = document.createElement('canvas');
  fullBgCanvas.width = width;
  fullBgCanvas.height = height;
  const fullBgCtx = fullBgCanvas.getContext('2d');
  fullBgCtx.imageSmoothingEnabled = true;
  fullBgCtx.drawImage(smallCanvas, 0, 0, width, height);

  const bgData = fullBgCtx.getImageData(0, 0, width, height).data;
  const numPixels = width * height;
  const normalized = new Uint8Array(numPixels);

  for (let j = 0; j < numPixels; j++) {
    const bgVal = Math.max(25, bgData[j * 4]);
    // Divide and normalize: background paper becomes ~240 (clean white)
    const val = Math.min(255, Math.round((gray[j] / bgVal) * 238));
    normalized[j] = val;
  }

  return normalized;
}

/**
 * Controlled Laplacian edge sharpening:
 * Recovers soft pen strokes without creating speckled noise artifacts
 */
function applyGentleSharpen(gray, width, height) {
  const sharpened = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      const center = gray[idx];
      const up = gray[idx - width];
      const down = gray[idx + width];
      const left = gray[idx - 1];
      const right = gray[idx + 1];

      // Gentle Laplacian: 4.6 * center - 0.9 * (surrounding)
      const val = Math.round(4.6 * center - 0.9 * (up + down + left + right));
      sharpened[idx] = val < 0 ? 0 : val > 255 ? 255 : val;
    }
  }

  // Preserve borders
  for (let x = 0; x < width; x++) {
    sharpened[x] = gray[x];
    sharpened[(height - 1) * width + x] = gray[(height - 1) * width + x];
  }
  for (let y = 0; y < height; y++) {
    sharpened[y * width] = gray[y * width];
    sharpened[y * width + (width - 1)] = gray[y * width + (width - 1)];
  }

  return sharpened;
}
