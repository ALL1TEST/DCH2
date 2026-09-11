// ============================================================
// Schema / Structured Data Module
// Sourced from seo-ranking-skill/skills/seo-ranking/SCHEMA.md
// ============================================================

export interface SchemaValidationResult {
  isValid: boolean;
  schemaType?: string;
  jsonLd?: Record<string, any>;
  errors: string[];
  isFabricated: boolean;
}

export function validateStructuredData(
  jsonString: string,
  visibleContent: string
): SchemaValidationResult {
  const errors: string[] = [];
  let jsonLd: any = null;

  try {
    jsonLd = JSON.parse(jsonString.trim());
  } catch (err: any) {
    errors.push(`Invalid JSON syntax in JSON-LD script: ${err.message}`);
    return { isValid: false, errors, isFabricated: false };
  }

  // Check mandatory @context
  if (!jsonLd['@context'] || !jsonLd['@context'].includes('schema.org')) {
    errors.push('Missing or invalid "@context": "https://schema.org"');
  }

  const schemaType = jsonLd['@type'];
  if (!schemaType) {
    errors.push('Missing "@type" in structured data.');
  }

  // Integrity check: fabricated ratings, review counts, prices not present in visible content
  const cleanVisibleText = visibleContent.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  let isFabricated = false;
  if (jsonLd.aggregateRating) {
    const ratingValue = String(jsonLd.aggregateRating.ratingValue || '');
    const reviewCount = String(jsonLd.aggregateRating.reviewCount || '');
    if (ratingValue && !cleanVisibleText.includes(ratingValue)) {
      isFabricated = true;
      errors.push(`Fabricated aggregateRating.ratingValue (${ratingValue}) declared in schema does not appear in visible content.`);
    }
    if (reviewCount && !cleanVisibleText.includes(reviewCount)) {
      isFabricated = true;
      errors.push(`Fabricated aggregateRating.reviewCount (${reviewCount}) declared in schema does not appear in visible content.`);
    }
  }

  return {
    isValid: errors.length === 0,
    schemaType: typeof schemaType === 'string' ? schemaType : undefined,
    jsonLd,
    errors,
    isFabricated,
  };
}

export function generateValidSchema(input: {
  type: string;
  title: string;
  description: string;
  url?: string;
  authorName?: string;
  publishedAt?: string;
  steps?: Array<{ name: string; text: string }>;
}): string {
  const base: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': input.type || 'Article',
    headline: input.title,
    description: input.description,
    author: {
      '@type': 'Person',
      name: input.authorName || 'Editorial Team',
    },
    datePublished: input.publishedAt || new Date().toISOString(),
  };

  if (input.type === 'HowTo' && input.steps && input.steps.length > 0) {
    base.step = input.steps.map((s, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: s.name,
      text: s.text,
    }));
  }

  return JSON.stringify(base, null, 2);
}
