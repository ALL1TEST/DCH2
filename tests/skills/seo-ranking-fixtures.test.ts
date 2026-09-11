// ============================================================
// SEO Ranking Skill Fixture Harness Test
// Verifies implementation against seo-ranking-skill fixtures
// ============================================================

import fs from 'fs';
import path from 'path';
import { validateArticleSeo } from '../../src/lib/skills/seo-ranking/validator';
import { detectCannibalization } from '../../src/lib/skills/seo-ranking/cannibalization';

async function runTests() {
  const fixturesDir = path.join(
    process.cwd(),
    'seo-ranking-skill',
    'skills',
    'seo-ranking',
    'fixtures'
  );
  const expectedJsonPath = path.join(fixturesDir, 'expected-results.json');
  const expectedData = JSON.parse(fs.readFileSync(expectedJsonPath, 'utf-8'));

  const inventoryPath = path.join(fixturesDir, 'cms-inventory.json');
  const cmsInventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

  console.log('--- RUNNING SEO RANKING FIXTURE TESTS ---');
  let passedCount = 0;
  let totalCount = expectedData.fixtures.length;

  for (const fixture of expectedData.fixtures) {
    const fixtureFilePath = path.join(fixturesDir, fixture.file);
    const content = fs.readFileSync(fixtureFilePath, 'utf-8');

    if (fixture.expected_phase === 'PLAN' && fixture.file === 'cannibalized-topic.md') {
      // Cannibalization test at PLAN phase
      const canReport = await detectCannibalization({
        title: 'Best Air Fryers: 2025 Review',
        primaryKeyword: 'best air fryers',
        intent: 'commercial',
        suppliedInventory: cmsInventory,
      });

      const isBlocked = canReport.status === 'BLOCKED' && canReport.risk_level === 'HIGH';
      if (isBlocked) {
        console.log(`[PASS] ${fixture.file}: PLAN Phase blocked with cannibalization_high (matches expected)`);
        passedCount++;
      } else {
        console.error(`[FAIL] ${fixture.file}: Expected BLOCKED, got ${canReport.status} / ${canReport.risk_level}`);
      }
      continue;
    }

    const report = validateArticleSeo({
      article: content,
      cms_inventory: cmsInventory,
    });

    const isVerdictCorrect = report.verdict === fixture.expected_verdict;
    const isScoreCorrect =
      fixture.expected_content_score === undefined ||
      report.scores.content_score === fixture.expected_content_score;

    const reportedIssueTypes = report.issues.map((i) => i.type);
    const hasExpectedIssues = (fixture.expected_issue_types || []).every((expectedType: string) =>
      reportedIssueTypes.includes(expectedType)
    );

    if (isVerdictCorrect && isScoreCorrect && hasExpectedIssues) {
      console.log(
        `[PASS] ${fixture.file}: verdict=${report.verdict}, score=${report.scores.content_score} (matches expected)`
      );
      passedCount++;
    } else {
      console.error(`[FAIL] ${fixture.file}:`);
      if (!isVerdictCorrect) {
        console.error(`  Verdict mismatch: got ${report.verdict}, expected ${fixture.expected_verdict}`);
      }
      if (!isScoreCorrect) {
        console.error(`  Score mismatch: got ${report.scores.content_score}, expected ${fixture.expected_content_score}`);
      }
      if (!hasExpectedIssues) {
        console.error(`  Issue type mismatch:\n    Got: [${reportedIssueTypes.join(', ')}]\n    Expected: [${fixture.expected_issue_types.join(', ')}]`);
      }
    }
  }

  console.log(`\nResult: ${passedCount}/${totalCount} SEO ranking fixtures passed.\n`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('SEO fixture runner error:', err);
  process.exit(1);
});
