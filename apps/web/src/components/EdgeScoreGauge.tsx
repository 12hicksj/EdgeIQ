"use client";

interface EdgeScoreGaugeProps {
  score: number; // 0-10
}

function getColor(score: number): string {
  if (score >= 7) return "#22c55e"; // green
  if (score >= 4) return "#eab308"; // yellow
  return "#ef4444"; // red
}

export function EdgeScoreGauge({ score }: EdgeScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(10, score));
  const percentage = clampedScore / 10;

  // SVG arc parameters
  const cx = 60;
  const cy = 60;
  const r = 50;
  const startAngle = -Math.PI * 0.8;
  const endAngle = Math.PI * 0.8;
  const totalAngle = endAngle - startAngle;

  function polarToCartesian(angle: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  const start = polarToCartesian(startAngle);
  const bgEnd = polarToCartesian(endAngle);
  const fillEnd = polarToCartesian(startAngle + totalAngle * percentage);

  const bgArc = [
    `M ${start.x} ${start.y}`,
    `A ${r} ${r} 0 1 1 ${bgEnd.x} ${bgEnd.y}`,
  ].join(" ");

  const fillArc =
    percentage > 0
      ? [
          `M ${start.x} ${start.y}`,
          `A ${r} ${r} 0 ${percentage > 0.5 ? 1 : 0} 1 ${fillEnd.x} ${fillEnd.y}`,
        ].join(" ")
      : null;

  const color = getColor(clampedScore);

  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={90} viewBox="0 0 120 90">
        {/* Background arc */}
        <path
          d={bgArc}
          fill="none"
          stroke="#374151"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Fill arc */}
        {fillArc && (
          <path
            d={fillArc}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
          />
        )}
        {/* Score text */}
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fill={color}
          fontSize={20}
          fontWeight="bold"
        >
          {clampedScore.toFixed(1)}
        </text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill="#9ca3af" fontSize={9}>
          IQ SCORE
        </text>
      </svg>
    </div>
  );
}
