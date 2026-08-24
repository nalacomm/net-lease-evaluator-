import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askText } from "@/lib/anthropic";
import { fmtMoney, fmtPercent } from "@/lib/format";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const investor = await prisma.investor.findUnique({
      where: { id: params.id },
      include: {
        buyBox: true,
        deals: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            address: true,
            tenantName: true,
            assetType: true,
            askingPrice: true,
            grade: true,
            score: true,
            dealCategory: true,
          },
        },
        assignments: {
          include: { deal: { select: { address: true, tenantName: true, assetType: true, askingPrice: true, grade: true, score: true, dealCategory: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    const bb = investor.buyBox;

    const bbSection = bb
      ? [
          `Cap Rate: floor ${bb.capRateMin}%, target ${bb.capRateTarget}%`,
          `Max Price: ${fmtMoney(bb.priceMax)}${bb.priceStretch ? ` (stretch: ${fmtMoney(bb.priceStretch)})` : ""}`,
          `Min DSCR: ${bb.dscrMin}x`,
          `LTV: ${(bb.ltv * 100).toFixed(0)}%  |  Rate: ${bb.interestRate}%  |  Amortization: ${bb.amortizationYears} yrs`,
          `Preferred Lease: ${labelFor(LEASE_TYPES, bb.leaseTypePreferred)}  |  Acceptable: ${labelFor(LEASE_TYPES, bb.leaseTypeAcceptable)}`,
          `Min Term: ${bb.termMinYears} yrs${bb.termPreferredYears ? ` (preferred: ${bb.termPreferredYears} yrs)` : ""}`,
          `Guaranty: ${labelFor(GUARANTY_TYPES, bb.guarantyPreferred)} preferred, floor ${labelFor(GUARANTY_TYPES, bb.guarantyFloor)}`,
          bb.operatorMinUnits ? `Min Operator Units: ${bb.operatorMinUnits}` : null,
          bb.assetTypesPreferred.length ? `Preferred Asset Types: ${bb.assetTypesPreferred.map((t) => labelFor(ASSET_TYPES, t)).join(", ")}` : null,
          bb.assetTypesAcceptable.length ? `Acceptable Asset Types: ${bb.assetTypesAcceptable.map((t) => labelFor(ASSET_TYPES, t)).join(", ")}` : null,
          bb.preferredStates.length ? `Preferred States: ${bb.preferredStates.join(", ")}` : null,
          bb.targetMarkets.length ? `Target Markets: ${bb.targetMarkets.join(", ")}` : null,
          bb.hhiMin ? `Min HHI: ${fmtMoney(bb.hhiMin)}` : null,
          bb.flatLeaseAllowed ? "Flat lease: OK" : "Flat lease: not preferred",
          bb.currentMonthlyIncome ? `Current monthly income: ${fmtMoney(bb.currentMonthlyIncome)}` : null,
          bb.notes ? `Buy box notes: ${bb.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "No buy box configured yet.";

    const allDeals = [
      ...investor.deals,
      ...investor.assignments.map((a) => a.deal),
    ];

    const dealsSection =
      allDeals.length > 0
        ? allDeals
            .map((d) =>
              [
                d.address ?? d.tenantName ?? "Unknown",
                d.dealCategory === "other_cre" ? "(Other CRE)" : "(Net Lease)",
                d.grade ? `Grade ${d.grade}` : null,
                d.askingPrice ? fmtMoney(d.askingPrice) : null,
                d.assetType ? labelFor(ASSET_TYPES, d.assetType) : null,
              ]
                .filter(Boolean)
                .join(" · ")
            )
            .join("\n")
        : "No deals evaluated yet.";

    const prompt = `You are a commercial real estate analyst. Write a concise but comprehensive investor profile summary based on the information below.

INVESTOR: ${investor.name}${investor.entityName ? ` (${investor.entityName})` : ""}
${investor.notes ? `\nNOTES FROM INVESTOR:\n${investor.notes}` : ""}

BUY BOX CRITERIA:
${bbSection}

DEALS EVALUATED (most recent first):
${dealsSection}

Write a profile summary covering:
1. Investment strategy and thesis — what this investor is looking for and why
2. Key criteria they prioritize (what makes a deal a strong fit)
3. Deal-breakers or constraints to keep in mind when sourcing for them
4. A brief read on their current pipeline based on the deals evaluated

Keep it concise: 3-4 short paragraphs, plain language. No headers. Write directly about the investor. Do not mention scores or numerical ratings.`;

    const summary = await askText(prompt, { maxTokens: 600 });

    await prisma.investor.update({
      where: { id: params.id },
      data: { investorSummary: summary },
    });

    return NextResponse.json({ summary });
  } catch (e) {
    console.error("investor analyze error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
