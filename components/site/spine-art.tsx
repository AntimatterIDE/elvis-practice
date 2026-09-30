const vertebrae = [
  { y: 18, x: 78 },
  { y: 68, x: 70 },
  { y: 118, x: 84 },
  { y: 168, x: 66 },
  { y: 218, x: 86 },
  { y: 268, x: 72 },
  { y: 318, x: 80 },
];

export function SpineArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 420" className={className} aria-hidden>
      <ellipse className="spine-glow" cx="110" cy="210" rx="78" ry="150" fill="#9fe3d8" fillOpacity="0.2" />
      <path
        d="M110 16 C148 70 72 120 110 176 C150 236 70 286 110 348 C122 376 110 398 110 404"
        fill="none"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {vertebrae.map((bone, index) => (
        <g
          key={bone.y}
          className="spine-vertebra"
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <rect
            x={bone.x}
            y={bone.y}
            width="64"
            height="30"
            rx="10"
            fill="white"
            fillOpacity="0.12"
            stroke="white"
            strokeOpacity="0.55"
          />
          <circle cx={bone.x + 32} cy={bone.y + 15} r="4" fill="#9fe3d8" />
        </g>
      ))}
    </svg>
  );
}
