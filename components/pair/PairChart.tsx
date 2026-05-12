"use client";

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
} from "recharts";

interface Review {
  result: "instant" | "slow" | "fail";
  durationMs: number | null;
  durationDiscarded: boolean;
  createdAt: string;
}

const RESULT_COLORS = {
  instant: "#22c55e",
  slow: "#eab308",
  fail: "#ef4444",
};

const RESULT_Y = {
  instant: 2,
  slow: 1,
  fail: 0,
};

interface Props {
  reviews: Review[];
}

export default function PairChart({ reviews }: Props) {
  const chartData = [...reviews]
    .reverse()
    .map((r, i) => ({
      index: i + 1,
      date: new Date(r.createdAt).toLocaleDateString("de-DE"),
      result: r.result,
      y: RESULT_Y[r.result],
      durationS: !r.durationDiscarded && r.durationMs != null ? r.durationMs / 1000 : null,
      color: RESULT_COLORS[r.result],
    }));

  const CustomDot = (props: {
    cx?: number;
    cy?: number;
    payload?: { color: string; result: string };
  }) => {
    const { cx = 0, cy = 0, payload } = props;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={payload?.color ?? "#94a3b8"}
        stroke="white"
        strokeWidth={1}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Result dot chart */}
      <div>
        <p className="text-xs text-slate-500 mb-1">Verlauf (Ergebnis)</p>
        <ResponsiveContainer width="100%" height={80}>
          <ScatterChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" tick={{ fontSize: 10 }} />
            <YAxis
              dataKey="y"
              domain={[-0.5, 2.5]}
              ticks={[0, 1, 2]}
              tickFormatter={(v) => ["Fail", "Slow", "Sofort"][v] ?? ""}
              tick={{ fontSize: 9 }}
              width={45}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-lg p-2 text-xs shadow">
                    <div className="font-semibold" style={{ color: d.color }}>{d.result}</div>
                    <div>{d.date}</div>
                    {d.durationS != null && <div>{d.durationS.toFixed(2)}s</div>}
                  </div>
                );
              }}
            />
            <Scatter dataKey="y" shape={<CustomDot />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Duration line chart */}
      {chartData.some((d) => d.durationS != null) && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Dauer (s)</p>
          <ResponsiveContainer width="100%" height={80}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}s`} />
              <Line
                type="monotone"
                dataKey="durationS"
                stroke="#3b82f6"
                dot={false}
                connectNulls={false}
                strokeWidth={1.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
