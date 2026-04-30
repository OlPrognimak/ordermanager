#!/usr/bin/env node
import { discoverBestBtcUpdown5mMarket, discoverBtcUpdown5mMarkets } from "./marketDiscovery.mjs";

async function main() {
  const best = await discoverBestBtcUpdown5mMarket({ limit: 500 });
  if (best) {
    console.log("Best current market (slug-first via CLOB time + Gamma /markets/slug):");
    console.log(`  ${best.question}`);
    console.log(`  slug=${best.slug}`);
    console.log(`  YES_ASSET_ID=${best.yesAssetId}`);
    console.log(`  NO_ASSET_ID=${best.noAssetId}`);
    process.exit(0);
  }

  console.log("Slug-first discovery failed; scanning markets list…");
  const cands = await discoverBtcUpdown5mMarkets(500);
  if (!cands.length) {
    console.log("No obvious active BTC up/down 5m markets found.");
    process.exit(1);
  }
  console.log(`\nList scan: ${cands.length} candidate market(s) (showing up to 10):`);
  for (let i = 0; i < Math.min(10, cands.length); i++) {
    const m = cands[i];
    console.log(`\n[${i + 1}] ${m.question}`);
    console.log(`slug=${m.slug}`);
    console.log(`YES_ASSET_ID=${m.yesAssetId}`);
    console.log(`NO_ASSET_ID=${m.noAssetId}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
