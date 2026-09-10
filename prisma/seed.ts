/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { canonicalInstagramUrl } from "../src/lib/instagram";

const prisma = new PrismaClient();

const CATEGORIES: { name: string; description: string }[] = [
  { name: "Creators", description: "Independent creators building an audience." },
  { name: "Influencers", description: "Profiles with reach and engagement." },
  { name: "Brands", description: "Company and product accounts." },
  { name: "Fashion", description: "Style, streetwear and runway." },
  { name: "Fitness", description: "Training, coaching and wellness." },
  { name: "Gaming", description: "Streamers, esports and game studios." },
  { name: "Music", description: "Artists, producers and labels." },
  { name: "Food", description: "Chefs, restaurants and recipe accounts." },
  { name: "Travel", description: "Destinations, guides and nomads." },
  { name: "Finance", description: "Investing, markets and personal finance." },
  { name: "Technology", description: "Builders, gadgets and dev culture." },
  { name: "Education", description: "Teachers, courses and explainers." },
  { name: "Memes", description: "Comedy and meme pages." },
  { name: "Entertainment", description: "Film, TV and pop culture." },
  { name: "Lifestyle", description: "Daily life, home and self-improvement." },
  { name: "Business", description: "Founders, agencies and B2B." },
  { name: "Other", description: "Everything else." },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedCategories() {
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const slug = slugify(c.name);
    await prisma.category.upsert({
      where: { slug },
      create: { name: c.name, slug, description: c.description, active: true, sortOrder: i },
      update: { name: c.name, description: c.description, sortOrder: i },
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);
}

async function seedSettings() {
  await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  console.log("Ensured settings row");
}

async function seedDemo() {
  if (process.env.SEED_DEMO !== "1") {
    console.log("Skipping demo data (set SEED_DEMO=1 to include it)");
    return;
  }
  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  // [username, category, [ {chargeCents, hoursAgo} ... ] ]
  const demo: [string, string, { charge: number; h: number }[]][] = [
    ["creatorhouse", "creators", [{ charge: 1000, h: 240 }, { charge: 2500, h: 60 }, { charge: 4000, h: 3 }]],
    ["stylebymara", "fashion", [{ charge: 1000, h: 200 }, { charge: 3000, h: 20 }, { charge: 2000, h: 6 }]],
    ["liftwithleo", "fitness", [{ charge: 1500, h: 150 }, { charge: 1500, h: 40 }]],
    ["pixelforge", "gaming", [{ charge: 1000, h: 90 }, { charge: 1200, h: 10 }]],
    ["nomad.notes", "travel", [{ charge: 1000, h: 30 }, { charge: 800, h: 2 }]],
    ["chef.otto", "food", [{ charge: 1000, h: 5 }]],
    ["quant.daily", "finance", [{ charge: 5000, h: 300 }, { charge: 6000, h: 1 }]],
    ["build.in.public", "technology", [{ charge: 1000, h: 100 }, { charge: 500, h: 0.5 }]],
  ];

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@outbidinsta.lol" },
    create: { email: "demo@outbidinsta.lol" },
    update: {},
  });

  for (const [username, catSlug, contributions] of demo) {
    const category = await prisma.category.findUnique({ where: { slug: catSlug } });
    if (!category) continue;

    const listing = await prisma.listing.upsert({
      where: { username },
      create: {
        username,
        instagramUrl: canonicalInstagramUrl(username),
        categoryId: category.id,
        currency: "USD",
        status: "ACTIVE",
      },
      update: {},
    });

    let runningTotal = listing.totalCents;
    for (const { charge, h } of contributions) {
      const target = runningTotal + charge;
      const when = hoursAgo(h);
      const payment = await prisma.payment.create({
        data: {
          provider: "dodo",
          providerPaymentId: `demo_${listing.id}_${target}`,
          listingId: listing.id,
          userId: demoUser.id,
          amountCents: charge,
          currency: "USD",
          status: "paid",
        },
      });
      const bid = await prisma.bid.create({
        data: {
          listingId: listing.id,
          bidderId: demoUser.id,
          amountCents: charge,
          targetTotalCents: target,
          basedOnTotalCents: runningTotal,
          currency: "USD",
          status: "CONFIRMED",
          confirmedAt: when,
          intendedTop: true,
          paymentId: payment.id,
        },
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { bidId: bid.id } });
      await prisma.activityEvent.create({
        data: {
          type: runningTotal === 0 ? "NEW_LISTING" : "RAISE",
          listingId: listing.id,
          username: listing.username,
          categorySlug: catSlug,
          amountCents: charge,
          totalCents: target,
          currency: "USD",
          createdAt: when,
        },
      });
      runningTotal = target;
    }

    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        totalCents: runningTotal,
        bidCount: contributions.length,
        lastBidAt: hoursAgo(Math.min(...contributions.map((c) => c.h))),
        firstBidderId: demoUser.id,
      },
    });
  }
  console.log(`Seeded ${demo.length} demo listings`);
}

async function main() {
  await seedCategories();
  await seedSettings();
  await seedDemo();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
