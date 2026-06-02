import { useMemo } from "react";
import { useLanguage } from "@/lib/i18n";

interface HumanBalanceProps {
  values: {
    mental: number;
    physical: number;
    moral: number;
    financial: number;
  };
}

type RegionKey = "mental" | "physical" | "moral" | "financial";

const COLORS: Record<RegionKey | "negative" | "wire", string> = {
  mental: "#A56EFF",
  physical: "#58C7FF",
  moral: "#7CF08F",
  financial: "#7CF08F",
  negative: "#E15B64",
  wire: "rgba(214,223,238,0.72)",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function regionColor(key: RegionKey, value: number) {
  return value > 0 ? COLORS[key] : COLORS.negative;
}

function regionOpacity(value: number) {
  return 0.18 + clamp(Math.abs(value) / 10, 0, 1) * 0.72;
}

function metricText(value: number) {
  const normalized = Math.round(clamp(Math.abs(value) * 10, 0, 100));
  return `${normalized}/100`;
}

function lineWidth(value: number) {
  return `${clamp(Math.abs(value) * 10, 8, 100)}%`;
}

interface CalloutItem {
  key: string;
  title: string;
  value: number;
  color: string;
  width: string;
  top: number;
  anchorY: number;
  side: "left" | "right";
}

export default function HumanBalance({ values }: HumanBalanceProps) {
  const { language } = useLanguage();

  const copy =
    language === "ru"
      ? {
          title: "Баланс дня",
          head: "Голова",
          leftArm: "Левая рука",
          rightArm: "Правая рука",
          chest: "Грудь",
          belly: "Живот",
          leftLeg: "Левая нога",
          rightLeg: "Правая нога",
          statusBad: "Требует внимания",
          statusGood: "Стабильное состояние",
          affected: "Ослаблена зона",
        }
      : {
          title: "Daily balance",
          head: "Head",
          leftArm: "Left arm",
          rightArm: "Right arm",
          chest: "Chest",
          belly: "Body",
          leftLeg: "Left leg",
          rightLeg: "Right leg",
          statusBad: "Needs attention",
          statusGood: "Stable condition",
          affected: "Affected zone",
        };

  const palette = useMemo(
    () => ({
      mental: regionColor("mental", values.mental),
      moral: regionColor("moral", values.moral),
      financial: regionColor("financial", values.financial),
      physical: regionColor("physical", values.physical),
    }),
    [values.financial, values.mental, values.moral, values.physical],
  );

  const weakest = useMemo(() => {
    const entries = [
      { label: copy.head, value: values.mental },
      { label: copy.belly, value: values.moral },
      { label: copy.leftArm, value: values.financial },
      { label: copy.leftLeg, value: values.physical },
    ];
    return entries.reduce((lowest, current) => (current.value < lowest.value ? current : lowest), entries[0]);
  }, [copy.belly, copy.head, copy.leftArm, copy.leftLeg, values.financial, values.mental, values.moral, values.physical]);

  const leftItems: CalloutItem[] = [
    {
      key: "head",
      title: copy.head,
      value: values.mental,
      color: palette.mental,
      width: lineWidth(values.mental),
      top: 30,
      anchorY: 58,
      side: "left",
    },
    {
      key: "rightArm",
      title: copy.rightArm,
      value: values.financial,
      color: palette.financial,
      width: lineWidth(values.financial),
      top: 150,
      anchorY: 146,
      side: "left",
    },
    {
      key: "chest",
      title: copy.chest,
      value: values.moral,
      color: palette.moral,
      width: lineWidth(values.moral),
      top: 268,
      anchorY: 196,
      side: "left",
    },
    {
      key: "rightLeg",
      title: copy.rightLeg,
      value: values.physical,
      color: palette.physical,
      width: lineWidth(values.physical),
      top: 390,
      anchorY: 340,
      side: "left",
    },
  ];

  const rightItems: CalloutItem[] = [
    {
      key: "leftArm",
      title: copy.leftArm,
      value: values.financial,
      color: palette.financial,
      width: lineWidth(values.financial),
      top: 30,
      anchorY: 118,
      side: "right",
    },
    {
      key: "belly",
      title: copy.belly,
      value: values.moral,
      color: palette.moral,
      width: lineWidth(values.moral),
      top: 204,
      anchorY: 215,
      side: "right",
    },
    {
      key: "leftLeg",
      title: copy.leftLeg,
      value: values.physical,
      color: palette.physical,
      width: lineWidth(values.physical),
      top: 390,
      anchorY: 340,
      side: "right",
    },
  ];

  const statusTone = weakest.value > 0 ? "text-[#DCE4F2]" : "text-negative";
  const statusText =
    weakest.value > 0
      ? `${copy.statusGood}`
      : `${copy.affected}: ${weakest.label}`;

  return (
    <section
      className="rounded-lg border border-border bg-[#090b0f] p-0 overflow-hidden"
      data-testid="human-balance-card"
    >
      <div className="border-b border-white/8 px-5 py-4">
        <h3 className="text-[2rem] font-semibold leading-none text-white">{copy.title}</h3>
      </div>

      <div className="relative min-h-[620px] bg-[radial-gradient(circle_at_center,rgba(54,68,92,0.22),transparent_50%),linear-gradient(180deg,#090b0f_0%,#0b0d12_100%)] px-5 py-6">
        <div className="grid grid-cols-[110px_minmax(0,1fr)_110px] gap-2">
          <div className="relative h-[500px]">
            {leftItems.map((item) => (
              <Callout key={item.key} item={item} />
            ))}
          </div>

          <div className="relative mx-auto h-[500px] w-[240px]" data-testid="human-balance-figure">
            <svg viewBox="0 0 240 500" className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g opacity="0.16" fill="#88A2C8">
                <ellipse cx="120" cy="240" rx="92" ry="210" />
              </g>

              <g fill="none" stroke={COLORS.wire} strokeWidth="1.45" strokeLinejoin="round" strokeLinecap="round">
                <circle cx="120" cy="52" r="30" />
                <path d="M92 84 Q120 98 148 84 L161 126 Q168 151 161 185 L152 270 Q147 309 140 406 L100 406 Q93 309 88 270 L79 185 Q72 151 79 126 Z" />
                <path d="M79 104 Q55 130 46 164 L37 219 Q33 239 34 266" />
                <path d="M161 104 Q185 130 194 164 L203 219 Q207 239 206 266" />
                <path d="M104 406 L88 488" />
                <path d="M136 406 L152 488" />
                <path d="M104 406 L112 488" />
                <path d="M136 406 L128 488" />
                <path d="M94 122 Q120 132 146 122" opacity="0.8" />
                <path d="M88 145 Q120 159 152 145" opacity="0.8" />
                <path d="M82 174 Q120 188 158 174" opacity="0.8" />
                <path d="M82 206 Q120 194 158 206" opacity="0.8" />
                <path d="M90 235 Q120 250 150 235" opacity="0.7" />
                <path d="M96 270 Q120 282 144 270" opacity="0.7" />
                <path d="M100 309 Q120 320 140 309" opacity="0.7" />
                <path d="M120 86 L120 406" opacity="0.35" />
              </g>

              <circle
                cx="120"
                cy="52"
                r="27"
                fill={palette.mental}
                fillOpacity={regionOpacity(values.mental)}
                filter="url(#softGlow)"
              />

              <path
                d="M94 87 Q120 100 146 87 L158 128 Q165 151 158 184 L149 265 Q145 300 139 399 L101 399 Q95 300 91 265 L82 184 Q75 151 82 128 Z"
                fill={palette.moral}
                fillOpacity={regionOpacity(values.moral)}
                filter="url(#softGlow)"
              />

              <path
                d="M78 106 Q56 131 48 165 L40 218 Q36 239 37 264"
                stroke={palette.financial}
                strokeWidth="16"
                strokeOpacity={regionOpacity(values.financial)}
                filter="url(#softGlow)"
              />
              <path
                d="M162 106 Q184 131 192 165 L200 218 Q204 239 203 264"
                stroke={palette.financial}
                strokeWidth="16"
                strokeOpacity={regionOpacity(values.financial)}
                filter="url(#softGlow)"
              />

              <path
                d="M104 400 L91 486"
                stroke={palette.physical}
                strokeWidth="18"
                strokeOpacity={regionOpacity(values.physical)}
                filter="url(#softGlow)"
              />
              <path
                d="M136 400 L149 486"
                stroke={palette.physical}
                strokeWidth="18"
                strokeOpacity={regionOpacity(values.physical)}
                filter="url(#softGlow)"
              />

              <line x1="16" y1="58" x2="89" y2="58" stroke={palette.mental} strokeWidth="1.4" strokeOpacity="0.55" />
              <line x1="16" y1="146" x2="52" y2="146" stroke={palette.financial} strokeWidth="1.4" strokeOpacity="0.55" />
              <line x1="16" y1="196" x2="83" y2="196" stroke={palette.moral} strokeWidth="1.4" strokeOpacity="0.55" />
              <line x1="16" y1="340" x2="92" y2="340" stroke={palette.physical} strokeWidth="1.4" strokeOpacity="0.55" />

              <line x1="150" y1="118" x2="224" y2="118" stroke={palette.financial} strokeWidth="1.4" strokeOpacity="0.55" />
              <line x1="157" y1="215" x2="224" y2="215" stroke={palette.moral} strokeWidth="1.4" strokeOpacity="0.55" />
              <line x1="148" y1="340" x2="224" y2="340" stroke={palette.physical} strokeWidth="1.4" strokeOpacity="0.55" />
            </svg>
          </div>

          <div className="relative h-[500px]">
            {rightItems.map((item) => (
              <Callout key={item.key} item={item} />
            ))}
          </div>
        </div>

        <div className={`mt-6 px-3 text-center text-[1.05rem] font-medium leading-snug ${statusTone}`}>
          {statusText}
        </div>
      </div>
    </section>
  );
}

function Callout({ item }: { item: CalloutItem }) {
  return (
    <div
      className={`absolute w-full ${item.side === "left" ? "left-0 text-left" : "right-0 text-right"}`}
      style={{ top: `${item.top}px` }}
    >
      <div className="text-[11px] text-[#D7DEE8]">{item.title}</div>
      <div className="mt-1 text-[1.05rem] font-medium leading-none" style={{ color: item.color }}>
        {metricText(item.value)}
      </div>
      <div className={`mt-2 h-[3px] bg-white/12 ${item.side === "right" ? "ml-auto" : ""}`}>
        <div className="h-full" style={{ width: item.width, backgroundColor: item.color }} />
      </div>
    </div>
  );
}
