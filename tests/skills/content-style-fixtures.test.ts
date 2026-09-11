// ============================================================
// Content Style Skill Fixture Harness Test
// Verifies implementation against content-style-skill fixtures
// ============================================================

import fs from 'fs';
import path from 'path';
import { validateContentStyle } from '../../src/lib/skills/content-style/validator';
import type { ContentClassification } from '../../src/lib/skills/content-style/types';

async function runTests() {
  const fixturesDir = path.join(
    process.cwd(),
    'content-style-skill',
    'skills',
    'content-style',
    'fixtures'
  );
  const expectedJsonPath = path.join(fixturesDir, 'expected-results.json');
  const expectedData = JSON.parse(fs.readFileSync(expectedJsonPath, 'utf-8'));

  console.log('--- RUNNING CONTENT STYLE FIXTURE TESTS ---');
  let passedCount = 0;
  let totalCount = expectedData.fixtures.length;

  for (const fixture of expectedData.fixtures) {
    const fixtureFilePath = path.join(fixturesDir, fixture.file);
    const content = fs.readFileSync(fixtureFilePath, 'utf-8');

    const classification: ContentClassification = {
      content_type: fixture.classification.content_type || 'informational',
      niche: fixture.classification.niche || 'general',
    };

    const report = validateContentStyle({
      article: content,
      classification,
      target_word_count: fixture.classification.target_word_count,
    });

    const isVerdictCorrect = report.verdict === fixture.expected_verdict;

    // Check expected check results
    let checksCorrect = true;
    const mismatches: string[] = [];

    if (fixture.expected_check_results) {
      for (const [checkId, expectedResult] of Object.entries(fixture.expected_check_results)) {
        const foundCheck = report.checks.find((c) => c.id === checkId);
        if (!foundCheck) {
          checksCorrect = false;
          mismatches.push(`${checkId}: missing (expected ${expectedResult})`);
        } else if (foundCheck.result !== expectedResult) {
          checksCorrect = false;
          mismatches.push(`${checkId}: got ${foundCheck.result}, expected ${expectedResult}`);
        }
      }
    }

    if (isVerdictCorrect && checksCorrect) {
      console.log(`[PASS] ${fixture.file}: verdict=${report.verdict} (matches expected)`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${fixture.file}:`);
      if (!isVerdictCorrect) {
        console.error(`  Verdict mismatch: got ${report.verdict}, expected ${fixture.expected_verdict}`);
      }
      if (mismatches.length > 0) {
        console.error(`  Check mismatches:\n    ${mismatches.join('\n    ')}`);
      }
    }
  }

  console.log(`\nResult: ${passedCount}/${totalCount} content style fixtures passed.\n`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fixture runner error:', err);
  process.exit(1);
});
