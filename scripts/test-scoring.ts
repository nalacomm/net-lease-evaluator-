import { scoreDeal, BuyBoxLike } from "../lib/scoring";
import { computeFinance, breakEvenLtv } from "../lib/finance";

const markBuyBox: BuyBoxLike = {
  capRateMin: 6.75,
  capRateTarget: 7.0,
  priceMax: 7000000,
  priceStretch: 7500000,
  ltv: 0.65,
  interestRate: 7.0,
  amortizationYears: 25,
  assetTypesPreferred: ["eclc"],
  assetTypesAcceptable: ["qsr", "pharmacy", "medical", "dollar_store", "retail"],
};

const owingsMills = {
  address: "9300 Lyons Mill Rd, Owings Mills MD",
  askingPrice: 4990000,
  noi: 372400,
  capRateAsking: 7.46,
  leaseType: "absolute_nnn",
  termRemainingYears: 20,
  guarantyType: "single_personal",
  assetType: "eclc",
};

const newington = {
  address: "Newington",
  askingPrice: 5130000,
  noi: 384750,
  capRateAsking: 7.5,
  leaseType: "nnn",
  termRemainingYears: 15,
  guarantyType: "multi_unit_franchisee",
  operatorUnitCount: 12,
  assetType: "qsr",
};

for (const [name, deal] of [
  ["Owings Mills", owingsMills],
  ["Newington", newington],
] as const) {
  const r = scoreDeal(deal, markBuyBox);
  console.log(`\n=== ${name} ===`);
  console.log(`Score: ${r.score}  Grade: ${r.grade}`);
  console.log(
    `DSCR (calc @65% LTV / 7% / 25yr): ${r.dscrCalculated?.toFixed(3)}`
  );
  console.log(`Cap rate (calc): ${r.capRateCalculated?.toFixed(2)}%`);
  console.log("Breakdown:");
  for (const c of r.breakdown) {
    console.log(
      `  ${c.category.padEnd(26)} ${String(c.points).padStart(2)}/${c.max}  [${c.status}] ${c.detail}`
    );
  }
  const be = breakEvenLtv(
    deal.askingPrice,
    deal.noi,
    markBuyBox.interestRate,
    markBuyBox.amortizationYears,
    1.35
  );
  console.log(`Break-even LTV @ 1.35x DSCR: ${be ? (be * 100).toFixed(1) : "n/a"}%`);
}
