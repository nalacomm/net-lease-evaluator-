import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askText } from "@/lib/anthropic";
import { fmtMoney, fmtPercent, fmtDscr } from "@/lib/format";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";
import { computeFinance } from "@/lib/finance";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { investorId, dealIds } = await req.json();
    if (!investorId || !dealIds?.length || dealIds.length > 3) {
      return NextResponse.json({ error: "investorId + 1-3 dealIds required" }, { status: 400 });
    }

    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
      include: { buyBox: true },
    });
    if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    const bb = investor.buyBox!;

    const deals = await prisma.deal.findMany({
      where: { id: { in: dealIds } },
    });

    // Build deal summaries for AI
    function dealSummary(d: (typeof deals)[0]) {
      const fin = computeFinance({
        price: d.askingPrice ?? 0,
        noi: d.noi ?? 0,
        ltv: bb.ltv,
        ratePercent: bb.interestRate,
        amortizationYears: bb.amortizationYears,
        currentMonthlyIncome: bb.currentMonthlyIncome ?? 0,
      });
      return `
Deal: ${d.address ?? "Unknown"} | Tenant: ${d.tenantName ?? "?"} | Type: ${labelFor(ASSET_TYPES, d.assetType)}
Price: ${fmtMoney(d.askingPrice)} | NOI: ${fmtMoney(d.noi)} | Cap Rate: ${fmtPercent(d.capRateAsking)}
Lease: ${labelFor(LEASE_TYPES, d.leaseType)} | Term: ${d.termRemainingYears ?? "?"}yr | Bumps: ${d.bumpStructure ?? "?"}
Guaranty: ${labelFor(GUARANTY_TYPES, d.guarantyType)} | DSCR: ${fmtDscr(fin.dscr)} | Score: ${d.score?.toFixed(0) ?? "?"}/100 (${d.grade ?? "?"})
Monthly Net Cash Flow: ${fmtMoney(fin.monthlyNetCashFlow)}`;
    }

    const allSummaries = deals.map(dealSummary).join("\n\n---\n");

    const [execSummary, recommendation] = await Promise.all([
      askText(
        `You are a commercial real estate broker writing a client investment report for ${investor.name}.\n\nInvestor buy box: Cap rate floor ${bb.capRateMin}%, target ${bb.capRateTarget}%. Max price ${fmtMoney(bb.priceMax)}. Preferred lease: ${bb.leaseTypePreferred}. Min DSCR: ${bb.dscrMin}x.\n\nDeals being presented:\n${allSummaries}\n\nWrite a 2-3 sentence executive summary suitable for a professional investment report. Focus on fit with the investor's buy box and income growth potential. No preamble, no "Here is the summary".`,
        { maxTokens: 300 }
      ),
      askText(
        `You are a commercial real estate broker.\n\nInvestor: ${investor.name}. Buy box: Cap rate floor ${bb.capRateMin}%, target ${bb.capRateTarget}%. Min DSCR ${bb.dscrMin}x.\n\nDeals:\n${allSummaries}\n\nWrite a 2-3 sentence recommendation: which deal best fits this investor's thesis and why. Be direct and specific. No preamble.`,
        { maxTokens: 300 }
      ),
    ]);

    // Per-deal AI risks/strengths
    const dealDetails = await Promise.all(
      deals.map(async (d) => {
        const fin = computeFinance({
          price: d.askingPrice ?? 0,
          noi: d.noi ?? 0,
          ltv: bb.ltv,
          ratePercent: bb.interestRate,
          amortizationYears: bb.amortizationYears,
          currentMonthlyIncome: bb.currentMonthlyIncome ?? 0,
        });

        const risksStrengths = await askText(
          `Net lease deal: ${dealSummary(d)}\n\nReturn exactly this format (no extra text):\nSTRENGTHS:\n- [bullet 1]\n- [bullet 2]\n- [bullet 3]\nRISKS:\n- [bullet 1]\n- [bullet 2]\n- [bullet 3]`,
          { maxTokens: 300 }
        );

        const strengths: string[] = [];
        const risks: string[] = [];
        let section = "";
        for (const line of risksStrengths.split("\n")) {
          if (line.startsWith("STRENGTHS")) section = "s";
          else if (line.startsWith("RISKS")) section = "r";
          else if (line.startsWith("- ")) {
            if (section === "s") strengths.push(line.slice(2));
            else if (section === "r") risks.push(line.slice(2));
          }
        }

        return {
          deal: d,
          finance: fin,
          strengths,
          risks,
        };
      })
    );

    // Save report record
    const report = await prisma.report.create({
      data: {
        investorId,
        dealIds,
        title: `Top ${deals.length} Deals — ${investor.name}`,
      },
    });

    return NextResponse.json({
      reportId: report.id,
      investor: { name: investor.name, entityName: investor.entityName },
      execSummary,
      recommendation,
      deals: dealDetails.map((d) => ({
        id: d.deal.id,
        address: d.deal.address,
        tenantName: d.deal.tenantName,
        assetType: d.deal.assetType,
        askingPrice: d.deal.askingPrice,
        noi: d.deal.noi,
        capRateAsking: d.deal.capRateAsking,
        leaseType: d.deal.leaseType,
        termRemainingYears: d.deal.termRemainingYears,
        guarantyType: d.deal.guarantyType,
        grade: d.deal.grade,
        score: d.deal.score,
        scoreBreakdown: d.deal.scoreBreakdown,
        selfCheckerNotes: d.deal.selfCheckerNotes,
        finance: {
          loanAmount: d.finance.loanAmount,
          equityRequired: d.finance.equityRequired,
          monthlyDebtService: d.finance.monthlyDebtService,
          monthlyNetCashFlow: d.finance.monthlyNetCashFlow,
          dscr: d.finance.dscr,
          cashOnCash: d.finance.cashOnCash,
          newPortfolioMonthlyTotal: d.finance.newPortfolioMonthlyTotal,
        },
        strengths: d.strengths,
        risks: d.risks,
      })),
    });
  } catch (e) {
    console.error("report generate error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
