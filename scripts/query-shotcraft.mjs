import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};

const catalogPath = path.resolve(arg('--catalog', path.join(import.meta.dirname, '..', 'references', 'shotcraft-catalog.json')));
const aliasesPath = path.resolve(arg('--aliases', path.join(import.meta.dirname, '..', 'references', 'semantic-aliases.json')));
const corePath = path.resolve(arg('--core-library', path.join(import.meta.dirname, '..', 'references', 'core-motion-selection.json')));
const query = arg('--query').trim().toLowerCase();
const category = arg('--category').trim().toLowerCase();
const status = arg('--status').trim().toUpperCase();
const coreOnly = argv.includes('--core') || argv.includes('--curated');
const limit = Math.max(1, Number(arg('--limit', '10')) || 10);
const minScore = Math.max(0, Number(arg('--min-score', '20')) || 0);
if (!query && !category && !status && !coreOnly) throw new Error('Pass --query, --category, --status, or --core');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const coreLibrary = fs.existsSync(corePath) ? JSON.parse(fs.readFileSync(corePath, 'utf8')) : {cards: []};
const coreByName = new Map((coreLibrary.cards ?? []).map((card) => [card.name, card]));
const aliases = fs.existsSync(aliasesPath)
  ? JSON.parse(fs.readFileSync(aliasesPath, 'utf8')).routes ?? []
  : [];
const normalize = (text) => text.toLowerCase().replace(/[\s，。；、：:,.!?！？“”"'（）()\-_/]+/g, '');
const grams = (text) => {
  const clean = normalize(text);
  const out = new Set();
  for (let n = 2; n <= 4; n++) for (let i = 0; i <= clean.length - n; i++) out.add(clean.slice(i, i + n));
  if (clean.length) out.add(clean);
  return out;
};
const qg = grams(query);
const normalizedQuery = normalize(query);
const semanticBoosts = new Map();
const matchedAliasIds = new Map();
for (const route of aliases) {
  if (!query || !(route.triggers ?? []).some((trigger) => normalizedQuery.includes(normalize(trigger)))) continue;
  for (let i = 0; i < (route.targets ?? []).length; i++) {
    const target = route.targets[i];
    semanticBoosts.set(target, Math.max(semanticBoosts.get(target) ?? 0, 240 - i * 45));
    const ids = matchedAliasIds.get(target) ?? [];
    if (!ids.includes(route.id)) ids.push(route.id);
    matchedAliasIds.set(target, ids);
  }
}

const bundledRoot = path.join(import.meta.dirname, '..', 'references', 'vendor', 'video-shotcraft');
const explicitSourceRoot = arg('--source-root');
const sourceCandidates = [];
if (explicitSourceRoot) sourceCandidates.push(path.resolve(explicitSourceRoot));
if (process.env.SHOTCRAFT_SOURCE_ROOT) sourceCandidates.push(path.resolve(process.env.SHOTCRAFT_SOURCE_ROOT));
let cursor = process.cwd();
while (true) {
  sourceCandidates.push(path.join(cursor, 'HF_video_generation_archive', 'external-sources', 'video-shotcraft-pinned'));
  sourceCandidates.push(path.join(cursor, '.shotcraft-upstream-0d6f0b5'));
  const parent = path.dirname(cursor);
  if (parent === cursor) break;
  cursor = parent;
}
const uniqueSourceCandidates = [...new Set(sourceCandidates)];
const sourceStatus = (card) => {
  const required = [card.card_document, ...(card.implementation_sources ?? [])];
  const completeAt = (root) => fs.existsSync(root) && required.every((rel) => fs.existsSync(path.join(root, rel)));
  if (completeAt(bundledRoot)) return {source_availability: 'BUNDLED_PINNED', source_root: bundledRoot};
  const workspaceRoot = uniqueSourceCandidates.find(completeAt);
  if (workspaceRoot) return {source_availability: 'WORKSPACE_PINNED', source_root: workspaceRoot};
  return {source_availability: 'CATALOG_ONLY', source_root: null};
};

const results = catalog.cards
  .filter((c) => category ? c.category.toLowerCase() === category : (!coreOnly || coreByName.has(c.name)))
  .filter((c) => !status || c.hf_adaptation_status === status)
  .map((c) => {
    const name = c.name.toLowerCase();
    const summary = c.summary.toLowerCase();
    const use = c.use.toLowerCase();
    const intention = c.intention.toLowerCase();
    const styleText = (c.styles ?? []).flatMap((s) => [s.key, s.label, s.use ?? '']).join(' ').toLowerCase();
    const haystack = [name, summary, use, intention, ...(c.tags ?? []), styleText].join(' ').toLowerCase();
    let score = 0;
    if (query && name.includes(query)) score += 180;
    if (query && use.includes(query)) score += 150;
    if (query && summary.includes(query)) score += 120;
    if (query && styleText.includes(query)) score += 100;
    if (query && intention.includes(query)) score += 60;
    for (const gram of qg) if (haystack.includes(gram)) score += gram.length;
    score += semanticBoosts.get(c.name) ?? 0;
    if (name === query) score += 200;
    const retrieval_confidence = score >= 180 ? 'HIGH' : score >= 80 ? 'MEDIUM' : 'LOW';
    return {...c, core_family: coreByName.get(c.name)?.family ?? null, core_tier: coreByName.get(c.name)?.tier ?? null, search_score: score, retrieval_confidence, matched_aliases: matchedAliasIds.get(c.name) ?? [], ...sourceStatus(c)};
  })
  .filter((c) => !query || c.search_score >= minScore)
  .sort((a, b) => b.search_score - a.search_score || a.name.localeCompare(b.name))
  .slice(0, limit)
  .map(({name, category: cat, core_family, core_tier, use, duration, energy, hf_adaptation_status, card_document, implementation_sources, search_score, retrieval_confidence, matched_aliases, source_availability, source_root}) => ({name, category: cat, core_family, core_tier, search_score, retrieval_confidence, matched_aliases, source_availability, source_root, use, duration, energy, hf_adaptation_status, card_document, implementation_sources}));

console.log(JSON.stringify({query, category, status, scope: category || (coreOnly ? 'core:60' : 'all:152'), min_score: minScore, count: results.length, results}, null, 2));
