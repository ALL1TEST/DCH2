// ============================================================
// GLOBAL PROFESSIONAL EDITORIAL CONTENT STYLE SKILL
// ============================================================
// Ensures all AI-generated articles in the CMS (Manual Generation,
// Automation, AI Ideas -> Article, Regeneration) follow the standards
// of professional high-quality niche blog publications.
//
// 1. Detects article type, niche, and search intent.
// 2. Builds a niche-aware editorial blueprint with multi-format content.
// 3. Injects the 22 Global Editorial Content Skill principles.
// 4. Validates and polishes the generated content against anti-AI patterns.
// ============================================================

export type ArticleNiche =
  | 'food'
  | 'automotive'
  | 'home_diy'
  | 'gardening'
  | 'tech'
  | 'finance'
  | 'travel'
  | 'parenting'
  | 'health_fitness'
  | 'education'
  | 'general';

export type ArticleType =
  | 'listicle'
  | 'how_to'
  | 'comparison'
  | 'review'
  | 'deep_dive'
  | 'recipe'
  | 'general_editorial';

export type SearchIntent =
  | 'informational'
  | 'commercial'
  | 'transactional'
  | 'navigational';

export interface EditorialInput {
  title: string;
  brief?: string;
  keywords?: string;
  writingStyle?: string;
  targetLength?: string;
  includeCta?: boolean;
  extraInstructions?: string;
}

export interface EditorialBlueprint {
  niche: ArticleNiche;
  nicheLabel: string;
  articleType: ArticleType;
  typeLabel: string;
  searchIntent: SearchIntent;
  targetWordCount: string;
  recommendedStructure: string[];
  nicheSpecificRules: string[];
  multiFormatBlocks: string[];
  antiAiBannedPhrases: string[];
}

export interface EditorialQualityReport {
  wordCount: number;
  niche: ArticleNiche;
  articleType: ArticleType;
  searchIntent: SearchIntent;
  hasStrongIntro: boolean;
  h2Count: number;
  h3Count: number;
  hasMultiFormat: boolean;
  tableCount: number;
  listCount: number;
  calloutCount: number;
  hasFaq: boolean;
  hasConclusion: boolean;
  bannedPhrasesFound: string[];
  passedValidation: boolean;
}

// ------------------------------------------------------------
// 1. NICHE & INTENT DETECTION
// ------------------------------------------------------------

export function detectNiche(title: string, brief = '', keywords = ''): ArticleNiche {
  const text = `${title} ${brief} ${keywords}`.toLowerCase();

  const patterns: Array<{ niche: ArticleNiche; regex: RegExp; weight: number }> = [
    // Home & DIY (prioritize specific DIY tasks over rooms like 'kitchen')
    {
      niche: 'home_diy',
      regex: /\b(diy|home improvement|woodworking|renovation|remodel|plumbing|drywall|painting|furniture|carpentry|hardware|tile|backsplash|caulk|decorating|cabinet|countertop|roofing|patio|flooring|insulation|wallpaper)\b/gi,
      weight: 2,
    },
    // Food & Recipes
    {
      niche: 'food',
      regex: /\b(recipe|recipes|cook|cooking|bake|baking|ingredient|ingredients|dish|salad|dessert|dinner|lunch|breakfast|cuisine|appetizer|flavor|roast|grill|pasta|cake|skillet|salmon|chicken|beef|steak|pork|seafood|shrimp|fish|garlic|butter|risotto|soup|sauce|bread|meal|culinary)\b/gi,
      weight: 2,
    },
    // Cars & Automotive
    {
      niche: 'automotive',
      regex: /\b(car|cars|automotive|vehicle|vehicles|suv|sedan|truck|ev|electric vehicle|hybrid|engine|transmission|horsepower|mpg|torque|test drive|mileage|honda|toyota|ford|bmw|audi|mercedes|porsche|hyundai|kia|tires|suspension)\b/gi,
      weight: 2,
    },
    // Gardening
    {
      niche: 'gardening',
      regex: /\b(gardening|garden|plants?|flowers?|vegetables?|pruning|soil|fertilizer|lawn|watering|seeds?|harvest|greenhouse|mulch|compost|perennials?|annuals?|succulents?|botanical|raised bed)\b/gi,
      weight: 2,
    },
    // Tech & Software
    {
      niche: 'tech',
      regex: /\b(tech|technology|software|app|apps|coding|programming|python|javascript|typescript|next\.?js|ai|machine learning|cloud|cybersecurity|gadgets?|hardware|saas|developer|framework|database|ios|android|linux|api)\b/gi,
      weight: 2,
    },
    // Finance & Money
    {
      niche: 'finance',
      regex: /\b(finance|money|invest|investing|stocks?|crypto|cryptocurrency|budget|budgeting|mortgage|savings?|retirement|401k|ira|loans?|credit|taxes?|wealth|dividends?|interest rate|high-yield)\b/gi,
      weight: 2,
    },
    // Travel
    {
      niche: 'travel',
      regex: /\b(travel|destination|itinerary|trip|flight|flights|hotel|hotels|resort|vacation|tourism|packing|backpacking|city guide|road trip|sightseeing|airline)\b/gi,
      weight: 2,
    },
    // Parenting & Family
    {
      niche: 'parenting',
      regex: /\b(parenting|parents?|children|kids?|babies|baby|toddler|toddlers|pregnancy|motherhood|fatherhood|family|teenagers?|pediatric|homeschooling|sleep train)\b/gi,
      weight: 2,
    },
    // Health & Fitness
    {
      niche: 'health_fitness',
      regex: /\b(fitness|workout|exercise|exercises|gym|muscle|cardio|nutrition|diet|weight loss|wellness|stretching|health|running|recovery|supplements?)\b/gi,
      weight: 2,
    },
    // Education & Learning
    {
      niche: 'education',
      regex: /\b(education|study|studying|student|students|course|courses|exam|learning|degree|college|university|curriculum|academic)\b/gi,
      weight: 2,
    },
  ];

  let bestNiche: ArticleNiche = 'general';
  let maxScore = 0;

  for (const { niche, regex, weight } of patterns) {
    const matches = text.match(regex);
    const score = (matches?.length || 0) * weight;
    if (score > maxScore) {
      maxScore = score;
      bestNiche = niche;
    }
  }

  return bestNiche;
}

export function detectArticleType(title: string, brief = ''): ArticleType {
  const text = `${title} ${brief}`.toLowerCase();

  // Recipe check first
  if (/\b(recipe|how to bake|how to cook|ingredients)\b/i.test(text)) {
    return 'recipe';
  }

  // Comparison
  if (/\b(vs\.?|versus|compare|comparison|differences? between|which is better)\b/i.test(text)) {
    return 'comparison';
  }

  // Listicle / "Best"
  if (/\b(\d+|top\s+\d+|best\s+\d+|best|top|greatest|essential)\b/i.test(text)) {
    return 'listicle';
  }

  // How-to / Tutorial
  if (/\b(how to|guide to|step[- ]by[- ]step|tutorial|walkthrough|beginner'?s guide)\b/i.test(text)) {
    return 'how_to';
  }

  // Review
  if (/\b(review|reviewed|worth it|hands-on|test drive)\b/i.test(text)) {
    return 'review';
  }

  // Deep Dive / Explainer
  if (/\b(what is|explained|everything you need to know|deep dive|understanding|complete guide)\b/i.test(text)) {
    return 'deep_dive';
  }

  return 'general_editorial';
}

export function detectSearchIntent(title: string, brief = '', keywords = ''): SearchIntent {
  const text = `${title} ${brief} ${keywords}`.toLowerCase();

  if (/\b(buy|deal|discount|coupon|pricing|cost|for sale|order)\b/i.test(text)) {
    return 'transactional';
  }

  if (/\b(best|top|vs|versus|review|compare|comparison|worth it|recommend)\b/i.test(text)) {
    return 'commercial';
  }

  return 'informational';
}

// ------------------------------------------------------------
// 2. BANNED ANTI-AI CLICHÉ PATTERNS
// ------------------------------------------------------------

export const BANNED_AI_OPENINGS = [
  "in today's fast-paced world",
  "in today's digital age",
  "in today's world",
  "whether you're a beginner or an expert",
  "whether you are a beginner or",
  "are you looking for",
  "in this comprehensive guide",
  "in this article, we will explore",
  "in this guide, we will dive into",
  "let's dive in",
  "let's dive deep",
  "when it comes to",
  "it's important to remember that",
  "it's important to note that",
  "it's worth noting that",
  "in a nutshell",
  "first and foremost",
  "needless to say",
  "at the end of the day",
];

// ------------------------------------------------------------
// 3. EDITORIAL BLUEPRINT GENERATION
// ------------------------------------------------------------

export function generateEditorialBlueprint(input: EditorialInput): EditorialBlueprint {
  const niche = detectNiche(input.title, input.brief, input.keywords);
  const articleType = detectArticleType(input.title, input.brief);
  const searchIntent = detectSearchIntent(input.title, input.brief, input.keywords);

  const lengthMap: Record<string, string> = {
    'Short (300-600 words)': '450-600 words',
    'Medium (800-1200 words)': '900-1200 words',
    'Long (1500-2500 words)': '1600-2200 words',
    'Comprehensive (3000+ words)': '2800-3500 words',
  };
  const targetWordCount = lengthMap[input.targetLength || ''] || input.targetLength || '900-1200 words';

  // Niche-specific rules & recommended structure
  let recommendedStructure: string[] = [];
  let nicheSpecificRules: string[] = [];
  let multiFormatBlocks: string[] = [];

  switch (niche) {
    case 'food':
      recommendedStructure = [
        'Engaging sensory introduction (flavor profile, culinary inspiration, prep time)',
        'Key ingredients list with practical substitutions and dietary options',
        'Equipment/tools needed',
        'Step-by-step cooking instructions with visual & sensory cues',
        "Chef's tips for foolproof results",
        'Serving suggestions and complementary pairings',
        'Storage, shelf-life, and reheating guide',
        'Frequently Asked Questions (e.g. make-ahead, texture troubleshooting)',
      ];
      nicheSpecificRules = [
        'Provide concrete measurements and exact cooking times with sensory indicators (e.g. "until edges are crisp and golden brown, about 12 minutes").',
        'Format ingredients as a clean bulleted list with clear quantities.',
        'Format cooking instructions as ordered numbered steps (<ol><li>).',
        'Include a helpful Callout Tip on common ingredient swaps.',
      ];
      multiFormatBlocks = ['Bulleted ingredient list', 'Numbered steps with bold action titles', 'Callout Tip block for chef secrets', 'Storage checklist'];
      break;

    case 'automotive':
      recommendedStructure = [
        'Editorial hook addressing real-world driving needs and market context',
        'Key specifications & powertrain overview (horsepower, torque, MPG/range, transmission)',
        'Driving impressions & handling dynamics in daily conditions',
        'Cabin comfort, seating ergonomics, tech usability, and cargo practicality',
        'Balanced Pros & Cons breakdown',
        'Trim comparison or buying recommendation for different budgets',
        'Reliability, warranty, and long-term ownership considerations',
        'FAQ covering common buyer concerns (maintenance costs, resale, real-world MPG)',
      ];
      nicheSpecificRules = [
        'Include concrete specifications (engine size, horsepower, torque, cargo space, fuel economy).',
        'Provide a clean HTML comparison table (<table>) for specs, trims, or rival vehicles.',
        'Deliver honest, balanced pros and cons rather than uncritical marketing praise.',
      ];
      multiFormatBlocks = ['Specifications summary table (<table>)', 'Pros & Cons two-column list or structured boxes', 'Buyer recommendation callout'];
      break;

    case 'home_diy':
      recommendedStructure = [
        'Project overview with realistic skill level, time estimate, and budget range',
        'Materials, tools, and safety gear checklist',
        'Workspace preparation and vital safety precautions',
        'Numbered step-by-step execution instructions',
        'Pro contractor tips for a professional-grade finish',
        'Critical mistakes to avoid and how to prevent them',
        'Post-project maintenance and longevity tips',
      ];
      nicheSpecificRules = [
        'Organize materials and tools into categorized checklists.',
        'Use numbered steps where each step starts with an active verb (e.g., "1. Measure and Mark the Studs").',
        'Include a Safety Warning callout (<blockquote>) before beginning work.',
      ];
      multiFormatBlocks = ['Tools & Materials checklist', 'Numbered step-by-step process', 'Safety Warning callout block'];
      break;

    case 'gardening':
      recommendedStructure = [
        'Plant/technique overview and why it thrives in home gardens',
        'Ideal growing conditions (USDA hardiness zones, sunlight, soil pH, moisture)',
        'Step-by-step planting or propagation guide',
        'Ongoing care schedule (watering, feeding, mulching, pruning)',
        'Pest management and organic disease prevention',
        'Common beginner mistakes and how to troubleshoot wilting/discoloration',
        'Seasonal calendar (spring prep to winter protection)',
      ];
      nicheSpecificRules = [
        'Include specific requirements (sun hours, soil moisture levels, fertilizer ratios).',
        'Provide seasonal care bullet points.',
        'Highlight troubleshooting cues with clear visual symptoms.',
      ];
      multiFormatBlocks = ['Quick Specs Summary (Sunlight, Water, Zone, Soil)', 'Seasonal Care Checklist', 'Troubleshooting Callout'];
      break;

    case 'tech':
      recommendedStructure = [
        'Clear problem statement and primary value proposition',
        'Target audience: who this is best for (and who should look elsewhere)',
        'Core architecture / Key features analyzed with concrete scenarios',
        'Setup, installation, or step-by-step implementation guide',
        'Real-world performance benchmarks or usability observations',
        'Unbiased Pros and Cons',
        'Alternative solutions compared side-by-side',
        'Common troubleshooting fixes & FAQ',
      ];
      nicheSpecificRules = [
        'Explain technical terms with clear, relatable analogies.',
        'Include an HTML comparison table (<table>) against 2-3 top alternatives.',
        'Use code snippets or structured command lists if relevant to software setup.',
      ];
      multiFormatBlocks = ['Feature comparison table (<table>)', 'Pros & Cons breakdown', 'Troubleshooting Quick Answers'];
      break;

    case 'finance':
      recommendedStructure = [
        'Direct explanation of the financial concept or vehicle in plain English',
        'Key numbers, formulas, interest mechanics, or qualification criteria',
        'Real-world scenario or numerical example illustrating financial impact',
        'Important risks, tax implications, and hidden fees to watch for',
        'Side-by-side comparison of strategies or account types',
        'Actionable checklist of next steps to take today',
        'Standard editorial disclaimer regarding financial advice',
      ];
      nicheSpecificRules = [
        'Use realistic, concrete dollar amounts and percentages in examples.',
        'Highlight critical risks and trade-offs prominently.',
        'End with an editorial disclaimer: "Disclaimer: This article is for informational purposes and does not constitute formal financial advice."',
      ];
      multiFormatBlocks = ['Scenario calculation / Comparison table (<table>)', 'Action checklist', 'Important Note callout block'];
      break;

    case 'travel':
      recommendedStructure = [
        'Evocative yet pragmatic destination hook and cultural context',
        'Best time to visit (weather, seasons, peak vs shoulder vs off-peak)',
        'Curated top experiences and must-see sights categorized by traveler interest',
        'Practical logistics: getting around, neighborhoods, realistic daily budget',
        'Sample 3-to-5 day itinerary outline',
        'Local etiquette, customs, and safety tips',
        'Essential traveler FAQ',
      ];
      nicheSpecificRules = [
        'Categorize activities logically (e.g. Historic, Outdoor, Culinary).',
        'Provide practical cost expectations (budget, mid-range, luxury).',
        'Include an itinerary table or timeline list.',
      ];
      multiFormatBlocks = ['Itinerary timeline', 'Budget breakdown table', 'Local Tips callout box'];
      break;

    case 'parenting':
      recommendedStructure = [
        'Empathetic framing of the parenting challenge with reassuring perspective',
        'Developmental context and age-specific considerations',
        'Actionable, gentle step-by-step strategies that work in busy households',
        'Realistic daily routine examples and communication scripts',
        'Common pitfalls parents encounter and constructive adjustments',
        'When to seek professional pediatrician/educator guidance',
        'Practical FAQ from parents',
      ];
      nicheSpecificRules = [
        'Maintain a warm, supportive, non-judgmental editorial tone.',
        'Provide concrete sample phrases or dialogue scripts parents can use.',
        'Ground recommendations in developmental readiness.',
      ];
      multiFormatBlocks = ['Sample dialogue script box', 'Daily routine timeline', 'Gentle Tips callout'];
      break;

    default:
      recommendedStructure = [
        'Compelling introduction establishing the core challenge or opportunity',
        'Contextual background and why this topic matters now',
        'Core analysis broken down into descriptive thematic sections',
        'Actionable strategies, frameworks, or best practices',
        'Illustrative real-world examples or case scenarios',
        'Common pitfalls, misconceptions, or trade-offs',
        'Practical checklist or summary table',
        'Concise, forward-looking takeaway',
      ];
      nicheSpecificRules = [
        'Maintain high information density with concrete details rather than high-level generalities.',
        'Incorporate multi-format elements (lists, comparison table, callouts) to enhance scanability.',
      ];
      multiFormatBlocks = ['Structured summary table or checklist', 'Key Takeaway callout box', 'Numbered action steps'];
      break;
  }

  // Format-specific adjustments
  if (articleType === 'listicle') {
    recommendedStructure = [
      'Engaging introduction establishing evaluation criteria for the selections',
      'Quick reference summary table comparing all featured items',
      'Item 1 (Name + Key specs + Why it stands out + Best for + Honest trade-off)',
      'Item 2 ... (consistent mini-structure for each item)',
      'How we evaluated / Selection guide for buyers',
      'Final recommendation summary by use case',
      'FAQ',
    ];
  } else if (articleType === 'comparison') {
    recommendedStructure = [
      'Introduction introducing both contenders and who they cater to',
      'Comprehensive head-to-head comparison table (<table>)',
      'Key difference 1: In-depth analysis',
      'Key difference 2: In-depth analysis',
      'Contender A: Strengths & Weaknesses',
      'Contender B: Strengths & Weaknesses',
      'Verdict: Which one should you choose based on your specific situation',
    ];
  } else if (articleType === 'how_to') {
    recommendedStructure = [
      'Introduction outlining the end result and why this method works',
      'Prerequisites, tools, or materials needed',
      'Preparation steps before starting',
      'Numbered step-by-step tutorial (<ol><li>)',
      'Pro tips for avoiding common mistakes',
      'Troubleshooting guide for unexpected issues',
      'Conclusion with next steps',
    ];
  }

  return {
    niche,
    nicheLabel: niche.replace('_', ' ').toUpperCase(),
    articleType,
    typeLabel: articleType.replace('_', ' ').toUpperCase(),
    searchIntent,
    targetWordCount,
    recommendedStructure,
    nicheSpecificRules,
    multiFormatBlocks,
    antiAiBannedPhrases: BANNED_AI_OPENINGS,
  };
}

// ------------------------------------------------------------
// 4. GLOBAL EDITORIAL SYSTEM PROMPT INJECTION
// ------------------------------------------------------------

export function buildEditorialPrompts(input: EditorialInput): {
  systemPrompt: string;
  userPrompt: string;
  blueprint: EditorialBlueprint;
} {
  const blueprint = generateEditorialBlueprint(input);

  const systemPrompt = `You are an acclaimed senior magazine editor and master content strategist writing for a premier, authoritative publication.
Your writing is indistinguishable from a seasoned human journalist: sharp, engaging, informative, structurally sound, and completely free of generic AI fluff.

===================================================================
GLOBAL EDITORIAL CONTENT SKILL — 22 CORE PUBLICATION PRINCIPLES
===================================================================

1. STRONG, HUMAN INTRODUCTION (NO AI OPENINGS):
   - Hook the reader immediately with an insightful observation, relatable dilemma, or compelling practical context.
   - Address the reader's intent in the first 2 paragraphs.
   - Introduce the primary topic and keyword naturally without forcing.
   - Use 2 to 4 short, punchy paragraphs (2-4 sentences each).
   - STRICTLY FORBIDDEN OPENINGS:
     • "In today's fast-paced world..."
     • "In today's digital age..."
     • "Whether you're a beginner or an expert..."
     • "Are you looking for..."
     • "In this comprehensive guide, we will explore..."
     • "Let's dive in..."
     • "When it comes to..."

2. CLEAR EDITORIAL HIERARCHY & MEANINGFUL HEADINGS:
   - Output clean semantic HTML format directly.
   - Do NOT include <html>, <head>, <body>, or outer wrapper tags.
   - Start directly with an opening <p> (the introduction) or a thematic <h2>. Do NOT output an <h1> (the CMS provides the article title as H1).
   - Use descriptive, engaging headings (e.g. <h2>Why Most Homeowners Overspend on Deck Staining</h2>, not generic <h2>Overview</h2> or <h2>Conclusion</h2>).
   - Maintain a logical hierarchy: <h2> for main topics, <h3> for sub-points or list items.

3. PARAGRAPH STYLE & PACING:
   - Keep paragraphs short and scannable: 2 to 5 sentences each.
   - One main idea per paragraph.
   - Vary sentence lengths dynamically to create a natural, conversational human rhythm.
   - Avoid overwhelming walls of uninterrupted text.

4. HIGH READABILITY & DENSE VALUE:
   - Informative, authoritative, and engaging.
   - Zero filler. If a sentence does not add value, cut it.
   - Avoid keyword stuffing, artificial corporate transitions, and motivational clichés.
   - Emphasize key terms strategically using <strong>, not on every sentence.

5. MULTI-FORMAT RICH CONTENT (CRITICAL):
   - Do NOT write only plain paragraphs. A premier publication uses rich visual variety:
     • Comparison / Feature Tables (<table><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>)
     • Numbered steps (<ol><li><strong>Step Name</strong>: Explanation...</li></ol>)
     • Bulleted feature lists (<ul><li>...</li></ul>)
     • Styled editorial callouts (<blockquote><strong>Pro Tip:</strong> Advice here.</blockquote> or <blockquote><strong>Important Note:</strong> Context here.</blockquote>)
     • Checklist elements or quick-reference summaries
   - Use tables whenever comparing products, specifications, budgets, ingredients, or timelines.

6. NICHE-SPECIFIC DEPTH (${blueprint.nicheLabel}):
   ${blueprint.nicheSpecificRules.map((r) => `• ${r}`).join('\n   ')}

7. ARTICLE TYPE EXECUTION (${blueprint.typeLabel}):
   ${
     blueprint.articleType === 'listicle'
       ? `• For every item in this listicle, maintain a structured mini-format:
         <h3>[Number]. [Item Name]: [Defining Characteristic]</h3>
         <p>[Short punchy overview]</p>
         <ul>
           <li><strong>Key Specs / Details:</strong> [Concrete details]</li>
           <li><strong>Why It Stands Out:</strong> [Differentiating factor]</li>
           <li><strong>Best For:</strong> [Specific user/scenario]</li>
           <li><strong>Keep In Mind:</strong> [Honest drawback or limitation]</li>
         </ul>
       • Include a comparison summary table (<table>) early in the article.`
       : blueprint.articleType === 'how_to'
       ? `• Organize into Prerequisites/Tools needed, Preparation, Step-by-Step execution with active verbs, Pro Tips, and Troubleshooting.`
       : blueprint.articleType === 'comparison'
       ? `• Include an exhaustive head-to-head comparison table (<table>) evaluating core criteria side-by-side. Provide honest assessments of each contender.`
       : `• Provide structured, comprehensive thematic coverage with supporting evidence, examples, and actionable guidance.`
   }

8. FACTUAL INTEGRITY & EXPERTISE (E-E-A-T):
   - Use concrete, realistic examples and actionable specifics.
   - NEVER fabricate scientific studies, clinical statistics, fake expert quotes, or fictional author credentials.
   - If exact figures are not verifiable, describe the proven mechanism or realistic range honestly.

9. CONTEXTUAL IMAGE SUGGESTIONS:
   - Place contextual image suggestion markers where appropriate to illustrate the content naturally:
     <figure class="my-6">
       <div class="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground bg-muted/30">
         <strong>[Suggested Image]:</strong> [Describe the exact photo/diagram that fits here, e.g. "Close-up shot of seasoned cast iron skillet with golden crust"]
       </div>
     </figure>
   - Ensure alt text and caption intent are clear.

10. FAQ SECTION (WHEN NATURAL):
    - Include a clean FAQ section with 3 to 5 realistic questions that actual readers search for:
      <h2>Frequently Asked Questions</h2>
      <div class="faq-item">
        <h3>[Realistic Question?]</h3>
        <p>[Direct, concise, 2-3 sentence answer.]</p>
      </div>

11. ACTIONABLE TAKEAWAY CONCLUSION:
    - End with a sharp, practical conclusion summarizing the primary next action.
    - NEVER start with "In conclusion", "To sum up", or "In summary". Give the section a meaningful heading like <h2>Next Steps for Your Project</h2> or <h2>The Final Verdict</h2>.

12. LENGTH & INFORMATION DENSITY:
    - Target word count: ${blueprint.targetWordCount}.
    - Hit this count with rich substance, comprehensive guidance, and thorough examples — NOT repetitive padding or tautologies.`;

  const userPrompt = `Write a high-end publication-grade article on the following subject:

Title: ${input.title}
${input.brief ? `Brief / Description: ${input.brief}` : ''}
${input.keywords ? `Target Keywords: ${input.keywords}` : ''}
Tone / Style: ${input.writingStyle || 'Professional'}
Target Length: ${blueprint.targetWordCount}
Detected Niche: ${blueprint.nicheLabel}
Detected Article Type: ${blueprint.typeLabel}
${input.includeCta ? 'Include an engaging, contextually relevant call-to-action before the final signoff.' : ''}
${input.extraInstructions ? `Additional Guidelines: ${input.extraInstructions}` : ''}

RECOMMENDED EDITORIAL OUTLINE:
${blueprint.recommendedStructure.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

MANDATORY OUTPUT REQUIREMENTS:
- Output 100% semantic HTML directly (use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>, <strong>, <em>).
- Do NOT output markdown code blocks (\`\`\`html).
- Do NOT output <html>, <head>, <body>, or <h1> tags. Start directly with the introductory <p> or first <h2>.
- Strictly adhere to the 22 Global Editorial Principles. Avoid all banned AI cliché phrases.
- Write the complete, comprehensive, publish-ready article now.`;

  return { systemPrompt, userPrompt, blueprint };
}

// ------------------------------------------------------------
// 5. POST-GENERATION VALIDATION & POLISHING
// ------------------------------------------------------------

export function validateAndPolishContent(
  rawContent: string,
  options?: { targetLength?: string; title?: string; niche?: ArticleNiche; articleType?: ArticleType },
): {
  content: string;
  wordCount: number;
  qualityReport: EditorialQualityReport;
} {
  let content = (rawContent || '').trim();

  // 1. Strip markdown code fence wrappers (```html ... ```)
  content = content.replace(/^```(?:html|xml)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 2. Strip DOCTYPE, html, head, body wrapper tags if model hallucinated them
  content = content.replace(/<!DOCTYPE[^>]*>/gi, '');
  content = content.replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '');
  content = content.replace(/<head[\s\S]*?<\/head>/gi, '');
  content = content.replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '');

  // 3. Strip duplicate <h1> at start if it matches or repeats the article title
  if (options?.title) {
    const escapedTitle = options.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const h1Regex = new RegExp(`^\\s*<h1[^>]*>\\s*(?:${escapedTitle}|.*?)\\s*<\\/h1>\\s*`, 'i');
    content = content.replace(h1Regex, '');
  } else {
    content = content.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
  }

  // 4. Scan & remove banned AI cliché phrases at start of paragraphs
  const bannedPhrasesFound: string[] = [];
  const bannedPattern = new RegExp(
    `^(<p[^>]*>\\s*)(?:In today's fast-paced world,?|In today's digital age,?|In today's world,?|Whether you're a beginner or an expert,?|Whether you are a beginner or an expert,?|Are you looking for[^.?]+[.?]|In this comprehensive guide,?\\s*(?:we will|you will)?|Let's dive in[.!:]*|When it comes to [^,]+,\\s*)\\s*`,
    'i',
  );

  // Check paragraphs for banned openings
  const paragraphs = content.split(/(<\/p>)/i);
  let cleanedParagraphs = '';
  for (let i = 0; i < paragraphs.length; i++) {
    let p = paragraphs[i];
    if (bannedPattern.test(p)) {
      bannedPhrasesFound.push('Generic AI opening');
      p = p.replace(bannedPattern, '$1');
    }
    // Remove "In conclusion," or "To sum up,"
    if (/<h[23][^>]*>\s*(?:In )?Conclusion\s*<\/h[23]>/i.test(p)) {
      p = p.replace(/(<h[23][^>]*>)\s*(?:In )?Conclusion\s*(<\/h[23]>)/i, '$1Final Thoughts & Key Takeaways$2');
    }
    p = p.replace(/(<p[^>]*>\s*)(?:In conclusion|To sum up|In summary|All in all),\s*/gi, '$1');
    cleanedParagraphs += p;
  }
  content = cleanedParagraphs.trim();

  // 5. Ensure the content starts cleanly with a <p> or <h2>
  if (!/^<[a-z0-9]+/i.test(content)) {
    content = `<p>${content}`;
  }

  // 6. Style callouts nicely if <blockquote> is present
  content = content.replace(
    /<blockquote>/gi,
    '<blockquote class="border-l-4 border-amber-500 bg-amber-500/10 px-4 py-3 my-4 rounded-r-md text-sm italic">',
  );

  // 7. Calculate quality metrics
  const textOnly = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = textOnly ? textOnly.split(/\s+/) : [];
  const wordCount = words.length;

  const h2Matches = content.match(/<h2[^>]*>/gi) || [];
  const h3Matches = content.match(/<h3[^>]*>/gi) || [];
  const tableMatches = content.match(/<table[^>]*>/gi) || [];
  const listMatches = content.match(/<(?:ul|ol)[^>]*>/gi) || [];
  const calloutMatches = content.match(/<blockquote[^>]*>/gi) || [];
  const faqMatches = content.match(/faq|frequently asked/gi) || [];

  const niche = options?.niche || detectNiche(options?.title || '', content);
  const articleType = options?.articleType || detectArticleType(options?.title || '', content);
  const searchIntent = detectSearchIntent(options?.title || '', content);

  const qualityReport: EditorialQualityReport = {
    wordCount,
    niche,
    articleType,
    searchIntent,
    hasStrongIntro: /<p[^>]*>[\s\S]{80,}<\/p>/i.test(content),
    h2Count: h2Matches.length,
    h3Count: h3Matches.length,
    hasMultiFormat: tableMatches.length > 0 || listMatches.length > 0 || calloutMatches.length > 0,
    tableCount: tableMatches.length,
    listCount: listMatches.length,
    calloutCount: calloutMatches.length,
    hasFaq: faqMatches.length > 0,
    hasConclusion: /<h[23][^>]*>[^<]*(?:takeaway|next step|verdict|summary|final)[^<]*<\/h[23]>/i.test(content),
    bannedPhrasesFound,
    passedValidation: wordCount >= 200 && h2Matches.length >= 2,
  };

  return {
    content,
    wordCount,
    qualityReport,
  };
}
