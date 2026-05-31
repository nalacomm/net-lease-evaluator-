"use client";

import { useMemo, useState } from "react";
import { computeFinance, breakEvenLtv, breakEvenRate } from "@/lib/finance";
import { fmtMoney, fmtPercent, fmtDscr } from "@/lib/format";
import clsx from "clsx";

export function FinancePlanner({
  price,
  noi,
  defaultLtv,
  defaultRate,
  defaultAmort,
  dscrFloor,
  currentMonthlyIncome,
  dealLabel,
}: {
  price: number;
  noi: number;
  defaultLtv: number; // fraction
  defaultRate: number; // percent
  defaultAmort: number;
  dscrFloor: number;
  currentMonthlyIncome: number;
  dealLabel: string;
}) {
  const [ltvPct, setLtvPct] = useState(Math.round(defaultLtv * 100));
  const [rate, setRate] = useState(defaultRate);
  const [amort, setAmort] = useState(defaultAmort);

  const fin = useMemo(
    () =>
      computeFinance({
        price,
        noi,
        ltv: ltvPct / 100,
        ratePercent: rate,
        amortizationYears: amort,
        currentMonthlyIncome,
      }),
    [price, noi, ltvPct, rate, amort, currentMonthlyIncome]
  );

  const beLtv = useMemo(
    () => breakEvenLtv(price, noi, rate, amort, dscrFloor),
    [price, noi, rate, amort, dscrFloor]
  );
  const beLtvPct = beLtv != null ? Math.round(beLtv * 100) : null;

  const beRate = useMemo(
    () => breakEvenRate(price, noi, ltvPct / 100, amort, dscrFloor),
    [price, noi, ltvPct, amort, dscrFloor]
  );

  const floorBreached = fin.dscr != null && fin.dscr < dscrFloor;

  const rows: { label: string; value: string; danger?: boolean }[] = [
    { label: "Equity Required", value: fmtMoney(fin.equityRequired) },
    { label: "Loan Amount", value: fmtMoney(fin.loanAmount) },
    { label: "Monthly Debt Service", value: fmtMoney(fin.monthlyDebtService) },
    { label: "Monthly Net Cash Flow", value: fmtMoney(fin.monthlyNetCashFlow) },
    {
      label: "DSCR",
      value: fin.isAllCash ? "All Cash" : fmtDscr(fin.dscr),
      danger: floorBreached,
    },
    {
      label: "Cash-on-Cash",
      value: fin.isAllCash
        ? fmtPercent(fin.capRate * 100)
        : fmtPercent(fin.cashOnCash * 100),
    },
    {
      label: "Additive Monthly Income",
      value: fmtMoney(fin.additiveMonthlyIncome),
    },
    {
      label: "New Portfolio Monthly Total",
      value: fmtMoney(fin.newPortfolioMonthlyTotal),
    },
  ];

  return (
    <div className="space-y-4">
      {/* LTV slider */}
      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">Loan-to-Value</label>
          <span
            className={clsx(
              "text-lg font-bold",
              ltvPct > (beLtvPct ?? 100) ? "text-red-600" : "text-brand"
            )}
          >
            {ltvPct}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={ltvPct}
          onChange={(e) => setLtvPct(Number(e.target.value))}
          className={clsx(
            "w-full",
            beLtvPct != null && ltvPct > beLtvPct && "danger"
          )}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>0% (all cash)</span>
          <span>90%</span>
        </div>
        {beLtvPct != null && (
          <p
            className={clsx(
              "mt-2 text-sm font-medium",
              floorBreached ? "text-red-600" : "text-gray-500"
            )}
          >
            DSCR floor ({dscrFloor.toFixed(2)}x) breached above {beLtvPct}% LTV
          </p>
        )}
      </div>

      {/* Rate + amort inputs */}
      <div className="card grid grid-cols-2 gap-3">
        <div>
          <label className="label">Interest Rate (%)</label>
          <input
            type="number"
            step={0.25}
            className="input"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Amortization (yrs)</label>
          <input
            type="number"
            className="input"
            value={amort}
            onChange={(e) => setAmort(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <dl className="divide-y divide-gray-100">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between py-2.5"
            >
              <dt className="text-sm text-gray-500">{r.label}</dt>
              <dd
                className={clsx(
                  "text-base font-semibold",
                  r.danger ? "text-red-600" : "text-gray-900"
                )}
              >
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Sensitivity — interest rate */}
      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">Rate Sensitivity</label>
          <span className="text-lg font-bold text-brand">
            {rate.toFixed(2)}%
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={10}
          step={0.25}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className={clsx("w-full", floorBreached && "danger")}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>5.0%</span>
          <span>10.0%</span>
        </div>
        {beRate != null ? (
          <p className="mt-2 text-sm font-medium text-gray-500">
            DSCR floor ({dscrFloor.toFixed(2)}x) breached above{" "}
            {beRate.toFixed(2)}% at {ltvPct}% LTV
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-400">
            DSCR floor not breached in 5–10% range at {ltvPct}% LTV
          </p>
        )}
      </div>

      <p className="text-center text-xs text-gray-400">
        Modeling {dealLabel}
      </p>
    </div>
  );
}
