import {
  detectNiche,
  detectArticleType,
  detectSearchIntent,
  buildEditorialPrompts,
  validateAndPolishContent,
} from '../src/lib/ai/editorial-skill';

console.log('Testing Editorial Skill Module...');

// 1. Test Niche Detection
const testCases = [
  { title: 'Crispy Garlic Butter Salmon with Lemon Herb Risotto', expected: 'food' },
  { title: '2025 Porsche 911 GT3 RS: Track Test and Specs Review', expected: 'automotive' },
  { title: 'How to Install Subway Tile Backsplash in a Small Kitchen', expected: 'home_diy' },
  { title: 'Best Companion Plants for Tomatoes in Raised Garden Beds', expected: 'gardening' },
  { title: 'Next.js 15 Server Actions vs API Routes: Complete Benchmark', expected: 'tech' },
  { title: 'High-Yield Savings Accounts vs Short-Term CDs in 2025', expected: 'finance' },
  { title: '7 Days in Kyoto: A Practical Travel Itinerary for First-Timers', expected: 'travel' },
  { title: 'Gentle Sleep Training Methods for 6-Month-Old Babies', expected: 'parenting' },
];

for (const tc of testCases) {
  const detected = detectNiche(tc.title);
  console.log(`[NICHE] "${tc.title.slice(0, 35)}..." => ${detected} (expected: ${tc.expected})`);
  if (detected !== tc.expected) {
    throw new Error(`Niche mismatch for "${tc.title}": got ${detected}, expected ${tc.expected}`);
  }
}

// 2. Test Blueprint Generation
const editorial = buildEditorialPrompts({
  title: '2025 Porsche 911 GT3 RS: Track Test and Specs Review',
  brief: 'Review handling, engine performance, aerodynamics, and daily usability.',
  keywords: 'porsche 911 gt3 rs, 2025 911 gt3 rs review, track test, performance specs',
  targetLength: '1500-2500',
});

console.log(`[BLUEPRINT] Niche: ${editorial.blueprint.niche}`);
console.log(`[BLUEPRINT] Article Type: ${editorial.blueprint.articleType}`);
console.log(`[BLUEPRINT] Search Intent: ${editorial.blueprint.searchIntent}`);
console.log(`[BLUEPRINT] Structure Outline:`, editorial.blueprint.recommendedStructure);

// 3. Test Validation and Polish with Banned AI Opening and Clichés
const simulatedRawAI = `\`\`\`html
<html>
<body>
<h1>2025 Porsche 911 GT3 RS: Track Test and Specs Review</h1>
<p>In today's fast-paced world, finding the perfect sports car can be difficult. Whether you're a beginner or an expert, the 911 GT3 RS delivers thrilling downforce.</p>
<h2>Key Engine Specifications</h2>
<p>The naturally aspirated 4.0-liter flat-six revs up to an intoxicating 9,000 RPM, producing 518 horsepower and 342 lb-ft of torque.</p>
<table>
  <tr><th>Specification</th><th>Measurement</th></tr>
  <tr><td>Engine</td><td>4.0L Naturally Aspirated Boxer-6</td></tr>
  <tr><td>0-60 mph</td><td>3.0 seconds</td></tr>
</table>
<h2>Track Usability & Handling</h2>
<p>On circuit tarmac, the active aero creates 1,895 lbs of downforce at 177 mph, firmly planting the Michelin Pilot Sport Cup 2 R tires.</p>
<blockquote>Essential track note: Tire pressures need monitoring after 3 hot laps.</blockquote>
<h2>Final Verdict</h2>
<p>In conclusion, the GT3 RS remains the benchmark for naturally aspirated track performance.</p>
</body>
</html>
\`\`\``;

const polished = validateAndPolishContent(simulatedRawAI, {
  title: '2025 Porsche 911 GT3 RS: Track Test and Specs Review',
  targetLength: '800-1200',
});

console.log('[POLISHED RESULT]');
console.log(polished.content);
console.log('[QUALITY REPORT]', JSON.stringify(polished.qualityReport, null, 2));

if (polished.content.includes('```')) {
  throw new Error('Code fence was not removed');
}
if (polished.content.includes('<html>') || polished.content.includes('<body>')) {
  throw new Error('Wrapper tags not removed');
}
if (polished.content.includes("In today's fast-paced world")) {
  throw new Error('Banned AI cliché not removed');
}
if (polished.content.includes('In conclusion,')) {
  throw new Error('In conclusion was not cleaned');
}

console.log('ALL EDITORIAL SKILL TESTS PASSED SUCCESSFULLY!');
