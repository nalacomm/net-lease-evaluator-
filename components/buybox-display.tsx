import { fmtMoney, fmtPercent } from "@/lib/format";
import { labelFor, LEASE_TYPES, GUARANTY_TYPES, ASSET_TYPES } from "@/lib/constants";

type BuyBox = {
  capRateMin: number;
  capRateTarget: number;
  priceMax: number;
  priceStretch: number | null;
  leaseTypePreferred: string;
  leaseTypeAcceptable: string;
  termMinYears: number;
  termPreferredYears: number | null;
  bumpMinPercent: number | null;
  bumpAltStructure: string | null;
  flatLeaseAllowed: boolean;
  guarantyPreferred: string;
  guarantyAcceptable: string;
  guarantyFloor: string;
  operatorMinUnits: number | null;
  dscrMin: number;
  ltv: number;
  interestRate: number;
  amortizationYears: number;
  constructionPreferred: string | null;
  hhiMin: number | null;
  assetTypesPreferred: string[];
  assetTypesAcceptable: string[];
  preferredStates: string[];
  targetMarkets: string[];
  currentMonthlyIncome: number | null;
  notes: string | null;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function BuyBoxDisplay({ bb }: { bb: BuyBox }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card">
        <h3 className="mb-2 font-semibold">Returns & Price</h3>
        <Row label="Cap Rate Floor" value={fmtPercent(bb.capRateMin)} />
        <Row label="Cap Rate Target" value={fmtPercent(bb.capRateTarget)} />
        <Row label="Max Price" value={fmtMoney(bb.priceMax)} />
        <Row
          label="Stretch Price"
          value={bb.priceStretch ? fmtMoney(bb.priceStretch) : "—"}
        />
        <Row label="Min DSCR" value={`${bb.dscrMin.toFixed(2)}x`} />
      </div>

      <div className="card">
        <h3 className="mb-2 font-semibold">Lease & Term</h3>
        <Row
          label="Preferred Lease"
          value={labelFor(LEASE_TYPES, bb.leaseTypePreferred)}
        />
        <Row
          label="Acceptable Lease"
          value={labelFor(LEASE_TYPES, bb.leaseTypeAcceptable)}
        />
        <Row label="Min Term" value={`${bb.termMinYears} yrs`} />
        <Row
          label="Preferred Term"
          value={bb.termPreferredYears ? `${bb.termPreferredYears} yrs` : "—"}
        />
        <Row
          label="Rent Bumps"
          value={
            bb.bumpMinPercent
              ? `${bb.bumpMinPercent}% / ${bb.bumpAltStructure ?? "—"}`
              : bb.bumpAltStructure ?? "—"
          }
        />
        <Row label="Flat Lease OK" value={bb.flatLeaseAllowed ? "Yes" : "No"} />
      </div>

      <div className="card">
        <h3 className="mb-2 font-semibold">Guaranty & Operator</h3>
        <Row
          label="Preferred"
          value={labelFor(GUARANTY_TYPES, bb.guarantyPreferred)}
        />
        <Row
          label="Acceptable"
          value={labelFor(GUARANTY_TYPES, bb.guarantyAcceptable)}
        />
        <Row label="Floor" value={labelFor(GUARANTY_TYPES, bb.guarantyFloor)} />
        <Row
          label="Min Operator Units"
          value={bb.operatorMinUnits ?? "—"}
        />
      </div>

      <div className="card">
        <h3 className="mb-2 font-semibold">Financing</h3>
        <Row label="LTV" value={fmtPercent(bb.ltv * 100)} />
        <Row label="Interest Rate" value={fmtPercent(bb.interestRate)} />
        <Row label="Amortization" value={`${bb.amortizationYears} yrs`} />
        <Row
          label="Current Mo. Income"
          value={fmtMoney(bb.currentMonthlyIncome ?? 0)}
        />
      </div>

      <div className="card md:col-span-2">
        <h3 className="mb-2 font-semibold">Asset Types & Demographics</h3>
        <Row
          label="Preferred Types"
          value={bb.assetTypesPreferred
            .map((t) => labelFor(ASSET_TYPES, t))
            .join(", ")}
        />
        <Row
          label="Acceptable Types"
          value={bb.assetTypesAcceptable
            .map((t) => labelFor(ASSET_TYPES, t))
            .join(", ")}
        />
        <Row label="Min HHI" value={bb.hhiMin ? fmtMoney(bb.hhiMin) : "—"} />
        <Row
          label="Construction"
          value={bb.constructionPreferred ?? "—"}
        />
        {bb.preferredStates.length > 0 && (
          <Row label="Preferred States" value={bb.preferredStates.join(", ")} />
        )}
        {bb.targetMarkets.length > 0 && (
          <Row label="Target Markets" value={bb.targetMarkets.join(", ")} />
        )}
        {bb.notes && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            {bb.notes}
          </div>
        )}
      </div>
    </div>
  );
}
