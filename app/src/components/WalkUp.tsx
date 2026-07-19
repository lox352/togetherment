/** The building itself: six floors, fire escape, water tower, top floor lit. */

const FLOORS = 6;
const COLS = [54, 93, 132];
const DARK_WINDOWS = new Set(["1-2", "2-0", "3-1", "4-2"]); // row 0 = 6th floor, all lit

export default function WalkUp() {
  return (
    <svg className="walkup" viewBox="0 0 200 260" role="img" aria-label="A six-floor walk-up at dusk">
      <defs>
        <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#35405c" />
          <stop offset="100%" stopColor="#6b5a6e" />
        </linearGradient>
      </defs>

      {/* dusk sky */}
      <rect x="0" y="0" width="200" height="260" fill="url(#dusk)" rx="10" />

      {/* water tower on the roof */}
      <g fill="#4a3f35">
        <rect x="122" y="28" width="3" height="22" />
        <rect x="141" y="28" width="3" height="22" />
        <polygon points="118,18 148,18 145,40 121,40" />
        <polygon points="116,18 150,18 133,8" />
      </g>

      {/* facade */}
      <rect x="40" y="50" width="120" height="210" fill="#a2402e" />
      <rect x="36" y="46" width="128" height="8" fill="#7c2f21" />

      {/* windows: 6 floors × 3, top floor fully lit — we're home */}
      {Array.from({ length: FLOORS }, (_, row) =>
        COLS.map((x, col) => (
          <rect
            key={`${row}-${col}`}
            x={x}
            y={62 + row * 26}
            width="14"
            height="17"
            rx="2"
            fill={DARK_WINDOWS.has(`${row}-${col}`) ? "#5b2b20" : "#ffd98a"}
          />
        )),
      )}

      {/* fire escape down the left bay */}
      <g stroke="#2e3a31" strokeWidth="1.6" fill="none" opacity="0.9">
        {Array.from({ length: FLOORS }, (_, row) => {
          const y = 82 + row * 26;
          return (
            <g key={row}>
              <line x1="48" y1={y} x2="76" y2={y} />
              <line x1="48" y1={y - 8} x2="48" y2={y} />
              <line x1="76" y1={y - 8} x2="76" y2={y} />
              {row < FLOORS - 1 && <line x1="72" y1={y} x2="52" y2={y + 26} />}
            </g>
          );
        })}
      </g>

      {/* stoop & door */}
      <rect x="88" y="224" width="24" height="30" rx="2" fill="#3a231d" />
      <path d="M88 226 a12 12 0 0 1 24 0" fill="#3a231d" />
      <rect x="84" y="252" width="32" height="4" fill="#7c2f21" />
      <rect x="80" y="256" width="40" height="4" fill="#6a281c" />
      <text
        x="100"
        y="219"
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight="700"
        fontSize="11"
        fill="#f6efe3"
      >
        244
      </text>
    </svg>
  );
}
