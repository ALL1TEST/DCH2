# Niche Patterns

> Module of the content-style skill · Load when: Steps 1–2 of the workflow (always — classification and skeleton selection)

## Purpose

This module maps every article onto a **vertical × archetype** coordinate and supplies the section skeleton for that coordinate. It is what makes the skill niche-aware while staying niche-agnostic: the core rules never change; only the skeleton and a handful of vertical-specific refinements do.

It has two catalogs and one mapping concept:

- **Part A — six structural archetypes**: how-to, comparison, buying guide, listicle, review, informational. The archetype decides the article's shape.
- **Part B — thirteen verticals**: Food/Recipes, Home/DIY, Gardening, Pets, Personal Finance, Travel, Technology, Cars, Parenting, Productivity, Gaming, Fashion/Beauty, Education. The vertical decides tone, safety posture, and refinements to the skeleton.
- **The mapping concept**: every article is exactly one vertical × one archetype. Combine Part A with Part B; on conflict, the vertical's rules refine the archetype's skeleton.

Check CS-07 reads this module as its source of truth: a missing `critical` section is a FAIL; a missing `recommended` section is a WARNING.

## Inputs

- `topic` and `content_type` (one of: how-to, comparison, buying-guide, listicle, review, informational, recipe, news, other)
- `niche` (one of the 13 verticals below, or `general`)
- `audience`, `tone` (optional; tone defaults to the vertical's default below)

## The mapping concept — how to classify

State the classification as a single pair before any drafting:

- **Archetype** comes from `content_type` plus the topic's job. If `content_type` is ambiguous or `other`, infer the archetype from the reader's need: a "which/versus" title is a comparison; a "how to" is a how-to; a "best/top/N" is a listicle or buying guide; a "why/what" is informational.
- **Vertical** comes from `niche`; if `niche` is missing, infer it from the topic's subject matter (tomatoes → Gardening; flappers → Home/DIY; APRs → Personal Finance).
- **Special mappings:** `content_type: recipe` → Food/Recipes vertical with the recipe skeleton in B-1 (not the generic how-to skeleton). `content_type: news` → informational skeleton plus the recency and sourcing cautions in FI rules — the skill does not have a news archetype because news structure is driven by the event, not a template. If neither can be determined, classify `informational × general` and record the assumption in the report notes (NP-07).

Worked examples:

| Topic | Classification |
|---|---|
| "Best noise-cancelling headphones" | Technology × Buying guide |
| "How to prune tomatoes" | Gardening × How-to |
| "Skillet chicken thighs with garlic-herb butter" | Food/Recipes × Recipe (how-to family, recipe skeleton) |
| "Air fryer vs. convection oven" | Technology × Comparison |
| "9 indoor plants that tolerate low light" | Gardening × Listicle |
| "Why houseplant leaves turn yellow" | Gardening × Informational |

## Part A — Six structural archetypes

Each archetype gives: its purpose, the canonical section skeleton in arrow notation, the critical/recommended status of each section (this table feeds CS-07), and its editorial rules. `optional` sections are never counted as missing by CS-07.

### A-1 — How-to guide

**Purpose:** walk a reader from a problem to a completed result they can verify.

**Skeleton:** `Problem/context → Requirements → Steps → Troubleshooting → Tips → Conclusion`

| Section | Status | Notes |
|---|---|---|
| Problem/context (intro) | critical | ST-09 problem/solution intro; states the symptom and the outcome |
| Requirements | critical | What the reader needs before starting: tools, materials, conditions |
| Steps | critical | Numbered, one action per step (FM-04) — a how-to without steps FAILs CS-07 |
| Troubleshooting | recommended | What to check when a step's expected result doesn't happen |
| Tips | recommended | Judgment calls, shortcuts, mistakes to avoid |
| Conclusion | recommended | ST-11 next steps, or when to call a professional |

**Editorial rules:**

1. Every step is one action, imperative voice, with quantities and conditions inside the step, not after it.
2. Steps must be sequentially complete — the reader never has to infer an intermediate state.
3. Troubleshooting entries pair a symptom with a check and a fix, not with reassurance.
4. For tasks with physical risk, the first relevant step or an adjacent callout carries the genuine safety caution (FM-07, NP-05).

### A-2 — Comparison

**Purpose:** answer "X or Y?" with a defensible recommendation per reader situation.

**Skeleton:** `Quick answer → Comparison table → Detailed comparison → Best for X → Best for Y → Conclusion`

| Section | Status | Notes |
|---|---|---|
| Quick answer | critical | The direct recommendation, 1–2 paragraphs, before any table |
| Comparison table | critical | 2 options on 4+ attributes, or 3+ options on 2+ attributes (FM-06) — a comparison without the comparison itself FAILs CS-07 |
| Detailed comparison | critical | Prose beyond the table: the 2–3 attributes that actually decide it |
| Best for X / Best for Y | recommended | Situation-based picks; fold into the conclusion if short |
| Conclusion | recommended | ST-12 decision criteria |

**Editorial rules:**

1. The quick answer states a recommendation, not a survey of the options ("If you already own a convection oven, you rarely need an air fryer").
2. The table compares decision-relevant attributes, not marketing attributes.
3. A head-to-head gets a verdict row or a "best for" follow-up so the table doesn't just end.
4. Hedge variable attributes (price, noise, energy) per FI-04 rather than inventing precise values.

### A-3 — Buying guide

**Purpose:** help a reader choose within a category using criteria, not specific product verdicts, unless real product data was supplied.

**Skeleton:** `What matters → Options → Comparison → Use cases → Buying criteria`

| Section | Status | Notes |
|---|---|---|
| What matters | critical | The 4–7 decision factors and why each matters |
| Options | critical | The realistic option set (types/tiers), each honestly characterized |
| Comparison | recommended | Table comparing options on the factors from "What matters" |
| Use cases | recommended | Which option fits which reader situation |
| Buying criteria | critical | The final checklist the reader takes to the store; doubles as the conclusion |

**Editorial rules:**

1. No fabricated product testing — spec categories and construction quality are described at category level unless the CMS supplied real data (FI-01, FI-07).
2. Prices appear only as hedged ranges, marked as variable (FI-09).
3. Every factor in "What matters" reappears in the buying criteria; no orphan criteria.
4. The guide recommends against a purchase when the reader may not need the category at all — that is a valid, valuable verdict.

### A-4 — Listicle

**Purpose:** present a ranked or curated set with a consistent per-item treatment the reader can scan and compare.

**Skeleton:** `Intro (selection criteria) → Numbered H2/H3 per item → Conclusion (quick picks)`

| Section | Status | Notes |
|---|---|---|
| Intro with selection criteria | critical | States what qualified an item for the list and what was excluded |
| Numbered items | critical | One H2/H3 per item, numbers in the heading text |
| Consistent per-item structure | critical | Same internal pattern for every item: what it is, who it's for, standout detail |
| Conclusion with quick picks | recommended | "If you want X, pick item 3" shortcuts |

**Editorial rules:**

1. The per-item structure is identical across items — that consistency is the format's whole value.
2. Item order follows the stated criteria (best-first unless the criteria say otherwise).
3. Every item gets its standout detail — the one specific fact a reader will remember it by.
4. The count in the title matches the count in the article, exactly.
5. Never pad the count: seven strong items beat ten with three fillers.

### A-5 — Review

**Purpose:** evaluate one specific product/service for a reader deciding whether it fits them.

**Skeleton:** `What it is + who it's for → Hands-on description → Positives → Drawbacks → Verdict/alternatives`

| Section | Status | Notes |
|---|---|---|
| What it is + who it's for | critical | Category, positioning, intended user |
| Hands-on description | conditional | **Critical only when real experience data was supplied by the CMS; otherwise OMIT entirely** and evaluate from verifiable specs (FI-07) |
| Positives | critical | Specific, tied to use |
| Drawbacks | critical | Genuine; a review without drawbacks reads as marketing and fails the reader |
| Verdict | critical | For whom it is and is not worth it |
| Alternatives | recommended | Where to look if the verdict is "not for you" |

**Editorial rules:**

1. Never invent hands-on experience. Without supplied experience data, judge from published, verifiable specs and say that is what you are doing.
2. Every positive and drawback names the use case it affects.
3. The verdict is conditional ("worth it if …, skip if …"), not absolute.
4. A review of a product the CMS supplied data for attributes that data to its source, not to first-person AI voice (FI-07).

### A-6 — Informational

**Purpose:** explain a concept, cause, or state of affairs — increasingly the format read by AI search engines, so answer-first is mandatory.

**Skeleton:** `Direct answer → Why it happens / how it works → Variations/cases → What to do about it → Related questions`

| Section | Status | Notes |
|---|---|---|
| Direct answer | critical | 1–3 paragraphs answering the title's question, specifics included, before any deep context |
| Why it happens / how it works | critical | The mechanism, plainly explained |
| Variations/cases | recommended | The common distinct cases (often H3 per case) |
| What to do about it | critical when the title promises a fix; recommended otherwise | Actions or fixes per case |
| Related questions | recommended | FAQ-formatted, genuine recurring questions only (ST-13) |

**Editorial rules:**

1. The direct answer must be self-sufficient: a reader who stops after the first section still got the answer.
2. Cases are distinct and mutually recognizable — the reader can tell which one is theirs.
3. Related questions answer new questions; restating body content as Q&A fails CS-08.
4. For "why does X happen" topics, the mechanism gets explained, not just the list of causes.

## Part B — Thirteen verticals

Each vertical gives: the typical reader goal, the default tone, recommended skeletons for its most common archetypes (with refinements), do/don't rules, and common pitfalls. Vertical rules **refine** archetype skeletons — see "Combining Part A and Part B" below.

### B-1 — Food/Recipes

**Typical reader goal:** make the dish successfully on the first try, tonight.

**Default tone:** warm, practical, encouraging — a knowledgeable friend, not a magazine.

**Recommended skeletons:**

- **Recipe (the canonical Food skeleton):** `Brief intro (why it works) → Ingredients → Instructions → Tips → Storage/make-ahead → FAQ where useful`
  - Brief intro: 2–4 sentences on why the dish works or when to make it — specifics allowed, life stories are not.
  - Ingredients: exact measurements (volume plus weight where it matters), prep state ("sliced", "room temperature"), and substitutions only where they genuinely work.
  - Instructions: numbered, one action per step, with visual and physical doneness cues (times as ranges; internal temperatures where they are standard guidance, e.g. 165°F / 74°C for poultry).
  - Tips: the 2–4 judgment calls that separate a good result from a failed one.
  - Storage/make-ahead: fridge life, reheating method that preserves the result, freezing where it genuinely survives it.
  - FAQ: only genuine recurring questions ("Can I use thighs instead of breasts?") — never a forced block.
  - Critical: intro, ingredients, instructions. Recommended: tips, storage/make-ahead. Optional: FAQ.
- **How-to (technique pieces, e.g. "how to season a cast-iron skillet"):** A-1 skeleton with cooking-safety cautions.
- **Comparison (e.g. "baking soda vs. baking powder"):** A-2 skeleton with substitutions guidance.

**Do/don't rules:**

1. DO give exact quantities; "some butter" is not a quantity. DON'T fabricate nutrition data — no calorie or macro counts unless computed from verified data supplied by the CMS.
2. DO include doneness cues (color, texture, temperature) so the reader can verify; DON'T claim "tested in our kitchen" — that is fabricated experience (FI-07).
3. DO offer substitutions only when they genuinely work in this dish, and say what changes ("slightly denser crumb").
4. DON'T bury the recipe below a long personal intro — the ingredient list belongs above the fold.
5. DO treat allergen-relevant substitutions (dairy, gluten, nuts) with care and flag uncertainty rather than guessing.

**Common pitfalls:** vague quantities; multi-action steps ("cook, then plate, then sauce"); invented nutrition numbers; six-paragraph memoir intros; substitution lists that don't work chemically.

### B-2 — Home/DIY

**Typical reader goal:** complete a repair, install, or improvement safely, without a second trip to the hardware store.

**Default tone:** calm, competent, direct — a patient tradesperson.

**Recommended skeletons:**

- **How-to (dominant):** A-1 with these refinements — Requirements lists tools AND materials with sizes; Steps include the verification after each risky action ("turn the valve, then confirm the tank stops filling"); Troubleshooting maps symptoms to causes.
- **Buying guide (e.g. "how to choose a paint finish"):** A-3 with per-room use cases.
- **Comparison (e.g. "latex vs. oil paint"):** A-2 with application tradeoffs.

**Safety callout guidance (safety-appropriate content is expected in this vertical):**

- Genuine hazards get `> **Warning:**` callouts: electrical work (shut off at the breaker and verify), gas lines, plumbing with hot water, ladder work, structural loads, anything pressurized.
- Utility work puts the shut-off/lock-out step *inside* the steps, before the hazard, not in a footnote after it.
- `> **Note:**` for damage-prevention (protect the floor), `> **Tip:**` for efficiency. Don't promote tips to warnings; a diluted warning scale gets ignored.
- When a job is genuinely professional territory (panel work, gas, load-bearing changes), say so plainly — "this is the line where you call a pro" is a valuable sentence, not a cop-out.

**Do/don't rules:**

1. DO name tools precisely with generic terms (adjustable wrench, not brand names); DON'T invent cost figures or time statistics.
2. DO include the "when to stop and call a professional" boundary for high-risk work.
3. DON'T assume prior trade knowledge — define terms like "shut-off valve" at first use for a general audience.
4. DO give the failure mode for each step where one exists ("if the bolt spins without loosening, hold the nut with a second wrench").

**Common pitfalls:** skipping safety ordering; steps that assume a tool the Requirements omitted; model-specific repair steps generalized to all models; invented "average cost" statistics.

### B-3 — Gardening

**Typical reader goal:** keep a plant alive, fix a plant problem, or get a result (a harvest, a bloom).

**Default tone:** patient, grounded, encouraging — tolerant of failure and climate.

**Recommended skeletons:**

- **How-to (e.g. "how to prune tomatoes"):** A-1 with seasonal timing hedged by zone ("timing shifts with your last frost date").
- **Informational (e.g. "why leaves turn yellow"):** A-6 with one H3 per cause, each carrying its own fix.
- **Listicle (e.g. "9 indoor plants that tolerate low light"):** A-4 with selection criteria stated up front and botanical names on first mention.

**Do/don't rules:**

1. DO use both common and botanical names on first mention ("snake plant, Dracaena trifasciata"); DON'T use botanical Latin for every later mention.
2. DO hedge climate- and zone-dependent claims ("blooms in late spring in most temperate zones"); timing and hardiness vary by region.
3. DO state the honest limits of "low light" and similar terms — plants that tolerate low light do not thrive in zero light.
4. DON'T give absolute watering schedules; tie water to soil-moisture checks instead.
5. DO explain the mechanism when a fix works (drainage, airflow, phototropism in plain language) — gardeners repeat what they understand.

**Common pitfalls:** absolute timing claims that ignore zones; "full sun" assumptions; one watering interval for all climates; toxicity omissions when a recommended plant is hazardous to pets (cross-check B-4's lists).

### B-4 — Pets

**Typical reader goal:** care for a specific animal — feed, train, house, or handle a health sign.

**Default tone:** warm, reassuring, plain — worry-reducing, never panic-inducing.

**Recommended skeletons:**

- **Informational (e.g. "why dogs eat grass"):** A-6 with a "when to call the vet" element.
- **How-to (e.g. "how to introduce a second cat"):** A-1 with the animal's stress signals as step gates ("proceed only when both cats eat calmly").
- **Buying guide (e.g. "choosing a litter box"):** A-3 with species/size fit criteria.

**Safety warnings and vet framing (mandatory for this vertical):**

- Foods, plants, and materials hazardous to the species get `> **Warning:**` callouts the moment they become relevant — not in a footnote (chocolate and grapes for dogs; lilies and onion for cats; avocado for birds — well-established hazards, stated as general guidance).
- Health topics describe signs and escalation thresholds; they never diagnose and never prescribe. The framing is "check with your veterinarian" for anything beyond first aid and routine care.
- Species matters more than cuteness: never generalize across species ("safe for pets" is two different lists for cats and dogs).

**Do/don't rules:**

1. DO name the species in every recommendation; DON'T write "pets" when the claim only holds for one species.
2. DO frame health guidance around observation and professional consultation; DON'T give dosages, diagnoses, or treatment plans.
3. DO hedge breed and individual variability ("barks vary widely even within a breed").
4. DON'T present training advice as universally guaranteed; methods fail for temperament, history, and timing reasons.

**Common pitfalls:** diagnosing; omitting toxic-food warnings in food-adjacent articles; cross-species generalization; guilt-based framing about owner behavior.

### B-5 — Personal Finance

**Typical reader goal:** understand an instrument, term, or decision well enough to act — or to know they need a professional.

**Default tone:** neutral, precise, calm. Hype and urgency are banned registers here.

**YMYL posture (this vertical is always YMYL — Your Money or Your Life):**

- No specific financial advice: no "buy this", no "move your money now", no portfolio prescriptions for individual situations. Explain mechanisms and tradeoffs; defer individual decisions to qualified professionals.
- Hedge every variable number: rates, returns, fees, thresholds change and vary by provider and jurisdiction — "varies by lender", "commonly in the range of", never a bare number presented as current fact.
- No promised or implied returns; historical patterns are described as historical, not predictive.

**Recommended skeletons:**

- **Informational (e.g. "what is an APR"):** A-6 with a worked numeric example clearly labeled as illustrative.
- **Comparison (e.g. "term vs. whole life"):** A-2 where "best for" sections describe situations, not people.
- **How-to (e.g. "how to read a paystub"):** A-1 with jurisdiction hedges ("field names vary by country and payroll provider").

**Do/don't rules:**

1. DO explain the mechanism (compound interest, escrow, amortization) with a labeled illustrative example; DON'T fabricate current rates, averages, or "typical returns" as precise facts.
2. DO state when a professional is the right next step (fee-only advisors, licensed brokers, tax professionals per topic); DON'T roleplay one.
3. DO note that tax treatment varies by jurisdiction; DON'T give tax advice.
4. DON'T use urgency or scarcity framing — this vertical punishes it hardest.

**Common pitfalls:** precise-sounding current rates; "guaranteed" or "proven" language; advice-voice ("you should refinance now"); unlabeled illustrative numbers reading as real market data.

### B-6 — Travel

**Typical reader goal:** decide where/when/how, or plan a specific trip without surprise costs.

**Default tone:** vivid but practical — evocative where it helps choosing, flat and precise for logistics.

**Recommended skeletons:**

- **Listicle (e.g. "9 things to do in Kyoto in autumn"):** A-4 where selection criteria include pace and access, and every item carries a practical note (transit, booking).
- **Comparison (e.g. "rail pass vs. point-to-point tickets"):** A-2 where the verdict depends on itinerary shape — state the break-even logic, hedged.
- **How-to (e.g. "how to pack for a week in one carry-on"):** A-1 with a checklist-style Requirements section.

**Do/don't rules:**

1. DO hedge prices and mark volatility ("entrance fees change; check the official site") — prices are the most volatile claim type in this vertical (FI-09).
2. DO route rules-and-paperwork claims (visas, customs, IDs) to "check the official government source" — they change without notice and are jurisdiction-critical.
3. DON'T state opening hours or seasonal dates as fixed facts; either omit or mark them as variable.
4. DO write seasons and crowding honestly ("June means festivals and crowds").

**Common pitfalls:** invented prices; outdated logistics presented as current; over-promising ("trip of a lifetime" sales voice); ignoring that visa and entry rules differ by nationality.

### B-7 — Technology

**Typical reader goal:** decide between options, fix a problem, or use a feature — usually against a version that will change.

**Default tone:** clear, direct, unsentimental — respect for the reader's time.

**Version/date sensitivity and spec accuracy (defining rules of this vertical):**

- Version-sensitive claims are marked ("as of this writing", "on current major versions") or written version-agnostically; steps that only apply to one version say so.
- Spec accuracy: only verifiable specifications appear, and only at category level unless the CMS supplied real product data. No invented benchmark numbers, battery-life hours, or performance percentages — ever (FI-01).
- Prices, availability, and model lineups are treated as volatile (FI-09) and hedged.

**Recommended skeletons:**

- **Comparison (e.g. "air fryer vs. convection oven"):** A-2 with mechanism explained before the table.
- **Buying guide (e.g. "how to choose a standing desk"):** A-3 where "What matters" leads with the factors that actually decide satisfaction (stability, fit, range).
- **How-to (e.g. "how to stop a running toilet" — plumbing, but the pattern holds for tech fixes):** A-1 with OS/app-version gates inside the steps.
- **Review (e.g. a specific laptop):** A-5, evaluating from verifiable specs unless experience data was supplied.

**Do/don't rules:**

1. DO explain the mechanism before comparing products built on it ("both circulate hot air with a fan; the differences are size and preheat").
2. DON'T invent specs or benchmarks; a spec you cannot verify does not go in the article.
3. DO date/version-stamp volatile claims and keep them few; a sea of hedges is its own defect.
4. DON'T review products from imagination — spec-based evaluation with stated limits is the honest default.

**Common pitfalls:** assumed versions; invented benchmarks; spec tables with plausible-but-fake values; treating this year's lineup as permanent.

### B-8 — Cars

**Typical reader goal:** maintain a vehicle, decide on a purchase, or understand a repair or warning.

**Default tone:** mechanical, practical, no sentimentality — closer to a service manual than a lifestyle piece.

**Recommended skeletons:**

- **How-to (maintenance basics):** A-1 where steps carry vehicle-variability hedges.
- **Buying guide (e.g. "how to choose winter tires"):** A-3 where fit depends on climate, vehicle, and use.
- **Comparison (e.g. "EV vs. hybrid for a 60-mile commute"):** A-2 where the verdict keys to the reader's usage pattern, with running-cost claims hedged as variable.

**Do/don't rules:**

1. DO route maintenance intervals to "check your owner's manual" — intervals vary by model, engine, and driving conditions; DON'T state one number as universal.
2. DO mark safety-critical repairs (brakes, airbags, steering) as professional territory with a Warning callout.
3. DON'T invent MPG figures, depreciation rates, or repair-cost statistics.
4. DO explain what a warning light or symptom means at mechanism level; DON'T guess at causes for a specific vehicle sight-unseen — give the diagnostic path instead.

**Common pitfalls:** model-specific numbers generalized; invented costs; skipping the professional line on brake/safety work; assuming one market's regulations globally.

### B-9 — Parenting

**Typical reader goal:** make a care or development decision, or understand a behavior, usually while short on sleep and long on guilt.

**Default tone:** warm, non-judgmental, calming. This vertical's reader is often anxious; the writing must reduce heat, not add it.

**Recommended skeletons:**

- **Informational (e.g. "why toddlers refuse naps"):** A-6 with wide ranges and reassurance grounded in variability.
- **How-to (e.g. "how to start solid foods"):** A-1 with pediatrician-consult framing and allergy caution callouts.
- **Buying guide (e.g. "choosing a convertible car seat"):** A-3 where safety guidance is attributed to general public-safety standards, not invented test results.

**Do/don't rules:**

1. DO frame health and safety topics around the child's pediatrician or local public-health guidance; DON'T give medical advice.
2. DO state developmental ranges as ranges ("most babies walk between 9 and 18 months — a wide normal range"); DON'T write milestone absolutes.
3. DON'T use guilt or judgment framing ("good parents do X"); readers in this vertical punish it.
4. DO attribute safety practices to general public-health guidance where they are standard (safe-sleep positioning, rear-facing seats) and mark them as guidance, not as our testing.
5. DO keep product-safety claims at the level of published standards; no invented crash-test or clinical results.

**Common pitfalls:** milestone absolutes; guilt framing; medical advice-voice; inventing "studies show" claims; single-country assumptions for regulations (car seats, sleep guidance differ by country).

### B-10 — Productivity

**Typical reader goal:** adopt a system, fix a habit, or choose a tool that sticks.

**Default tone:** pragmatic, lightly energetic — a peer who has read widely and kept what worked.

**Recommended skeletons:**

- **How-to (e.g. "how to plan a week in 30 minutes"):** A-1 where the steps survive contact with an unpredictable week (include the failure path).
- **Listicle (e.g. "9 ways to cut meeting overload"):** A-4 with honest effort/payoff notes per item.
- **Comparison (e.g. "paper vs. digital task lists"):** A-2 where the verdict keys to the reader's context, not to tool fashion.

**Do/don't rules:**

1. DON'T fabricate studies, percentages, or "research shows" claims — this is the vertical most prone to invented statistics (FI-01, CS-23). Write from mechanism and clearly-labeled general practice instead.
2. DO distinguish what is anecdote from what is established; say "many people find" where that is the honest level of evidence.
3. DO note when tool features change (version sensitivity, B-7 applies to app-heavy pieces).
4. DON'T promise absolute time savings ("save 10 hours a week") — outcomes vary with workload and role.
5. DO include what happens when the system breaks — recovery steps are the practical value.

**Common pitfalls:** invented productivity statistics; tool-worship; systems that assume a controlled workday; absolute time-savings claims.

### B-11 — Gaming

**Typical reader goal:** decide what to buy/play, get unstuck, or get better at a specific game.

**Default tone:** knowledgeable peer — casual register, zero condescension, precise where it matters.

**Recommended skeletons:**

- **How-to (e.g. "how to beat a boss, phase by phase"):** A-1 with loadout preconditions and failure-recovery branches.
- **Buying guide (e.g. "choosing a controller for PC"):** A-3 with platform-compatibility as a first-class factor.
- **Listicle (e.g. "9 co-op games for two players"):** A-4 where selection criteria state platform and session length.
- **Review (e.g. a specific release):** A-5, from verifiable public information about the release unless experience data was supplied.

**Do/don't rules:**

1. DO label spoilers — a spoiler is a genuine, nameable harm to this vertical's reader; use a `> **Note:**` callout before spoiler detail.
2. DO note platform and version/patch sensitivity — strategies and economies change across patches ("as of the current patch").
3. DON'T invent patch contents, drop rates, or patch-note claims; cite the mechanic only if verifiable or supplied.
4. DON'T present launch-time metas as eternal — date-stamp meta advice.

**Common pitfalls:** unmarked spoilers; outdated strategies presented as current; invented drop rates; hard-difficulty advice that ignores accessibility options.

### B-12 — Fashion/Beauty

**Typical reader goal:** choose, use, or style — with skin, budget, and occasion as constraints.

**Default tone:** friendly, visual, inclusive — specificity without exclusivity.

**Recommended skeletons:**

- **How-to (e.g. "how to build a capsule wardrobe"):** A-1 with fit-and-lifestyle gates in the steps.
- **Buying guide (e.g. "choosing a sunscreen"):** A-3 where skin considerations are first-class criteria and labeling (SPF, broad-spectrum) is explained.
- **Listicle (e.g. "9 pieces that work for every occasion"):** A-4 with body/fit notes honestly framed as starting points, not rules.

**Do/don't rules:**

1. DO use `> **Warning:**` callouts for genuine skin-safety practices (patch-testing new actives, sun exposure with photosensitizing ingredients).
2. DO hedge skin-type claims ("formulas for oily skin may still vary by season for you") — skin varies; DON'T claim any product "works for all skin types".
3. DON'T invent clinical results ("clinically proven", "dermatologist-tested" percentages) without supplied data; describe ingredients and mechanisms at general level (FI-01).
4. DO date-stamp trend claims ("this season's silhouette") — fashion claims decay fast.
5. DON'T use appearance judgment language about the reader; describe garments and techniques, not people.

**Common pitfalls:** invented clinical results; absolute skin-type rules; undated trend claims; exclusivity framing ("flattering on everyone" is an empty claim).

### B-13 — Education

**Typical reader goal:** understand a concept, prepare for a course or exam, or teach something to someone else.

**Default tone:** clear, patient, structured — a good teacher who assumes intelligence, not prior knowledge.

**Recommended skeletons:**

- **Informational (e.g. "what is the scientific method"):** A-6 with a worked example of the concept in action.
- **How-to (e.g. "how to study for an exam in two weeks"):** A-1 where the plan flexes to subject and starting point.
- **Comparison (e.g. "IB vs. A-levels"):** A-2 where regional variation is explicit and "best for" keys to the student's goals and location.

**Do/don't rules:**

1. DO define jargon at first use, every time — this vertical's readers are definitionally at mixed levels.
2. DO hedge regional variation (grading systems, academic calendars, certification requirements vary by country and institution); DON'T state one country's system as universal.
3. DON'T invent pass rates, admission statistics, or salary outcomes; route to "check the institution's published figures" (FI-05).
4. DO use worked examples — one concrete instance teaches more than three abstract paragraphs (WQ-14).
5. DON'T condescend; simplicity of language must never read as simplicity of respect.

**Common pitfalls:** regional absolutes; invented statistics; jargon used before definition; study advice that assumes one learning style.

## Combining Part A and Part B

**Procedure:** classify (vertical × archetype) → take the Part A skeleton → apply the vertical's refinements → order by reader need (`STRUCTURE.md` ST-06) → cut sections that fail EP-08.

**What wins on conflict:** the vertical refines the archetype, never replaces it. Concretely:

1. **Section sets:** the vertical may add sections (Food adds Storage/make-ahead to the how-to family; Home/DIY elevates safety ordering inside steps) or tighten which sections are critical (Gardening makes "what to do" critical for any title promising a fix). If the vertical is silent, the archetype's table stands.
2. **Rules on the same subject:** the vertical's rule is the refinement and wins (Personal Finance's no-specific-advice rule overrides any generic encouragement to "give clear recommendations"; Pets' species-specificity overrides generic advice phrasing).
3. **Never lost either way:** the core skill rules — people-first, no fabrication, no padding, contextual formatting — apply in every combination, and integrity rules (FI) outrank both catalogs (SKILL.md §8).

**Worked combinations:**

| Article | Combination | Skeleton actually used |
|---|---|---|
| "Skillet chicken thighs with garlic-herb butter" | Food × Recipe | B-1 recipe skeleton (replaces the generic A-1 how-to skeleton) |
| "How to stop a running toilet" | Home/DIY × How-to | A-1 + B-2 refinements (shut-off step inside steps; Warning callouts for genuine hazards) |
| "Air fryer vs. convection oven" | Technology × Comparison | A-2 + B-7 refinements (mechanism before table; hedged variable attributes) |
| "9 indoor plants that tolerate low light" | Gardening × Listicle | A-4 + B-3 refinements (botanical names; honest low-light framing) |
| "How to choose a standing desk" | Technology × Buying guide | A-3 + B-7 refinements (spec accuracy; hedged prices) |
| "Why houseplant leaves turn yellow" | Gardening × Informational | A-6 + B-3 refinements (fix inside each cause; zone hedging) |
| "Best noise-cancelling headphones" | Technology × Buying guide | A-3 + B-7 refinements |
| "How to prune tomatoes" | Gardening × How-to | A-1 + B-3 refinements (timing hedged by zone) |

## Rules (NP-01 … NP-08)

**NP-01 — One vertical × one archetype per article.** Every article classifies to exactly one pair before drafting; an article serving two archetypes is two articles. Rationale: hybrid shapes are how sections drift out of reader-need order and how intros lose their promise (CS-03, CS-06).

**NP-02 — Vertical rules refine; they never replace.** On conflict between a vertical refinement and the Part A archetype table, the vertical wins; on conflict between either and the core skill rules, the core rules win (SKILL.md §8). Rationale: a stable precedence order keeps 13 verticals × 6 archetypes = 78 combinations maintainable from two catalogs.

**NP-03 — Do not blindly copy structures from existing websites.** The skeletons in this module are derived from reader needs (what a person must know, in what order, to succeed at the topic), not scraped from any publisher's template. When a real site's structure differs from the skeleton here, the reader-need derivation wins. Never imitate a site's section names, phrasing, or visual conventions. Rationale: copied structure imports another publication's assumptions and, at worst, its proprietary patterns — and it freezes the skill to one publisher's current design fads.

**NP-04 — YMYL verticals get extra conservatism.** Personal Finance, and health/safety topics in Pets, Parenting, Food, and Home/DIY, always take the more conservative phrasing: defer to professionals, hedge variable values, avoid absolute claims. Rationale: in these topics a confident wrong sentence costs the reader money or health; conservatism is the only safe default for generated content.

**NP-05 — Safety-relevant verticals use genuine Warning callouts.** Home/DIY, Pets, Food, and Parenting articles use `> **Warning:**` callouts for genuine hazards — placed where the hazard becomes live, not in an end-of-article disclaimer dump. Integrating agents may remap these to CMS components; the semantics (genuine caution, placed at the point of risk) must survive the remap (FM-07). Rationale: a safety note the reader has already scrolled past protects no one.

**NP-06 — Time- and version-sensitive verticals mark volatility.** Technology, Cars, Travel, Gaming, and Fashion/Beauty stamp or hedge claims that decay (versions, prices, metas, seasons) per FI-09. Rationale: an unstamped volatile claim becomes a false claim on a predictable schedule.

**NP-07 — Unclassifiable topics default conservatively.** If vertical or archetype cannot be determined, classify `informational × general`, use the A-6 skeleton, and record the assumption in the report notes. Rationale: a wrong specific skeleton is worse than a correct generic one; the report note lets a human editor reclassify.

**NP-08 — Extensibility is additive.** A new vertical is a new Part B section; a new archetype is a new Part A section; nothing else in the skill changes. Rationale: the 78-combination matrix only scales if extension never requires touching the core.

## Conceptual references — what they are and are not

The editorial patterns in this module are inspired, conceptually and at the level of general principles, by the observable editorial habits of high-quality public publishers across these verticals: RecipeTin Eats and Pinch of Yum (recipes), The Spruce and Bob Vila (home/DIY), Gardening Know How (gardening), PetMD (pets), NerdWallet and Investopedia (personal finance), The Points Guy (travel), TechRadar and How-To Geek (technology), Car and Driver and MotorTrend (cars), BabyCenter (parenting), Lifehacker (productivity), IGN (gaming), Allure (beauty), and Britannica (education/reference).

These are **conceptual references only**:

- Extract only general editorial principles (answer early, show doneness cues, mark volatility, warn at the point of risk).
- NEVER imitate or copy any specific website's text, templates, section names, branding, tone-of-voice trademarks, or proprietary style guides.
- Nothing in this module is derived from scraping or replicating a specific publisher's structure (NP-03); where a pattern coincides with a publisher's habit, it is because both serve the same reader need, not because one copied the other.
- All examples and fixtures in this package are original synthetic content written for this package.

## Quality Checks

| Check | Feeds from |
|---|---|
| CS-07 Required niche sections | Part A critical/recommended tables + Part B refinements |
| CS-08 No forced formatting | Vertical-specific element guidance (e.g., FAQ "where useful", Warning at point of risk) |
| CS-13 Reading level fit | Vertical audience assumptions |
| CS-18 Specificity | Vertical do/don't rules on quantities and names |
| CS-23 / CS-24 / CS-25 integrity | NP-04 conservatism, vertical anti-fabrication rules |
| CS-28 Tone fit | Part B default tones |

## Failure Handling

- **CS-07 FAIL (critical section missing):** add the section from the skeleton; do not rename a passing section to fake it.
- **CS-07 WARNING (recommended section missing):** decide deliberately — either add the section or accept the warning; a recommended section that would be padding should stay missing, with the warning standing.
- **Misclassification discovered late (e.g., a "comparison" that is really a buying guide):** re-run Steps 1–3 with the corrected classification before touching the draft.
- **Vertical rules conflict with a configured tone:** the configured `tone` input wins over the default tone, unless the vertical is YMYL (NP-04), where conservatism wins; record the conflict in the report.

## Cross-References

- `STRUCTURE.md` — ST-06 ordering, ST-13 formatting framework, ST-07 … ST-12 intro/conclusion patterns
- `EDITORIAL-PRINCIPLES.md` — EP-05 depth calibration, EP-06 tone, EP-08 earns-its-place
- `FORMATTING.md` — FM-07 callout mechanics, FM-05/FM-06 table mechanics
- `FACTUAL-INTEGRITY.md` — FI-01 fabrication blacklist, FI-04 hedging, FI-09 dates/prices, FI-10 YMYL
- `VALIDATION.md` — CS-07, CS-08, CS-13, CS-18, CS-23, CS-24, CS-25, CS-28
