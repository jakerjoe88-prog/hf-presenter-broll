import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const core = readJson(path.join(root, 'references', 'core-motion-selection.json'));
const catalog = readJson(path.join(root, 'references', 'shotcraft-catalog.json'));
const catalogByName = new Map(catalog.cards.map((card) => [card.name, card]));
const vendorRoot = path.join(root, 'references', 'vendor', 'video-shotcraft');
const errors = [];
const warnings = [];
const names = core.cards.map((card) => card.name);
if (core.cards.length !== 60) errors.push(`Expected 60 core cards, found ${core.cards.length}.`);
if (new Set(names).size !== names.length) errors.push('Core card names are not unique.');
for (const tier of ['A', 'B']) {
  const count = core.cards.filter((card) => card.tier === tier).length;
  if (count !== 30) errors.push(`Expected 30 Tier ${tier} cards, found ${count}.`);
}
for (const [family, expected] of Object.entries(core.family_counts ?? {})) {
  const count = core.cards.filter((card) => card.family === family).length;
  if (count !== expected) errors.push(`Family ${family}: expected ${expected}, found ${count}.`);
}
for (const selected of core.cards) {
  const card = catalogByName.get(selected.name);
  if (!card) {
    errors.push(`Missing catalog card: ${selected.name}`);
    continue;
  }
  for (const rel of [card.card_document, ...(card.implementation_sources ?? [])]) {
    if (!fs.existsSync(path.join(vendorRoot, rel))) errors.push(`Missing bundled source for ${selected.name}: ${rel}`);
  }
  if (card.hf_adaptation_status !== 'PORTABLE') warnings.push(`${selected.name}: ${card.hf_adaptation_status}`);
}
const report = {
  schema_version: 'hf-core-motion-validation-1.0',
  status: errors.length ? 'FAIL' : 'PASS',
  catalog_count: catalog.cards.length,
  core_count: core.cards.length,
  tier_counts: Object.fromEntries(['A','B'].map((tier) => [tier, core.cards.filter((card) => card.tier === tier).length])),
  family_counts: Object.fromEntries(Object.keys(core.family_counts ?? {}).map((family) => [family, core.cards.filter((card) => card.family === family).length])),
  conditional_cards: warnings,
  errors
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;
