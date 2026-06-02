"use client";

import { useMemo, useState } from "react";
import { computeFinance, breakEvenLtv, breakEvenRate } from "@/lib/finance";
import { fmtMoney, fmtPercent, fmtDscr } from "@/lib/format";
import { Printer } from "lucide-react";
import clsx from "clsx";

export function FinancePlanner({
  price,
  noi,
  defaultLtv,
  defaultRate,
  defaultAmort,
  dscrFloor,
  dealLabel,
  investorName,
}: {
  price: number;
  noi: number;
  defaultLtv: number;
  defaultRate: number;
  defaultAmort: number;
  dscrFloor: number;
  dealLabel: string;
  investorName?: string;
}) {
  const [ltvPct, setLtvPct] = useState(Math.round(defaultLtv * 100));
  const [rate, setRate] = useState(defaultRate);
  const [amort, setAmort] = useState(defaultAmort);

  const fin = useMemo(
    () => computeFinance({ price, noi, ltv: ltvPct / 100, ratePercent: rate, amortizationYears: amort }),
    [price, noi, ltvPct, rate, amort]
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
    { label: "Annual Net Cash Flow", value: fmtMoney(fin.monthlyNetCashFlow * 12) },
    { label: "DSCR", value: fin.isAllCash ? "All Cash" : fmtDscr(fin.dscr), danger: floorBreached },
    { label: "Cash-on-Cash", value: fin.isAllCash ? fmtPercent(fin.capRate * 100) : fmtPercent(fin.cashOnCash * 100) },
    { label: "Cap Rate", value: fmtPercent(fin.capRate * 100) },
  ];

  return (
    <div className="space-y-4">
      {/* Export button — print-hidden controls are screen-only */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="btn-secondary gap-2"
        >
          <Printer className="h-4 w-4" /> Export / Print
        </button>
      </div>

      {/* Print header — only shows when printing */}
      <div className="hidden print:block mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Blake-Dickson Commercial Real Estate</p>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Finance Analysis — {dealLabel}</h2>
        {investorName && <p className="text-sm text-gray-600">Prepared for: {investorName}</p>}
        <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* LTV slider */}
      <div className="card print:shadow-none">
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">Loan-to-Value</label>
          <span className={clsx("text-lg font-bold", ltvPct > (beLtvPct ?? 100) ? "text-red-600" : "text-brand")}>
            {ltvPct}%
          </span>
        </div>
        <input
          type="range" min={0} max={90} step={5} value={ltvPct}
          onChange={(e) => setLtvPct(Number(e.target.value))}
          className={clsx("w-full print:hidden", beLtvPct != null && ltvPct > beLtvPct && "danger")}
        />
        {/* Print-only LTV display */}
        <p className="hidden print:block text-sm text-gray-600">LTV: {ltvPct}%</p>
        <div className="mt-1 flex justify-between text-xs text-gray-400 print:hidden">
          <span>0% (all cash)</span><span>90%</span>
        </div>
        {beLtvPct != null && (
          <p className={clsx("mt-2 text-sm font-medium", floorBreached ? "text-red-600" : "text-gray-500")}>
            DSCR floor ({dscrFloor.toFixed(2)}x) breached above {beLtvPct}% LTV
          </p>
        )}
      </div>

      {/* Rate + amort */}
      <div className="card print:shadow-none grid grid-cols-2 gap-3">
        <div>
          <label className="label">Interest Rate (%)</label>
          <input type="text" inputMode="decimal" className="input print:hidden" value={rate}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setRate(v); else setRate(e.target.value as unknown as number); }} />
          <p className="hidden print:block font-semibold">{rate}%</p>
        </div>
        <div>
          <label className="label">Amortization (yrs)</label>
          <input type="text" inputMode="numeric" className="input print:hidden" value={amort}
            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setAmort(v); }} />
          <p className="hidden print:block font-semibold">{amort} yrs</p>
        </div>
      </div>

      {/* Results */}
      <div className="card print:shadow-none">
        <h3 className="mb-2 font-semibold text-gray-900 hidden print:block">Results</h3>
        <dl className="divide-y divide-gray-100">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-gray-500">{r.label}</dt>
              <dd className={clsx("text-base font-semibold", r.danger ? "text-red-600" : "text-gray-900")}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Rate sensitivity — hide when printing */}
      <div className="card print:hidden">
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">Rate Sensitivity</label>
          <span className="text-lg font-bold text-brand">{rate.toFixed(2)}%</span>
        </div>
        <input
          type="range" min={5} max={10} step={0.25} value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className={clsx("w-full", floorBreached && "danger")}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>5.0%</span><span>10.0%</span>
        </div>
        {beRate != null ? (
          <p className="mt-2 text-sm font-medium text-gray-500">
            DSCR floor ({dscrFloor.toFixed(2)}x) breached above {beRate.toFixed(2)}% at {ltvPct}% LTV
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-400">
            DSCR floor not breached in 5–10% range at {ltvPct}% LTV
          </p>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 print:hidden">Modeling {dealLabel}</p>
    </div>
  );
}
