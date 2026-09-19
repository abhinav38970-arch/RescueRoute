import type { ReactNode } from "react";

/* Stylized hand-drawn 3D map of Fremont's food-rescue network.
   Pure SVG diorama — no map tiles, no API keys, no tracking.
   Pins mark real Fremont restaurants and nonprofits. Availability
   shown is fictional demo data. Illustrated, not to scale. */

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

function MapLabel({ x, y, anchor = "middle", children }: { x: number; y: number; anchor?: "middle" | "start" | "end"; children: ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize="9.5"
      fontWeight="800"
      fill="#1d3a27"
      style={{ paintOrder: "stroke", stroke: "#faf6ec", strokeWidth: 3.5 }}
    >
      {children}
    </text>
  );
}

/* Restaurant pin: green dot with a tiny takeout bag = food available tonight,
   muted gray dot = nothing to rescue right now. */
function FoodPin({
  x,
  y,
  available,
  label,
  labelY,
  labelAnchor = "middle",
}: {
  x: number;
  y: number;
  available: boolean;
  label: string;
  labelY: number;
  labelAnchor?: "middle" | "start" | "end";
}) {
  return (
    <g>
      <ellipse cx={x} cy={y + 3} rx="11" ry="3.5" fill="#1d3a27" opacity="0.15" />
      {available && (
        <circle cx={x} cy={y} r="9" fill="none" stroke="#2a5737" strokeWidth="1.6">
          <animate attributeName="r" values="9;15" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0" dur="2.2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={x} cy={y} r={available ? 9 : 7} fill={available ? "#2a5737" : "#c3bca9"} stroke="#ffffff" strokeWidth="2" />
      {available ? (
        <g transform={`translate(${x},${y})`}>
          <path d="M-2.4,-0.5 C-2.4,-3.6 2.4,-3.6 2.4,-0.5" fill="none" stroke="#ffffff" strokeWidth="1.3" />
          <rect x="-3.8" y="-0.5" width="7.6" height="5.8" rx="1.2" fill="#ffffff" />
        </g>
      ) : (
        <line x1={x - 2.6} y1={y} x2={x + 2.6} y2={y} stroke="#8a8270" strokeWidth="1.6" strokeLinecap="round" />
      )}
      <MapLabel x={x + (labelAnchor === "middle" ? 0 : labelAnchor === "end" ? -12 : 12)} y={labelY} anchor={labelAnchor}>
        {label}
      </MapLabel>
    </g>
  );
}

/* Nonprofit pin: dark rounded badge with a heart. */
function OrgPin({
  x,
  y,
  label,
  labelY,
}: {
  x: number;
  y: number;
  label: string;
  labelY: number;
}) {
  return (
    <g>
      <ellipse cx={x} cy={y + 3} rx="12" ry="4" fill="#1d3a27" opacity="0.15" />
      <rect x={x - 9} y={y - 9} width="18" height="18" rx="5.5" fill="#1d3a27" stroke="#ffffff" strokeWidth="2" />
      <path
        d="M0,3.4 C-4.6,-0.6 -7.2,-2.8 -7.2,-4.8 C-7.2,-6.6 -5.8,-8 -4,-8 C-2.6,-8 -1.2,-7.1 0,-5.6 C1.2,-7.1 2.6,-8 4,-8 C5.8,-8 7.2,-6.6 7.2,-4.8 C7.2,-2.8 4.6,-0.6 0,3.4 Z"
        transform={`translate(${x},${y + 0.5})`}
        fill="#ffffff"
      />
      <MapLabel x={x} y={labelY}>
        {label}
      </MapLabel>
    </g>
  );
}

export default function RouteMap({}: Props) {
  // Tonight's illustrated route: Boudin SF -> Tri-City Volunteers
  const routePath = "M228,92 C200,94 172,106 152,120";
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
            aria-label="Illustrated map of real Fremont restaurants and nonprofits in the food-rescue network"
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
              <text x="86" y="140" fontSize="10" fontWeight="700" fill="#8a8270" transform="rotate(-2 86 140)">
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

              {/* tonight's route — hand-drawn dotted trail */}
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

              {/* restaurant pins */}
              <FoodPin x={228} y={92} available label="Boudin SF" labelY={68} />
              <FoodPin x={292} y={88} available label="Cakes & Bakes" labelY={64} />
              <FoodPin x={260} y={118} available={false} label="Rajwadi Thali" labelY={144} />
              <FoodPin x={220} y={142} available label="Smoking Pig BBQ" labelY={164} labelAnchor="end" />
              <FoodPin x={296} y={132} available={false} label="Port of Peri Peri" labelY={156} />

              {/* nonprofit pins */}
              <OrgPin x={148} y={124} label="Tri-City Volunteers" labelY={100} />
              <OrgPin x={104} y={186} label="Centerville Dining Room" labelY={210} />
              <OrgPin x={160} y={242} label="Salaam Food Pantry" labelY={266} />

              {/* legend */}
              <g transform="translate(10,244)">
                <rect x="0" y="0" width="96" height="46" rx="9" fill="#fbf8ef" stroke="#d9d2bd" strokeWidth="1.2" opacity="0.97" />
                <circle cx="11" cy="10" r="4.5" fill="#2a5737" />
                <text x="20" y="13" fontSize="8.5" fontWeight="700" fill="#3d4a40">Food available</text>
                <circle cx="11" cy="24" r="4.5" fill="#c3bca9" />
                <text x="20" y="27" fontSize="8.5" fontWeight="700" fill="#3d4a40">Nothing tonight</text>
                <rect x="6.5" y="33" width="9" height="9" rx="2.8" fill="#1d3a27" />
                <text x="20" y="40.5" fontSize="8.5" fontWeight="700" fill="#3d4a40">Nonprofit</text>
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
        Tonight&rsquo;s route: Boudin SF &rarr; Tri-City Volunteers · real Fremont spots · availability shown is fictional
      </figcaption>
    </figure>
  );
}
