import LifeChart, { type StateData, type NewsEvent } from "../LifeChart";

export default function LifeChartExample() {
  const now = Date.now() / 1000;
  const data: StateData[] = [];

  for (let i = 30; i >= 0; i -= 1) {
    const time = (now - i * 24 * 60 * 60) as any;
    data.push({
      time,
      mental: 50 + Math.sin(i / 5) * 10 + Math.random() * 5,
      physical: 55 + Math.cos(i / 4) * 8 + Math.random() * 5,
      moral: 48 + Math.sin(i / 6) * 12 + Math.random() * 5,
      financial: 52 + Math.cos(i / 7) * 9 + Math.random() * 5,
    });
  }

  const news: NewsEvent[] = [
    {
      time: (now - 20 * 24 * 60 * 60) as any,
      type: "positive",
      text: "Work promotion",
      impact: { mental: 5, physical: 0, moral: 3, financial: 10 },
    },
    {
      time: (now - 10 * 24 * 60 * 60) as any,
      type: "negative",
      text: "Health issues",
      impact: { mental: -3, physical: -8, moral: -2, financial: 0 },
    },
    {
      time: (now - 3 * 24 * 60 * 60) as any,
      type: "positive",
      text: "Met friends",
      impact: { mental: 8, physical: 2, moral: 5, financial: -5 },
    },
  ];

  return (
    <div className="h-[600px]">
      <LifeChart
        data={data}
        visibleStates={{ mental: true, physical: true, moral: true, financial: true }}
        weights={{ mental: 0.25, physical: 0.25, moral: 0.25, financial: 0.25 }}
        news={news}
        tokenName="SOUL"
      />
    </div>
  );
}
