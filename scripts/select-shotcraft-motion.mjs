import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const root = path.resolve(import.meta.dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const inputPath = arg('--input');
const input = inputPath ? readJson(path.resolve(inputPath)) : {
  text: arg('--query'),
  semantic_job: arg('--semantic-job'),
  carrier: arg('--carrier'),
  duration_sec: Number(arg('--duration-sec', '4')),
  style: arg('--style'),
  anchor_id: arg('--anchor-id'),
  recent_cards: arg('--recent-cards').split(',').filter(Boolean),
  eligibility: arg('--eligibility', 'ELIGIBLE')
};
if (!input.text && !input.semantic_job) throw new Error('Pass --input <beat.json> or --query <text>.');

if ((input.eligibility ?? 'ELIGIBLE') === 'INELIGIBLE') {
  console.log(JSON.stringify({schema_version: 'hf-motion-selection-1.0', eligibility: 'INELIGIBLE', candidates: [], reason: input.coverage_exception_reason ?? 'Beat is outside the motion denominator.'}, null, 2));
  process.exit(0);
}

const catalog = readJson(path.join(root, 'references', 'shotcraft-catalog.json'));
const core = readJson(path.join(root, 'references', 'core-motion-selection.json'));
const aliases = readJson(path.join(root, 'references', 'semantic-aliases.json')).routes ?? [];
const catalogByName = new Map(catalog.cards.map((card) => [card.name, card]));
const coreByName = new Map(core.cards.map((card) => [card.name, card]));
const queryText = [input.text, input.semantic_job, input.carrier].filter(Boolean).join(' ');
const normalize = (text = '') => String(text).toLowerCase().replace(/[\s，。；、：:,.!?！？“”"'（）()\-_/]+/g, '');
const normalizedQuery = normalize(queryText);
const grams = new Set();
for (let n = 2; n <= 4; n++) for (let i = 0; i <= normalizedQuery.length - n; i++) grams.add(normalizedQuery.slice(i, i + n));

const aliasRank = new Map();
const aliasIds = new Map();
for (const route of aliases) {
  if (!(route.triggers ?? []).some((trigger) => normalizedQuery.includes(normalize(trigger)))) continue;
  (route.targets ?? []).forEach((name, index) => {
    aliasRank.set(name, Math.max(aliasRank.get(name) ?? 0, 30 - index * 4));
    const ids = aliasIds.get(name) ?? [];
    if (!ids.includes(route.id)) ids.push(route.id);
    aliasIds.set(name, ids);
  });
}

const carrier = normalize(input.carrier ?? '');
const semantic = normalize(`${input.text ?? ''}${input.semantic_job ?? ''}`);
const duration = Number(input.duration_sec ?? 4);
const recent = new Set(input.recent_cards ?? []);
const recentFamilies = new Set((input.recent_cards ?? []).map((name) => coreByName.get(name)?.family).filter(Boolean));
const explicit = input.candidate_overrides ?? {};
const pool = core.cards.map((meta) => ({...catalogByName.get(meta.name), ...meta}));

const familyCarrierScore = (family) => {
  if (!carrier) return 14;
  const has = (...terms) => terms.some((term) => carrier.includes(normalize(term)));
  if (family === 'GENERAL_DATA') return has('数据','图表','指标','数字','销量','用户','流量','排名','库存','业绩','chart','metric') ? 20 : 11;
  if (family === 'UI_INTERACTION') return has('界面','网页','浏览器','手机','应用','软件','ui','app') ? 20 : 10;
  if (family === 'CAMERA_ROI') return has('人物','产品','界面','网页','图表','文件','证据','画面','视频','roi') ? 20 : 15;
  if (family === 'COMPARE_REPLACE_REVEAL') return has('前后','证据','文件','界面','产品','数据') ? 19 : 14;
  return 16;
};

const durationScore = (card) => {
  if (!Number.isFinite(duration) || duration <= 0) return 6;
  const values = [...String(card.duration ?? '').matchAll(/(\d+(?:\.\d+)?)\s*(?:s|秒)/gi)].map((m) => Number(m[1]));
  const min = values.length ? Math.min(...values) : 3;
  if (duration >= min) return 10;
  if (duration >= Math.max(1.2, min * 0.65)) return 6;
  return 2;
};

const scoreCard = (card) => {
  const haystack = normalize([card.name, card.summary, card.use, card.intention, ...(card.tags ?? [])].join(' '));
  let overlap = 0;
  for (const gram of grams) if (haystack.includes(gram)) overlap += gram.length;
  const semantic_relationship_match = Math.min(30, Math.max(aliasRank.get(card.name) ?? 0, overlap >= 45 ? 26 : overlap >= 22 ? 22 : overlap >= 10 ? 18 : 4));
  const sourceRoot = path.join(root, 'references', 'vendor', 'video-shotcraft');
  const required = [card.card_document, ...(card.implementation_sources ?? [])];
  const bundled = required.every((rel) => fs.existsSync(path.join(sourceRoot, rel)));
  const portability = card.hf_adaptation_status === 'PORTABLE' ? 8 : card.hf_adaptation_status === 'MOTION_BLUR_ADAPTATION' || card.hf_adaptation_status === 'TEMPLATE_COUPLED' ? 6 : 3;
  const breakdown = {
    semantic_relationship_match,
    carrier_roi_match: familyCarrierScore(card.family),
    duration_phase_fit: durationScore(card),
    narration_anchor_fit: input.anchor_id ? 10 : (input.anchor_types?.length ? 8 : 6),
    readability: duration >= 3 ? 8 : duration >= 2 ? 6 : 4,
    confirmed_style_fit: input.style ? 8 : 6,
    source_hf_readiness: bundled ? portability : Math.min(portability, 4),
    adjacent_continuity: recentFamilies.has(card.family) ? 4 : 6
  };
  const override = explicit[card.name] ?? {};
  Object.assign(breakdown, override.breakdown ?? {});
  const penalties = [];
  if (recent.has(card.name) || (input.recent_cards ?? []).slice(-3).includes(card.name)) penalties.push({id: 'RECENT_SAME_CARD', value: -15});
  if (recentFamilies.has(card.family) && input.penalize_recent_family === true) penalties.push({id: 'RECENT_SAME_GRAMMAR_FAMILY', value: -15});
  if (input.presenter_competition === true && card.family !== 'CAMERA_ROI') penalties.push({id: 'PRESENTER_OR_SUBTITLE_COMPETITION', value: -15});
  for (const penalty of override.penalties ?? []) penalties.push(penalty);
  const rejected = override.reject === true || (card.hf_adaptation_status === 'NATIVE_REWRITE_REQUIRED' && !override.native_rewrite_plan);
  const positive = Object.values(breakdown).reduce((sum, value) => sum + Number(value), 0);
  const selection_score = rejected ? 0 : Math.max(0, positive + penalties.reduce((sum, item) => sum + Number(item.value), 0));
  const decision = rejected ? 'REJECT' : selection_score >= 75 ? 'PRIMARY_CANDIDATE' : selection_score >= 65 ? 'SUPPORT_OR_BACKUP' : 'REJECT';
  return {
    name: card.name,
    family: card.family,
    core_tier: card.tier,
    selection_score,
    decision,
    breakdown,
    penalties,
    matched_aliases: aliasIds.get(card.name) ?? [],
    source_availability: bundled ? 'BUNDLED_PINNED' : 'CATALOG_ONLY',
    catalog_adaptation_status: card.hf_adaptation_status,
    implementation_status: 'CATALOG_MATCHED',
    use: card.use,
    duration: card.duration
  };
};

const tierRank = {A: 0, B: 1};
const candidates = pool.map(scoreCard)
  .sort((a, b) => b.selection_score - a.selection_score || (tierRank[a.core_tier] ?? 9) - (tierRank[b.core_tier] ?? 9) || a.name.localeCompare(b.name))
  .slice(0, Math.max(1, Number(arg('--limit', String(input.limit ?? 8))) || 8));
const primary = candidates.find((candidate) => candidate.decision === 'PRIMARY_CANDIDATE') ?? null;
console.log(JSON.stringify({
  schema_version: 'hf-motion-selection-1.0',
  eligibility: 'ELIGIBLE',
  query: queryText,
  core_pool_count: core.cards.length,
  target_eligible_coverage: 0.9,
  hard_floor_eligible_coverage: 0.8,
  primary,
  candidates,
  judgment_required: true,
  note: 'Deterministic scores support recall and comparison; the director must still verify carrier, anchor, layout, and whole-video continuity.'
}, null, 2));
