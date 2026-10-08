import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const argv = process.argv.slice(2);
const isMain = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const arg = (name, fallback = '') => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
};

export function validateCoverage(plan, target = 0.8) {
  const beats = Array.isArray(plan?.beats) ? plan.beats : [];
  const errors = [];
  const eligible = beats.filter((beat) => beat.shotcraft_eligible === true || beat.eligibility === 'ELIGIBLE');
  const used = eligible.filter((beat) => ['SHOTCRAFT_PRIMARY', 'SHOTCRAFT_SUPPORT'].includes(beat.decision));
  const uncovered = eligible.filter((beat) => !['SHOTCRAFT_PRIMARY', 'SHOTCRAFT_SUPPORT'].includes(beat.decision));
  const undocumented = uncovered.filter((beat) => !String(beat.coverage_exception_reason ?? '').trim());
  const ratio = eligible.length ? used.length / eligible.length : null;

  if (undocumented.length) {
    errors.push(`Eligible beats without Shotcraft or an exception reason: ${undocumented.map((beat) => beat.id ?? beat.script_excerpt ?? 'unknown').join(', ')}`);
  }

  let status = 'NOT_APPLICABLE';
  if (eligible.length) {
    if (!errors.length && ratio >= target) status = 'PASS';
    else if (!errors.length && uncovered.length && uncovered.every((beat) => String(beat.coverage_exception_reason ?? '').trim())) status = 'PASS_WITH_EXCEPTIONS';
    else status = 'FAIL';
  }

  return {
    schema_version: 'shotcraft-coverage-1.0',
    status,
    target,
    eligible_beats: eligible.length,
    used_beats: used.length,
    coverage: ratio === null ? null : Number(ratio.toFixed(4)),
    uncovered: uncovered.map((beat) => ({id: beat.id ?? null, reason: beat.coverage_exception_reason ?? null})),
    errors
  };
}

if (isMain && argv.includes('--self-test')) {
  const result = validateCoverage({beats: [
    {id: 'b1', shotcraft_eligible: true, decision: 'SHOTCRAFT_PRIMARY'},
    {id: 'b2', shotcraft_eligible: true, decision: 'SHOTCRAFT_SUPPORT'},
    {id: 'b3', shotcraft_eligible: true, decision: 'SHOTCRAFT_PRIMARY'},
    {id: 'b4', shotcraft_eligible: true, decision: 'SHOTCRAFT_PRIMARY'},
    {id: 'b5', shotcraft_eligible: true, decision: 'NO_SHOTCRAFT', coverage_exception_reason: 'Evidence reading hold is clearer.'}
  ]});
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === 'PASS' ? 0 : 1);
}

if (isMain) {
  const input = arg('--input');
  if (!input) {
    console.error('Usage: node validate-shotcraft-coverage.mjs --input <routing-plan.json> [--target 0.8]');
    process.exit(2);
  }
  const plan = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
  const result = validateCoverage(plan, Number(arg('--target', '0.8')) || 0.8);
  console.log(JSON.stringify(result, null, 2));
  process.exit(['PASS', 'PASS_WITH_EXCEPTIONS', 'NOT_APPLICABLE'].includes(result.status) ? 0 : 1);
}
