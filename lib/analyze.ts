import { prisma } from "./prisma";
import { scoreDeal, BuyBoxLike, DealLike } from "./scoring";

/**
 * Recompute score, grade, finance fields, and self-checker notes for a deal,
 * then persist. Returns the previous and new score.
 */
export async function analyzeDeal(dealId: string): Promise<{
  previousScore: number | null;
  newScore: number;
  grade: string;
}> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { investor: { include: { buyBox: true } } },
  });
  if (!deal) throw new Error("Deal not found");
  if (!deal.investor) throw new Error("Deal has no primary investor — re-assign to an investor first");
  const bb = deal.investor.buyBox;
  if (!bb) throw new Error("Investor has no buy box");

  const previousScore = deal.score;
  const result = scoreDeal(deal as DealLike, bb as BuyBoxLike);

  const notes = buildSelfCheckerNotes(deal, result);

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      score: result.score,
      grade: result.grade,
      scoreBreakdown: result.breakdown as unknown as object,
      dscrCalculated: result.dscrCalculated,
      capRateUnderwritten: result.capRateCalculated,
      loanAmount: result.loanAmount,
      monthlyDebtService: result.monthlyDebtService,
      monthlyNetCashFlow: result.monthlyNetCashFlow,
      selfCheckerNotes: notes,
      scoreRationale: result.breakdown
        .filter((b) => b.status !== "pass")
        .map((b) => `${b.category}: ${b.detail}`)
        .join("; "),
    },
  });

  return { previousScore, newScore: result.score, grade: result.grade };
}

function buildSelfCheckerNotes(
  deal: {
    capRateAsking: number | null;
    dscrCalculated: number | null;
    askingPrice: number | null;
    noi: number | null;
  },
  result: { dscrCalculated: number | null; capRateCalculated: number | null }
): string {
  const notes: string[] = [];

  // Cap rate discrepancy
  if (deal.capRateAsking != null && result.capRateCalculated != null) {
    const diff = Math.abs(deal.capRateAsking - result.capRateCalculated);
    if (diff > 0.25) {
      notes.push(
        `Cap rate discrepancy: stated ${deal.capRateAsking}% vs calculated ${result.capRateCalculated.toFixed(
          2
        )}% (NOI/price).`
      );
    }
  }

  if (result.dscrCalculated != null) {
    notes.push(
      `DSCR ${result.dscrCalculated.toFixed(
        2
      )}x calculated from stated price/NOI at buy-box leverage — not lender-confirmed.`
    );
  } else {
    notes.push("All-cash scenario — no debt service.");
  }

  return notes.join(" ");
}
