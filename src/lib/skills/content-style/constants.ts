// ============================================================
// Content Style Skill Constants & Rules Catalogs
// Sourced directly from content-style-skill/skills/content-style/
// ============================================================

import type { ArticleArchetype, ArticleVertical } from './types';

// Catalog phrases strongly associated with mass AI generated text (WQ-07)
export const AI_CATALOG_PATTERNS = [
  "in today's world",
  "in today's fast-paced world",
  "in today's digital world",
  "in the ever-evolving landscape",
  "ever-evolving world",
  "in the realm of",
  "in the world of",
  "whether you're a beginner or",
  "whether you're a seasoned",
  "whether you are a beginner or",
  "whether you're",
  "whether you are",
  "it's important to note",
  "it is important to note",
  "it's worth noting",
  "it goes without saying",
  "in conclusion",
  "in summary",
  "to sum up",
  "let's dive in",
  "let's explore",
  "let's delve",
  "dive deep into",
  "deep dive",
  "game-changer",
  "game changer",
  "unlock the potential",
  "unlock the power",
  "elevate your",
  "when it comes to",
  "look no further",
  "the ultimate guide",
  "navigate the world of",
  "navigate the complexities",
  "a testament to",
  "revolutionize",
  "revolutionary",
  "seamlessly",
  "at the end of the day",
  "buckle up",
  "harness the power",
  "in the digital age",
  "in an era where",
  "consistency is key",
];

// Explicit conclusion openers that fail or warn CS-26
export const CONCLUSION_OPENERS = [
  'in conclusion',
  'in summary',
  'to sum up',
  'ultimately',
  'all in all',
  'to conclude',
  'wrapping up',
  'in closing',
];

// Explicit transition openers (CS-16)
export const TRANSITION_OPENERS = [
  'moreover',
  'furthermore',
  'additionally',
  'that said',
  'in addition',
  'on the other hand',
  'consequently',
  'subsequently',
  'likewise',
];

// Unsupported empty claims & superlatives (CS-17)
export const EMPTY_CLAIM_PATTERNS = [
  /\bthe best\b/i,
  /\bindustry-leading\b/i,
  /\bproven to\b/i,
  /\beveryone knows\b/i,
  /\bunquestionably\b/i,
  /\bunmatched\b/i,
  /\bworld-class\b/i,
  /\bwithout a doubt\b/i,
];

// Fabricated firsthand experience patterns (CS-24)
export const FABRICATED_EXPERIENCE_PATTERNS = [
  /in our testing\b/i,
  /after \d+ (?:days|weeks|months|years) of (?:use|testing|hands-on)\b/i,
  /we've helped hundreds of\b/i,
  /we tested \d+\b/i,
  /our lab\b/i,
  /our testers\b/i,
  /our lab's participants\b/i,
  /as a professional chef\b/i,
  /my personal favorite\b/i,
  /in my \d+ years of\b/i,
  /when we reviewed\b/i,
  /our hands-on evaluation\b/i,
  /after testing \d+ apps\b/i,
];

// Fabricated study/survey/stats markers (CS-23)
export const FABRICATED_STATS_STUDY_PATTERNS = [
  /a \d{4} (?:stanford|harvard|gallup|pew|mit|oxford) (?:study|survey|report)\b/i,
  /according to a (?:recent|new) (?:study|survey|report)\b/i,
  /studies have shown that \d+%/i,
  /\d+(?:\.\d+)?% of (?:knowledge workers|consumers|users|respondents|professionals)\b/i,
  /dr\. [a-z]+ [a-z]+, [a-z]+ at the center for/i,
  /cut return visits by \d+%/i,
  /\b\d+\.\d+ out of 5\b/i,
];

// Niche skeleton definitions for CS-07
export interface SectionSkeleton {
  critical: string[];
  recommended: string[];
}

export const ARCHETYPE_SKELETONS: Record<ArticleArchetype, SectionSkeleton> = {
  'how-to': {
    critical: ['problem/context', 'requirements', 'steps'],
    recommended: ['troubleshooting', 'tips', 'conclusion'],
  },
  'comparison': {
    critical: ['quick answer', 'comparison table', 'detailed comparison'],
    recommended: ['best for x', 'best for y', 'conclusion'],
  },
  'buying-guide': {
    critical: ['what matters', 'options'],
    recommended: ['comparison', 'use cases', 'buying criteria'],
  },
  'listicle': {
    critical: ['selection criteria', 'ranked/categorized items'],
    recommended: ['quick comparison', 'summary', 'next steps'],
  },
  'review': {
    critical: ['verdict', 'specs', 'pros/cons', 'performance/testing'],
    recommended: ['alternatives', 'who should buy'],
  },
  'informational': {
    critical: ['core explanation', 'key concepts'],
    recommended: ['examples', 'faq', 'summary'],
  },
  'recipe': {
    // Specialized Food skeleton (B-1)
    critical: ['ingredients', 'instructions'],
    recommended: ['tips', 'storage', 'timing'],
  },
};
