import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ----- Admin user (Ed) -----
  const adminEmail = process.env.ADMIN_EMAIL || "ed@blakedickson.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
  const hash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hash, name: "Ed Henderson" },
    create: { email: adminEmail, password: hash, name: "Ed Henderson" },
  });
  console.log(`Seeded admin user: ${adminEmail}`);

  // ----- Investor: Mark Coleman -----
  const existing = await prisma.investor.findFirst({
    where: { name: "Mark Coleman" },
  });

  if (existing) {
    console.log("Mark Coleman already seeded — skipping.");
    return;
  }

  const mark = await prisma.investor.create({
    data: {
      name: "Mark Coleman",
      email: null,
      entityName: "Octopus Island LLC",
      notes:
        "Primary thesis: early childhood education / ECLC. TLE brand preferred.",
      buyBox: {
        create: {
          capRateMin: 6.75,
          capRateTarget: 7.0,
          priceMax: 7000000,
          priceStretch: 7500000,
          leaseTypePreferred: "absolute_nnn",
          leaseTypeAcceptable: "nnn",
          termMinYears: 10,
          termPreferredYears: 15,
          bumpMinPercent: 2.0,
          bumpAltStructure: "10% every 5 years",
          flatLeaseAllowed: false,
          guarantyPreferred: "corporate",
          guarantyAcceptable: "multi_unit_franchisee",
          guarantyFloor: "single_personal",
          operatorMinUnits: 12,
          dscrMin: 1.35,
          ltv: 0.65,
          interestRate: 7.0,
          amortizationYears: 25,
          constructionPreferred: "new_build",
          hhiMin: 100000,
          assetTypesPreferred: ["eclc"],
          assetTypesAcceptable: [
            "qsr",
            "pharmacy",
            "medical",
            "dollar_store",
            "retail",
          ],
          currentMonthlyIncome: 31033,
          notes:
            "Primary thesis: early childhood education / ECLC. TLE brand preferred. Open to other NNN assets for comparison. Sits toward right side of leverage spectrum — primary goal is increasing total monthly cash flow with each acquisition. Existing portfolio: 9300 Lyons Mill Rd, Owings Mills MD — absolute NNN, 20-year term, $372,400/yr, closed 12/29/2025.",
        },
      },
    },
  });
  console.log(`Seeded investor: ${mark.name} (${mark.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
