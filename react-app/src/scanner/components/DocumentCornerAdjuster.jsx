import React, { useState, useRef, useEffect, useMemo } from 'react';

const CORNER_LABELS = ['Top left', 'Top right', 'Bottom right', 'Bottom left'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function validateCorners(points, width, height) {
  if (!points || points.length !== 4) {
    return {
      valid: false,
      reason: 'Four corners are required.',
    };
  }

  for (const point of points) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.y < 0 ||
      point.x > width ||
      point.y > height
    ) {
      return {
        valid: false,
        reason: 'A corner is outside the photograph.',
      };
    }
  }

  // Verify convexity and prevent crossed corners
  let previousSign = 0;
  for (let i = 0; i < 4; i++) {
    const a = points[i];
    const b = points[(i + 1) % 4];
    const c = points[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);

    if (Math.abs(cross) < 0.001) {
      return {
        valid: false,
        reason: 'The document corners are too close together.',
      };
    }

    const sign = Math.sign(cross);
    if (previousSign && sign !== previousSign) {
      return {
        valid: false,
        reason: 'The corners form an invalid boundary.',
      };
    }
    previousSign = sign;
  }

  const area = polygonArea(points);
  if (area < width * height * 0.1) {
    return {
      valid: false,
      reason: 'The selected document area is too small.',
    };
  }

  return {
    valid: true,
    reason: null,
  };
}

export function getDefaultCorners(width, height) {
  const margin = 0.05;
  return [
    { x: width * margin, y: height * margin },
    { x: width * (1 - margin), y: height * margin },
    { x: width * (1 - margin), y: height * (1 - margin) },
    { x: width * margin, y: height * (1 - margin) },
  ];
}

export default function DocumentCornerAdjuster({
  imageUrl,
  imageWidth,
  imageHeight,
  initialCorners,
  onConfirm,
  onCancel,
}) {
  const [corners, setCorners] = useState(() =>
    initialCorners?.length === 4 ? initialCorners : getDefaultCorners(imageWidth, imageHeight)
  );
  const [activeCorner, setActiveCorner] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    if (initialCorners?.length === 4) {
      setCorners(initialCorners);
    } else if (imageWidth > 0 && imageHeight > 0) {
      setCorners(getDefaultCorners(imageWidth, imageHeight));
    }
  }, [initialCorners, imageWidth, imageHeight]);

  const validation = useMemo(
    () => validateCorners(corners, imageWidth, imageHeight),
    [corners, imageWidth, imageHeight]
  );

  function getImageCoordinates(event) {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: clamp(
        ((event.clientX - rect.left) / rect.width) * imageWidth,
        0,
        imageWidth
      ),
      y: clamp(
        ((event.clientY - rect.top) / rect.height) * imageHeight,
        0,
        imageHeight
      ),
    };
  }

  function handlePointerDown(event, index) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveCorner(index);
  }

  function handlePointerMove(event) {
    if (activeCorner === null) return;
    const position = getImageCoordinates(event);
    setCorners((previous) =>
      previous.map((corner, index) => (index === activeCorner ? position : corner))
    );
  }

  function handlePointerUp() {
    setActiveCorner(null);
  }

  function resetCorners() {
    setCorners(
      initialCorners?.length === 4
        ? initialCorners
        : getDefaultCorners(imageWidth, imageHeight)
    );
  }

  if (!imageUrl || corners.length !== 4) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
        Unable to initialize document correction. Check the image and detected corners.
      </div>
    );
  }

  return (
    <div className="document-adjuster" style={{ width: '100%', maxWidth: 700, margin: '0 auto' }}>
      <div className="document-adjuster__header" style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Adjust Document Boundaries</h3>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          Drag the four corners to match the edges of the paper.
        </p>
      </div>

      <div
        className="document-adjuster__image"
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
          borderRadius: 8,
          border: '1px solid var(--line)',
          background: '#000',
        }}
      >
        <img
          src={imageUrl}
          alt="Original school document"
          draggable="false"
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxHeight: '65vh',
            objectFit: 'contain',
            margin: '0 auto',
          }}
        />

        <svg
          ref={svgRef}
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          preserveAspectRatio="none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            touchAction: 'none',
          }}
        >
          {/* Selected page boundary */}
          <polygon
            points={corners.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="rgba(30, 180, 110, 0.15)"
            stroke="#16a36a"
            strokeWidth={Math.max(2, imageWidth / 500)}
          />

          {/* Corner handles */}
          {corners.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={Math.max(14, imageWidth / 60)}
                fill="rgba(22, 163, 106, 0.35)"
                stroke="#16a36a"
                strokeWidth={Math.max(2, imageWidth / 600)}
                style={{
                  cursor: 'grab',
                  touchAction: 'none',
                }}
                onPointerDown={(event) => handlePointerDown(event, index)}
              />

              <circle
                cx={point.x}
                cy={point.y}
                r={Math.max(5, imageWidth / 160)}
                fill="#ffffff"
                stroke="#16a36a"
                strokeWidth={Math.max(1.5, imageWidth / 600)}
                style={{
                  pointerEvents: 'none',
                }}
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="document-adjuster__status">
        {validation.valid ? (
          <p style={{ color: '#16a36a', margin: 0, fontWeight: 600 }}>
            ✓ All four document corners are valid.
          </p>
        ) : (
          <p role="alert" style={{ color: '#dc2626', margin: 0, fontWeight: 600 }}>
            ⚠ {validation.reason}
          </p>
        )}
      </div>

      <div className="document-adjuster__actions">
        <button
          type="button"
          onClick={resetCorners}
          className="button"
          style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          Reset corners
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="button"
          style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!validation.valid}
          onClick={() => onConfirm(corners)}
          className="button"
        >
          Confirm boundaries
        </button>
      </div>
    </div>
  );
}
