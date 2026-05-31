"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GRADE_HEX = (score: number) => {
  if (score >= 85) return "#16a34a";
  if (score >= 70) return "#2563eb";
  if (score >= 55) return "#ca8a04";
  if (score >= 40) return "#ea580c";
  return "#dc2626";
};

export function AssetClassChart({
  data,
}: {
  data: { type: string; avgScore: number; count: number }[];
}) {
  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        No scored deals yet.
      </p>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="type"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(0)}`, "Avg Score"]}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={GRADE_HEX(d.avgScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
