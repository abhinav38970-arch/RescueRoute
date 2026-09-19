/* Stylized hand-drawn 3D route map of Fremont for the volunteer view.
   Pure SVG diorama — no map tiles, no API keys, no tracking.
   Demo illustration, not to scale. */

type Props = {
  pickup: string;
  dropoff: string;
  distanceMiles: number;
  etaMinutes: number;
};

function Building({ x, y, w, h, tone = 0 }: { x: number; y: number; w: number; h: number; tone?: number }) {
  const tops = ["#edf1e2", "#e9efe0", "#f0f3e6"];
  const fronts = ["#dde4cf", "#d8e0cb", "#e2e8d4"];
  const sides = ["#c3cdb2", "#bcc6ac", "#c9d2b8"];
  const lift = 7;
  return (
    <g opacity="0.95">
      {/* side face */}
      <polygon
        points={`${x + w},${y} ${x + w - lift},${y - lift} ${x + w - lift},${y - lift + h} ${x + w},${y + h}`}
        fill={sides[tone % 3]}
      />
      {/* front face */}
      <rect x={x} y={y} width={w} height={h} fill={fronts[tone % 3]} />
      {/* roof */}
      <polygon
        points={`${x},${y} ${x + w},${y} ${x + w - lift},${y - lift} ${x - lift},${y - lift}`}
        fill={tops[tone % 3]}
      />
    </g>
  );
}

function Pin({ x, y, color, label, labelBelow = true }: { x: number; y: number; color: string; label: string; labelBelow?: boolean }) {
  const short = label.length > 22 ? label.slice(0, 21) + "…" : label;
  const ly = labelBelow ? y + 34 : y - 30;
  return (
    <g>
      <ellipse cx={x} cy={y + 4} rx="13" ry="4.5" fill="#1d3a27" opacity="0.18" />
      <path
        d="M0,-17 C-9.5,-17 -16,-9.5 -16,-1.5 C-16,7 0,19 0,19 C0,19 16,7 16,-1.5 C16,-9.5 9.5,-17 0,-17 Z"
        transform={`translate(${x},${y - 14}) rotate(-4)`}
        fill={color}
        stroke="#ffffff"
        strokeWidth="2.5"
      />
      <circle cx={x - 1} cy={y - 19} r="5.5" fill="#ffffff" />
      <text
        x={x}
        y={ly}
        textAnchor="middle"
        fontSize="11.5"
        fontWeight="800"
        fill="#1d3a27"
        style={{ paintOrder: "stroke", stroke: "#faf6ec", strokeWidth: 3.5 }}
      >
        {short}
      </text>
    </g>
  );
}

export default function RouteMap({ pickup, dropoff, distanceMiles, etaMinutes }: Props) {
  const routePath =
    "M105,208 C128,200 146,186 170,180 C204,171 228,154 250,138 C266,126 278,120 292,114";
  return (
    <figure>
      <div
        className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-forest-200"
        style={{ perspective: "900px", background: "#f3edde" }}
      >
        <div style={{ transform: "rotateX(15deg) scale(1.14)", transformOrigin: "50% 72%" }}>
          <svg
            viewBox="0 0 400 300"
            className="block h-auto w-full"
            role="img"
            aria-label={`Illustrated route map from ${pickup} to ${dropoff}`}
          >
            <defs>
              <filter id="rm-paper" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="n" />
                <feColorMatrix
                  in="n"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"
                />
                <feComposite operator="over" in2="SourceGraphic" />
              </filter>
              <linearGradient id="rm-route" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#2a5737" />
                <stop offset="1" stopColor="#e07b24" />
              </linearGradient>
            </defs>

            <g filter="url(#rm-paper)">
              {/* ground */}
              <rect x="-20" y="-20" width="440" height="340" fill="#f6f1e2" />

              {/* Central Park + Lake Elizabeth */}
              <path
                d="M52,52 C78,38 122,42 138,66 C154,90 132,122 100,122 C68,122 40,92 52,52 Z"
                fill="#dce8cf"
              />
              <path
                d="M72,64 C88,54 114,58 120,74 C126,90 108,106 90,104 C72,102 60,80 72,64 Z"
                fill="#bcd3da"
              />
              <text x="96" y="86" textAnchor="middle" fontSize="9.5" fontStyle="italic" fill="#4a6b74" transform="rotate(-4 96 86)">
                Lake Elizabeth
              </text>

              {/* park trees */}
              {[
                [58, 108], [130, 100], [140, 60], [60, 66],
              ].map(([tx, ty], i) => (
                <g key={i} opacity="0.85">
                  <circle cx={tx} cy={ty} r="6.5" fill="#9dbb8a" />
                  <circle cx={tx - 2} cy={ty - 2} r="3" fill="#b5cda1" />
                </g>
              ))}

              {/* street grid — slightly wobbly, hand-drawn feel */}
              <g fill="none" stroke="#d9d2bd" strokeWidth="7" strokeLinecap="round">
                <path d="M-10,148 C100,142 220,156 410,148" />
                <path d="M-10,214 C120,206 260,220 410,210" />
                <path d="M-10,88 C90,94 200,84 410,92" />
                <path d="M168,-10 C174,80 162,180 170,310" />
                <path d="M264,-10 C256,90 268,200 260,310" />
              </g>
              <g fill="none" stroke="#fbf8ef" strokeWidth="1.6" strokeDasharray="7 6" opacity="0.9">
                <path d="M-10,148 C100,142 220,156 410,148" />
                <path d="M-10,214 C120,206 260,220 410,210" />
              </g>

              {/* Mission Blvd — diagonal */}
              <path d="M18,292 C120,232 220,182 382,112" fill="none" stroke="#d9d2bd" strokeWidth="8" strokeLinecap="round" />
              <text x="200" y="206" fontSize="10" fontWeight="700" fill="#8a8270" transform="rotate(-24 200 206)">
                Mission Blvd
              </text>

              {/* I-880 */}
              <path d="M322,-10 C330,100 314,200 324,310" fill="none" stroke="#cfc8b2" strokeWidth="11" strokeLinecap="round" />
              <path d="M322,-10 C330,100 314,200 324,310" fill="none" stroke="#fbf8ef" strokeWidth="1.8" strokeDasharray="10 8" />
              <text x="336" y="150" fontSize="10" fontWeight="800" fill="#8a8270" transform="rotate(84 336 150)">
                I-880
              </text>
              <text x="150" y="142" fontSize="10" fontWeight="700" fill="#8a8270" transform="rotate(-2 150 142)">
                Fremont Blvd
              </text>

              {/* buildings */}
              <Building x={52} y={176} w={26} h={16} tone={0} />
              <Building x={196} y={196} w={30} h={20} tone={1} />
              <Building x={238} y={206} w={22} h={14} tone={2} />
              <Building x={296} y={182} w={24} h={18} tone={0} />
              <Building x={186} y={108} w={24} h={15} tone={2} />
              <Building x={336} y={222} w={28} h={18} tone={1} />
              <Building x={96} y={238} w={26} h={16} tone={1} />
              <Building x={352} y={60} w={24} h={16} tone={2} />

              {/* route — hand-drawn dotted trail */}
              <path
                d={routePath}
                fill="none"
                stroke="url(#rm-route)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray="0.5 10"
                className="rm-route-anim"
                opacity="0.95"
              />
              {/* moving driver dot */}
              <circle r="6.5" fill="#ffffff" stroke="#e07b24" strokeWidth="3.5">
                <animateMotion dur="7s" repeatCount="indefinite" path={routePath} />
              </circle>

              {/* pins */}
              <Pin x={105} y={208} color="#2a5737" label={pickup} labelBelow={true} />
              <Pin x={292} y={114} color="#e07b24" label={dropoff} labelBelow={false} />

              {/* distance badge */}
              <g transform="translate(200,262)">
                <rect x="-72" y="-14" width="144" height="28" rx="14" fill="#1d3a27" opacity="0.92" />
                <text x="0" y="4.5" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#faf6ec">
                  {distanceMiles} mi · ~{etaMinutes} min drive
                </text>
              </g>

              {/* compass */}
              <g transform="translate(368,266)" opacity="0.9">
                <circle r="14" fill="#fbf8ef" stroke="#d9d2bd" strokeWidth="1.5" />
                <polygon points="0,-8 4.5,4 0,1.5 -4.5,4" fill="#2a5737" />
                <text y="-17" textAnchor="middle" fontSize="9" fontWeight="800" fill="#2a5737">N</text>
              </g>

              {/* title */}
              <text x="388" y="24" textAnchor="end" fontSize="14" fontStyle="italic" fontWeight="700" fill="#23452e" transform="rotate(-2 388 24)">
                Fremont, CA
              </text>
            </g>
          </svg>
        </div>
      </div>
      <figcaption className="mt-1.5 text-center text-[11px] text-[#5a6b60]">
        Illustrated demo map · not to scale · pins mark this rescue route
      </figcaption>
    </figure>
  );
}
