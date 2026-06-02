import { useLanguage } from "@/lib/i18n";

export type ConditionState = "good" | "bad";

interface HumanStateProps {
  mental: ConditionState;
  spiritual: ConditionState;
  financial: ConditionState;
  physical: ConditionState;
  activeZone?: "mental" | "spiritual" | "financial" | "physical" | null;
}

type ZoneKey = "mental" | "spiritual" | "financial" | "physical";

type Tone = {
  outline: string;
  outlineSoft: string;
  stateFill: string;
  stateFillSoft: string;
};

const ZONE_OUTLINES: Record<ZoneKey, { outline: string; outlineSoft: string }> = {
  mental: {
    outline: "#9F7AEA",
    outlineSoft: "rgba(159, 122, 234, 0.68)",
  },
  spiritual: {
    outline: "#F6C453",
    outlineSoft: "rgba(246, 196, 83, 0.68)",
  },
  financial: {
    outline: "#36C98B",
    outlineSoft: "rgba(54, 201, 139, 0.68)",
  },
  physical: {
    outline: "#4FC3F7",
    outlineSoft: "rgba(79, 195, 247, 0.68)",
  },
};

function resolveTone(state: ConditionState, key: ZoneKey): Tone {
  return {
    outline: ZONE_OUTLINES[key].outline,
    outlineSoft: ZONE_OUTLINES[key].outlineSoft,
    stateFill: state === "good" ? "#22c55e" : "#8F2334",
    stateFillSoft: state === "good" ? "rgba(34, 197, 94, 0.18)" : "rgba(143, 35, 52, 0.56)",
  };
}

function stateText(language: "ru" | "en", state: ConditionState) {
  if (language === "ru") {
    return state === "good" ? "СТАБИЛЬНО" : "ОСЛАБЛЕНО";
  }
  return state === "good" ? "STABLE" : "WEAK";
}

function barWidth(state: ConditionState) {
  return state === "good" ? "100%" : "36%";
}

function zoneOpacity(active: boolean | undefined) {
  return active === false ? 0.34 : 1;
}

interface StatBlockProps {
  label: string;
  state: ConditionState;
  tone: Tone;
  align?: "left" | "right";
}

function StatBlock({ label, state, tone, align = "left" }: StatBlockProps) {
  const { language } = useLanguage();

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-[8px] uppercase tracking-[0.14em] text-[#8c97a8]">{label}</div>
      <div className="mt-1 text-[11px] font-semibold leading-none" style={{ color: tone.stateFill }}>
        {stateText(language, state)}
      </div>
      <div className={`mt-1.5 h-[2px] w-[64px] bg-white/10 ${align === "right" ? "ml-auto" : ""}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: barWidth(state),
            backgroundColor: tone.outline,
          }}
        />
      </div>
    </div>
  );
}

function BodyPath({
  d,
  fill,
  stroke,
  strokeWidth = 2.1,
  opacity = 1,
}: {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
}) {
  return (
    <path
      d={d}
      transform="translate(0.5 0.5)"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      vectorEffect="non-scaling-stroke"
    />
  );
}

const BODY_VIEWBOX = "0 0 198.81 693.96";

const SHAPES = {
  head:
    "M122.33,106.46c-3.19-4.62-1.59-24.7-1.59-24.7,6.21-4.62,6.85-18.17,6.85-18.17s0.48,2.39,2.87.8,3.19-17.69,2.55-19.12-3.35-1-3.35-1,3.82-21-2.71-31.87S105,0,98.9,0s-21.51,1.59-28,12.43S68.15,44.3,68.15,44.3s-2.71-.48-3.35,1S65,62.79,67.35,64.38s2.87-.8,2.87-0.8,0.64,13.55,6.85,18.17c0,0,1.59,20.08-1.59,24.7h46.85Z",
  torsoUpper:
    "M147.08,247.36c-0.06-7.1.64-14.06,2.71-19.47,5.31-13.86,1.87-35.54,4.26-32.35l-5.58-77s-22.95-7.49-26.13-12.11H75.48c-3.19,4.62-26.13,12.11-26.13,12.11l-5.58,77C46.15,192.36,42.71,214,48,227.9c2.07,5.41,2.78,12.37,2.71,19.47h96.34Z",
  torsoLower:
    "M50.73,247.36a136.19,136.19,0,0,1-3.62,28.82c-2.55,10.36-11,68.53-11.79,89.72L97,368.29l1.91-.82,1.91,0.82,61.67-2.39c-0.8-21.2-9.24-79.36-11.79-89.72a136.21,136.21,0,0,1-3.62-28.82H50.73Z",
  armRight: [
    "M43.76,195.54c-2.39,3.19-4.94,16.09-5.1,25.82s-3.19,23.27-5.74,29,2.23,35.22-.32,50.36-10.36,42.55-10.36,47.81L3.76,346.3c1-10.36-5.42-86.06-3.35-90.68s4-15.46,2.71-22.63S0.42,189.49,4.4,179.92s-0.8-27.25,9.88-44.62,35.06-16.73,35.06-16.73Z",
    "M22.25,348.54c0,5.26,2.87,6.53,5.42,11.47S27,375.94,27,375.94c2.23,14.82.48,14.82-2.23,14.66s-6.53-12.75-6.53-12.75l-4-1.91s-3.19,3.51-.8,8.92,16.25,12.75,14.66,14.66-6.37-.16-6.37-.16,9.56,9.24,8.45,10.36a3.53,3.53,0,0,1-2.87.8s2.71,3.19.48,4.62-8.6-3.19-8.6-3.19C10.46,410.69,2,389.33.74,386.94s2.07-30.28,3-40.64Z",
  ],
  armLeft: [
    "M194,346.3c-1-10.36,5.42-86.06,3.35-90.68s-4-15.46-2.71-22.63,2.71-43.51-1.27-53.07,0.8-27.25-9.88-44.62-35.06-16.73-35.06-16.73l5.58,77c2.39,3.19,4.94,16.09,5.1,25.82s3.19,23.27,5.74,29-2.23,35.22.32,50.36,10.36,42.55,10.36,47.81Z",
    "M175.56,348.54c0,5.26-2.87,6.53-5.42,11.47s0.64,15.94.64,15.94c-2.23,14.82-.48,14.82,2.23,14.66s6.53-12.75,6.53-12.75l4-1.91s3.19,3.51.8,8.92-16.25,12.75-14.66,14.66,6.37-.16,6.37-.16-9.56,9.24-8.45,10.36a3.53,3.53,0,0,0,2.87.8s-2.71,3.19-.48,4.62,8.61-3.19,8.61-3.19c8.76-1.28,17.21-22.63,18.49-25s-2.07-30.28-3-40.64Z",
  ],
  legRight: [
    "M35.11,508.33c1.67-14.63,4.15-24,4.67-31.36,0.8-11.31-5.26-89.88-4.46-111.07L97,368.29s0.32,12.43-2.07,21-7.33,19-7.33,33.78-2.23,48.45-6.53,62.31c-3.08,9.94-7,16-7.48,22.91H35.11Z",
    "M52.37,640.8c0.48-6.53-4.14-41.75-8.76-55.3s-10-16.25-10-48.76a248.59,248.59,0,0,1,1.54-28.4H73.57a21.52,21.52,0,0,0,1.27,8.8c4,11.47,4.62,37.45.48,54.5s-1.75,52.27-1.44,55.3Z",
    "M73.88,626.94c0.32,3,3.35,6.05,4.94,12.91s-3.51,9.56-1.75,20.4,2.55,31.56-3.35,32.51S66.39,691,66.39,691c-5.9.48-22.79,0.16-25.66-3.19s6.85-26.93,7.81-30.28,0.8-6.69.91-9.4,2.92-7.33,2.92-7.33Z",
  ],
  legLeft: [
    "M162.7,508.33c-1.67-14.63-4.15-24-4.67-31.36-0.8-11.31,5.26-89.88,4.46-111.07l-61.67,2.39s-0.32,12.43,2.07,21,7.33,19,7.33,33.78,2.23,48.45,6.53,62.31c3.08,9.94,7,16,7.48,22.91H162.7Z",
    "M145.44,640.8c-0.48-6.53,4.14-41.75,8.76-55.3s10-16.25,10-48.76a248.59,248.59,0,0,0-1.54-28.4H124.24a21.52,21.52,0,0,1-1.27,8.8c-4,11.47-4.62,37.45-.48,54.5s1.75,52.27,1.44,55.3Z",
    "M123.93,626.94c-0.32,3-3.35,6.05-4.94,12.91s3.51,9.56,1.75,20.4-2.55,31.56,3.35,32.51,7.33-1.75,7.33-1.75c5.9,0.48,22.79.16,25.66-3.19s-6.85-26.93-7.81-30.28-0.8-6.69-.91-9.4-2.92-7.33-2.92-7.33Z",
  ],
  outline:
    "M0.42,255.62C2.49,251,4.4,240.17,3.13,233S0.42,189.49,4.4,179.92s-0.8-27.25,9.88-44.62,35.06-16.73,35.06-16.73,22.95-7.49,26.13-12.11,1.59-24.7,1.59-24.7c-6.21-4.62-6.85-18.17-6.85-18.17s-0.48,2.39-2.87.8S64.16,46.69,64.8,45.26s3.35-1,3.35-1-3.82-21,2.71-31.87S92.85,0,98.9,0s21.51,1.59,28,12.43,2.71,31.87,2.71,31.87,2.71-.48,3.35,1-0.16,17.53-2.55,19.12-2.87-.8-2.87-.8S127,77.13,120.74,81.75c0,0-1.59,20.08,1.59,24.7s26.13,12.11,26.13,12.11,24.39-.63,35.06,16.73,5.9,35.06,9.88,44.62,2.55,45.9,1.27,53.07,0.64,18,2.71,22.63-4.3,80.32-3.35,90.68,4.3,38.25,3,40.64-9.72,23.75-18.49,25c0,0-6.37,4.62-8.61,3.19s0.48-4.62.48-4.62a3.53,3.53,0,0,1-2.87-.8c-1.12-1.11,8.45-10.36,8.45-10.36s-4.78,2.07-6.37.16,12.27-9.24,14.66-14.66-0.8-8.92-.8-8.92l-4,1.91s-3.83,12.59-6.53,12.75-4.46.16-2.23-14.66c0,0-3.19-11-.64-15.94s5.42-6.21,5.42-11.47-7.81-32.67-10.36-47.81,2.23-44.62-.32-50.36-5.58-19.29-5.74-29-2.71-22.63-5.1-25.82,1.05,18.49-4.26,32.35-1.64,37.93.91,48.29,11,68.53,11.79,89.72S157.23,465.66,158,477s6.21,27.25,6.21,59.76-5.42,35.22-10,48.76-9.24,48.76-8.76,55.3c0,0,2.81,4.62,2.92,7.33s0,6.06.91,9.4,10.68,26.93,7.81,30.28-19.76,3.67-25.66,3.19c0,0-1.43,2.71-7.33,1.75s-5.1-21.68-3.35-32.51-3.35-13.54-1.75-20.4,4.62-9.88,4.94-12.91,2.71-38.25-1.44-55.3-3.51-43,.48-54.5-1.91-17.85-6.22-31.71-6.53-47.49-6.53-62.31-4.94-25.18-7.33-33.78-2.07-21-2.07-21l-1.91-.82-1.91.82s0.32,12.43-2.07,21-7.33,19-7.33,33.78-2.23,48.45-6.53,62.31-10.2,20.24-6.22,31.71,4.62,37.45.48,54.5-1.75,52.27-1.44,55.3,3.35,6.05,4.94,12.91-3.51,9.56-1.75,20.4,2.55,31.56-3.35,32.51S66.39,691,66.39,691c-5.9.48-22.79,0.16-25.66-3.19s6.85-26.93,7.81-30.28,0.8-6.69.91-9.4,2.92-7.33,2.92-7.33c0.48-6.53-4.14-41.75-8.76-55.3s-10-16.25-10-48.76S39,488.29,39.78,477,34.52,387.1,35.32,365.9s9.24-79.36,11.79-89.72,6.22-34.42.91-48.29-1.87-35.54-4.26-32.35-4.94,16.09-5.1,25.82-3.19,23.27-5.74,29,2.23,35.22-.32,50.36-10.36,42.55-10.36,47.81,2.87,6.53,5.42,11.47S27,375.94,27,375.94c2.23,14.82.48,14.82-2.23,14.66s-6.53-12.75-6.53-12.75l-4-1.91s-3.19,3.51-.8,8.92,16.25,12.75,14.66,14.66-6.37-.16-6.37-.16,9.56,9.24,8.45,10.36a3.53,3.53,0,0,1-2.87.8s2.71,3.19.48,4.62-8.6-3.19-8.6-3.19C10.46,410.69,2,389.33.74,386.94s2.07-30.28,3-40.64S-1.66,260.24.42,255.62Z",
} as const;

export default function HumanStateModel({ mental, spiritual, financial, physical, activeZone = null }: HumanStateProps) {
  const { language } = useLanguage();

  const copy =
    language === "ru"
      ? {
          title: "Баланс тела",
          subtitle: "Неоновая анатомическая схема",
          mental: "Ментальное",
          spiritual: "Душевное",
          financial: "Финансовое",
          physical: "Физическое",
          statusGood: "Все основные зоны держатся стабильно",
          statusBad: "Есть зоны, которые требуют внимания",
        }
      : {
          title: "Body balance",
          subtitle: "Neon anatomical blueprint",
          mental: "Mental",
          spiritual: "Spiritual",
          financial: "Financial",
          physical: "Physical",
          statusGood: "Core body systems remain stable",
          statusBad: "Some zones require attention",
        };

  const mentalTone = resolveTone(mental, "mental");
  const spiritualTone = resolveTone(spiritual, "spiritual");
  const financialTone = resolveTone(financial, "financial");
  const physicalTone = resolveTone(physical, "physical");
  const allGood = [mental, spiritual, financial, physical].every((state) => state === "good");
  const mentalActive = activeZone === null || activeZone === "mental";
  const spiritualActive = activeZone === null || activeZone === "spiritual";
  const financialActive = activeZone === null || activeZone === "financial";
  const physicalActive = activeZone === null || activeZone === "physical";

  return (
    <div className="rounded-[18px] border border-white/10 bg-[#05070a] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_40px_rgba(0,0,0,0.45)]">
      <div className="mb-3">
        <div className="text-[9px] uppercase tracking-[0.22em] text-[#7a8596]">{copy.title}</div>
        <div className="mt-1 text-[13px] font-semibold text-white">{copy.subtitle}</div>
      </div>

      <div className="relative overflow-hidden rounded-[20px] border border-cyan-500/15 bg-[radial-gradient(circle_at_50%_18%,rgba(0,240,255,0.12),transparent_26%),radial-gradient(circle_at_50%_85%,rgba(214,81,255,0.10),transparent_30%),linear-gradient(180deg,#070a0f_0%,#04060a_100%)] px-2 py-5">
        <style>{`
          @keyframes blueprint-breathe {
            0%,100% { transform: scale(1); }
            50% { transform: scale(1.01); }
          }
        `}</style>
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(140,180,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(140,180,255,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto flex w-full max-w-[560px] items-center justify-center py-2">
          <div className="absolute -left-1 top-4 z-10">
            <StatBlock label={copy.mental} state={mental} tone={mentalTone} />
          </div>
          <div className="absolute -left-1 top-[57%] z-10">
            <StatBlock label={copy.financial} state={financial} tone={financialTone} />
          </div>
          <div className="absolute -right-1 top-4 z-10">
            <StatBlock label={copy.spiritual} state={spiritual} tone={spiritualTone} align="right" />
          </div>
          <div className="absolute -right-1 top-[57%] z-10">
            <StatBlock label={copy.physical} state={physical} tone={physicalTone} align="right" />
          </div>

          <div className="relative w-full max-w-[248px]">
            <svg viewBox={BODY_VIEWBOX} className="h-[430px] w-full" xmlns="http://www.w3.org/2000/svg" aria-label={copy.subtitle}>
              <g style={{ transformOrigin: "99.4px 347px", animation: "blueprint-breathe 4.8s ease-in-out infinite" }}>
                <path d={SHAPES.outline} transform="translate(0.5 0.5)" fill="none" stroke="rgba(111, 224, 255, 0.2)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />

                <g opacity={zoneOpacity(mentalActive)}>
                  <BodyPath d={SHAPES.head} fill={mentalTone.stateFillSoft} stroke={mentalTone.outline} strokeWidth={2} />
                </g>

                <g opacity={zoneOpacity(spiritualActive)}>
                  <BodyPath d={SHAPES.torsoUpper} fill={spiritualTone.stateFillSoft} stroke={spiritualTone.outline} strokeWidth={2} />
                  <BodyPath d={SHAPES.torsoLower} fill={spiritualTone.stateFillSoft} stroke={spiritualTone.outline} strokeWidth={2} />
                </g>

                <g opacity={zoneOpacity(financialActive)}>
                  {SHAPES.armRight.map((d, index) => (
                    <BodyPath
                      key={`arm-right-${index}`}
                      d={d}
                      fill={financialTone.stateFillSoft}
                      stroke={index === 0 ? financialTone.outline : financialTone.outlineSoft}
                      strokeWidth={index === 0 ? 1.9 : 1.5}
                    />
                  ))}
                  {SHAPES.armLeft.map((d, index) => (
                    <BodyPath
                      key={`arm-left-${index}`}
                      d={d}
                      fill={financialTone.stateFillSoft}
                      stroke={index === 0 ? financialTone.outline : financialTone.outlineSoft}
                      strokeWidth={index === 0 ? 1.9 : 1.5}
                    />
                  ))}
                </g>

                <g opacity={zoneOpacity(physicalActive)}>
                  {SHAPES.legRight.map((d, index) => (
                    <BodyPath
                      key={`leg-right-${index}`}
                      d={d}
                      fill={physicalTone.stateFillSoft}
                      stroke={index < 2 ? physicalTone.outline : physicalTone.outlineSoft}
                      strokeWidth={index < 2 ? 1.9 : 1.5}
                    />
                  ))}
                  {SHAPES.legLeft.map((d, index) => (
                    <BodyPath
                      key={`leg-left-${index}`}
                      d={d}
                      fill={physicalTone.stateFillSoft}
                      stroke={index < 2 ? physicalTone.outline : physicalTone.outlineSoft}
                      strokeWidth={index < 2 ? 1.9 : 1.5}
                    />
                  ))}
                </g>
              </g>
            </svg>
          </div>
        </div>

        <div className={`mt-4 text-center text-sm font-medium ${allGood ? "text-[#d6f7ff]" : "text-[#ff7f7f]"}`}>
          {allGood ? copy.statusGood : copy.statusBad}
        </div>
      </div>
    </div>
  );
}


