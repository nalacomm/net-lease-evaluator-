import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askText } from "@/lib/anthropic";
import { fmtMoney, fmtPercent, fmtDscr } from "@/lib/format";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";
import { computeFinance } from "@/lib/finance";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { investorId, dealIds, compareMode = false, showScore = true } = await req.json();
    if (!investorId || !dealIds?.length) {
      return NextResponse.json({ error: "investorId + dealIds required" }, { status: 400 });
    }
    if (dealIds.length > 8) {
      return NextResponse.json({ error: "Select up to 8 deals per report to avoid timeouts" }, { status: 400 });
    }

    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
      include: { buyBox: true },
    });
    if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    const bb = investor.buyBox!;

    // Only pull deals that belong to this investor (primary or assigned)
    const [primaryDeals, assignments] = await Promise.all([
      prisma.deal.findMany({
        where: { id: { in: dealIds }, investorId },
      }),
      prisma.dealAssignment.findMany({
        where: { dealId: { in: dealIds }, investorId },
        include: { deal: true },
      }),
    ]);

    // Merge — primary deals take precedence; assignments fill the rest
    const primaryIds = new Set(primaryDeals.map((d) => d.id));
    const assignedDeals = assignments
      .filter((a) => !primaryIds.has(a.dealId))
      .map((a) => a.deal);

    const deals = [...primaryDeals, ...assignedDeals];

    // Per-deal: use investor-specific score/grade from DealAssignment when available
    const assignmentMap = new Map(assignments.map((a) => [a.dealId, a]));

    function dealSummary(d: (typeof deals)[0]) {
      const config = d.scoringConfig as { enabledCategories?: string[] } | null;
      const enabled = config?.enabledCategories;
      const has = (cat: string) => !enabled || enabled.includes(cat);

      const isPrimary = primaryIds.has(d.id);
      const a = isPrimary ? undefined : assignmentMap.get(d.id);
      const score = a?.score ?? d.score;
      const grade = a?.grade ?? d.grade;
      const fin = computeFinance({
        price: d.askingPrice ?? 0,
        noi: d.noi ?? 0,
        ltv: bb.ltv,
        ratePercent: bb.interestRate,
        amortizationYears: bb.amortizationYears,
      });

      const priceFields = [
        has("Price vs Ceiling") && `Price: ${fmtMoney(d.askingPrice)}`,
        has("Cap Rate") && `NOI: ${fmtMoney(d.noi)}`,
        has("Cap Rate") && `Cap Rate: ${fmtPercent(d.capRateAsking)}`,
      ].filter(Boolean).join(" | ");

      const leaseFields = [
        has("Lease Type") && `Lease: ${labelFor(LEASE_TYPES, d.leaseType)}`,
        has("Term Remaining") && `Term: ${d.termRemainingYears ?? "?"}yr`,
        has("Rent Bumps") && `Bumps: ${d.bumpStructure ?? "?"}`,
      ].filter(Boolean).join(" | ");

      const finFields = [
        has("Guaranty") && `Guaranty: ${labelFor(GUARANTY_TYPES, d.guarantyType)}`,
        has("DSCR") && `DSCR: ${fmtDscr(fin.dscr)}`,
        showScore && score != null ? `Score: ${score.toFixed(0)}/100 (${grade ?? "?"})` : null,
      ].filter(Boolean).join(" | ");

      return [
        `Property: ${d.address ?? "Unknown"} | Tenant: ${d.tenantName ?? "?"} | Type: ${labelFor(ASSET_TYPES, d.assetType)}`,
        priceFields,
        leaseFields,
        finFields,
        `Monthly Net Cash Flow: ${fmtMoney(fin.monthlyNetCashFlow)}`,
      ].filter(Boolean).join("\n");
    }

    // Union of disabled categories across all deals — used in global prompts (exec summary, recommendation)
    const allDisabledCategories = (() => {
      const seen = new Set<string>();
      for (const d of deals) {
        const config = d.scoringConfig as { enabledCategories?: string[] } | null;
        const enabled = config?.enabledCategories;
        if (!enabled) continue;
        const breakdown = (d.scoreBreakdown as { category: string }[] | null) ?? [];
        breakdown.map((b) => b.category).filter((c) => !enabled.includes(c)).forEach((c) => seen.add(c));
      }
      return Array.from(seen);
    })();
    const globalCatInstruction = allDisabledCategories.length > 0
      ? `\nThe investor has opted out of evaluating the following criteria — do not mention them: ${allDisabledCategories.join(", ")}.`
      : "";

    const allSummaries = deals.map(dealSummary).join("\n\n---\n");

    const bbContext = `Your investment criteria: cap rate floor ${bb.capRateMin}%, target ${bb.capRateTarget}%. Maximum price ${fmtMoney(bb.priceMax)}. Preferred lease structure: ${bb.leaseTypePreferred.replace(/_/g, " ")}. Minimum DSCR: ${bb.dscrMin}x.`;

    // showScore controls structured display only — AI prose never mentions scores
    const scoreInstruction = "\nDo not mention scores, grades, or numerical ratings of any kind in your written analysis.";

    // Build per-deal disabled-category instruction based on each deal's scoringConfig
    function dealCategoryInstruction(d: (typeof deals)[0]): string {
      const config = d.scoringConfig as { enabledCategories?: string[] } | null;
      const enabled = config?.enabledCategories;
      if (!enabled) return "";
      const breakdown = (d.scoreBreakdown as { category: string }[] | null) ?? [];
      const disabled = breakdown.map((b) => b.category).filter((c) => !enabled.includes(c));
      if (disabled.length === 0) return "";
      return `\nThe investor has opted out of evaluating the following criteria — do not mention them: ${disabled.join(", ")}.`;
    }

    const summaryPrompt = compareMode
      ? `You are a commercial real estate advisor writing a personalized investment report for a client named ${investor.name}${investor.entityName ? ` (${investor.entityName})` : ""}.

Write directly TO the investor using "you" and "your" — not about them in third person.${scoreInstruction}${globalCatInstruction}
${bbContext}

Properties being presented:
${allSummaries}

Write a 2-3 sentence executive summary. Speak directly to the investor about how these opportunities compare against each other and fit their strategy. No preamble, no "Here is the summary".`
      : `You are a commercial real estate advisor writing a personalized investment report for a client named ${investor.name}${investor.entityName ? ` (${investor.entityName})` : ""}.

Write directly TO the investor using "you" and "your" — not about them in third person.${scoreInstruction}${globalCatInstruction}
${bbContext}

Properties being presented:
${allSummaries}

Write a 2-3 sentence executive summary evaluating how each property fits the investor's criteria. Do not name a winner or make a recommendation. No preamble, no "Here is the summary".`;

    const recommendationPrompt = `You are a commercial real estate advisor writing directly to your client, ${investor.name}.

Use "you" and "your" throughout — never third person.${scoreInstruction}${globalCatInstruction}
${bbContext}

Properties under review:
${allSummaries}

Write a 2-3 sentence recommendation telling the client which property best fits their investment thesis and exactly why. Be direct, specific, and speak as their advisor. No preamble.`;

    const [execSummary, recommendation] = await Promise.all([
      askText(summaryPrompt, { maxTokens: 300 }),
      compareMode ? askText(recommendationPrompt, { maxTokens: 300 }) : Promise.resolve(null),
    ]);

    // Per-deal AI risks/strengths — written to the investor directly
    const dealDetails = await Promise.all(
      deals.map(async (d) => {
        const isPrimary = primaryIds.has(d.id);
        const a = isPrimary ? undefined : assignmentMap.get(d.id);
        const score = a?.score ?? d.score;
        const grade = a?.grade ?? d.grade;
        const fin = computeFinance({
          price: d.askingPrice ?? 0,
          noi: d.noi ?? 0,
          ltv: bb.ltv,
          ratePercent: bb.interestRate,
          amortizationYears: bb.amortizationYears,
        });

        const catInstruction = dealCategoryInstruction(d);
        const noBoilerplate = "\nNever include generic single-tenant, single-asset concentration risk language. The investor selected net lease and already understands this structure.";
        const risksStrengths = await askText(
          `You are advising ${investor.name} on this net lease property. Write strengths and risks speaking directly to the investor using "you/your".${scoreInstruction}${catInstruction}${noBoilerplate}

Property: ${dealSummary(d)}

Return exactly this format (no extra text):
STRENGTHS:
- [bullet 1]
- [bullet 2]
- [bullet 3]
RISKS:
- [bullet 1]
- [bullet 2]
- [bullet 3]`,
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

        return { deal: d, finance: fin, score, grade, strengths, risks };
      })
    );

    const responseDeals = dealDetails.map((d) => ({
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
      grade: d.grade,
      score: d.score,
      scoreBreakdown: d.deal.scoreBreakdown,
      selfCheckerNotes: d.deal.selfCheckerNotes,
      finance: {
        loanAmount: d.finance.loanAmount,
        equityRequired: d.finance.equityRequired,
        monthlyDebtService: d.finance.monthlyDebtService,
        monthlyNetCashFlow: d.finance.monthlyNetCashFlow,
        dscr: d.finance.dscr,
        cashOnCash: d.finance.cashOnCash,
      },
      strengths: d.strengths,
      risks: d.risks,
    }));

    const reportPayload = {
      investor: { name: investor.name, entityName: investor.entityName },
      execSummary,
      recommendation,
      deals: responseDeals,
    };

    const report = await prisma.report.create({
      data: {
        investorId,
        dealIds,
        title: `${deals.length} Deal${deals.length !== 1 ? "s" : ""} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        reportData: reportPayload,
      },
    });

    return NextResponse.json({ reportId: report.id, ...reportPayload });
  } catch (e) {
    console.error("report generate error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
