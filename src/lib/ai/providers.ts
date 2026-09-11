// ============================================================
// AI PROVIDER CONFIGURATIONS
// ============================================================
// Only 5 provider kinds are supported. Legacy kinds (OPENROUTER,
// OLLAMA, AZURE_OPENAI) have been removed.

export type ModelCapability = 'TEXT_GENERATION' | 'IMAGE_GENERATION';
export type CapabilitySource = 'provider_metadata' | 'manual_override';

export interface ProviderConfig {
  kind: string;
  name: string;
  defaultBaseUrl: string;
  modelsEndpoint: string;
  chatEndpoint: string;
  helpText: string;
  icon: string;
  defaultModels: ProviderModel[];
}

export interface ProviderModel {
  modelId: string;
  name: string;
  contextLength: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  supportsImages: boolean;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  supportsJsonMode: boolean;
  supportsStreaming: boolean;
  supportsTools: boolean;
  capabilities?: ModelCapability[];
}

export const PROVIDER_KINDS = ['OPENAI', 'ANTHROPIC', 'GEMINI', 'GROQ', 'DEEPSEEK', 'CUSTOM'] as const;

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  OPENAI: {
    kind: 'OPENAI',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    helpText: 'Enter your OpenAI API key from platform.openai.com',
    icon: 'OpenAI',
    defaultModels: [
      { modelId: 'gpt-5', name: 'GPT-5', contextLength: 256000, inputCostPer1k: 0.005, outputCostPer1k: 0.015, supportsImages: true, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'gpt-5-mini', name: 'GPT-5 mini', contextLength: 256000, inputCostPer1k: 0.0003, outputCostPer1k: 0.0009, supportsImages: true, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'gpt-4.1', name: 'GPT-4.1', contextLength: 1047576, inputCostPer1k: 0.002, outputCostPer1k: 0.008, supportsImages: false, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'gpt-4.1-mini', name: 'GPT-4.1 mini', contextLength: 1047576, inputCostPer1k: 0.0004, outputCostPer1k: 0.0016, supportsImages: false, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'gpt-image-1', name: 'GPT Image', contextLength: 0, inputCostPer1k: 0, outputCostPer1k: 0.04, supportsImages: true, supportsVision: false, supportsFunctionCalling: false, supportsJsonMode: false, supportsStreaming: false, supportsTools: false, capabilities: ['IMAGE_GENERATION'] },
      { modelId: 'dall-e-3', name: 'DALL-E 3', contextLength: 0, inputCostPer1k: 0, outputCostPer1k: 0.04, supportsImages: true, supportsVision: false, supportsFunctionCalling: false, supportsJsonMode: false, supportsStreaming: false, supportsTools: false, capabilities: ['IMAGE_GENERATION'] },
    ],
  },
  ANTHROPIC: {
    kind: 'ANTHROPIC',
    name: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    modelsEndpoint: '', // Anthropic has no /models endpoint
    chatEndpoint: '/messages',
    helpText: 'Enter your Anthropic API key from console.anthropic.com',
    icon: 'Anthropic',
    defaultModels: [
      { modelId: 'claude-sonnet-4-20250514', name: 'Claude Sonnet', contextLength: 200000, inputCostPer1k: 0.003, outputCostPer1k: 0.015, supportsImages: true, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'claude-3-5-haiku-20241022', name: 'Claude Haiku', contextLength: 200000, inputCostPer1k: 0.001, outputCostPer1k: 0.005, supportsImages: true, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'claude-opus-4-20250514', name: 'Claude Opus', contextLength: 200000, inputCostPer1k: 0.015, outputCostPer1k: 0.075, supportsImages: true, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
    ],
  },
  GEMINI: {
    kind: 'GEMINI',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelsEndpoint: '/models',
    chatEndpoint: '', // constructed dynamically per model
    helpText: 'Enter your Google AI API key from aistudio.google.com',
    icon: 'Gemini',
    defaultModels: [
      { modelId: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextLength: 1048576, inputCostPer1k: 0.00125, outputCostPer1k: 0.01, supportsImages: true, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextLength: 1048576, inputCostPer1k: 0.00015, outputCostPer1k: 0.0006, supportsImages: true, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'gemini-2.0-flash-image', name: 'Gemini Image', contextLength: 0, inputCostPer1k: 0, outputCostPer1k: 0.039, supportsImages: true, supportsVision: false, supportsFunctionCalling: false, supportsJsonMode: false, supportsStreaming: false, supportsTools: false, capabilities: ['IMAGE_GENERATION'] },
      { modelId: 'imagen-3.0-generate-002', name: 'Imagen 3', contextLength: 0, inputCostPer1k: 0, outputCostPer1k: 0.03, supportsImages: true, supportsVision: false, supportsFunctionCalling: false, supportsJsonMode: false, supportsStreaming: false, supportsTools: false, capabilities: ['IMAGE_GENERATION'] },
    ],
  },
  GROQ: {
    kind: 'GROQ',
    name: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    helpText: 'Enter your Groq API key from console.groq.com',
    icon: 'Groq',
    defaultModels: [
      { modelId: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextLength: 131072, inputCostPer1k: 0.00059, outputCostPer1k: 0.00079, supportsImages: false, supportsVision: false, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', contextLength: 131072, inputCostPer1k: 0.00005, outputCostPer1k: 0.00008, supportsImages: false, supportsVision: false, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', contextLength: 131072, inputCostPer1k: 0.00011, outputCostPer1k: 0.00034, supportsImages: false, supportsVision: true, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: true, capabilities: ['TEXT_GENERATION'] },
    ],
  },
  DEEPSEEK: {
    kind: 'DEEPSEEK',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    helpText: 'Enter your DeepSeek API key from platform.deepseek.com',
    icon: 'DeepSeek',
    defaultModels: [
      { modelId: 'deepseek-chat', name: 'DeepSeek V3', contextLength: 131072, inputCostPer1k: 0.00014, outputCostPer1k: 0.00028, supportsImages: false, supportsVision: false, supportsFunctionCalling: true, supportsJsonMode: true, supportsStreaming: true, supportsTools: false, capabilities: ['TEXT_GENERATION'] },
      { modelId: 'deepseek-reasoner', name: 'DeepSeek R1', contextLength: 131072, inputCostPer1k: 0.00055, outputCostPer1k: 0.00219, supportsImages: false, supportsVision: false, supportsFunctionCalling: false, supportsJsonMode: false, supportsStreaming: true, supportsTools: false, capabilities: ['TEXT_GENERATION'] },
    ],
  },
  CUSTOM: {
    // Custom OpenAI-compatible provider. The admin configures the Base URL
    // and API key; we treat it as an OpenAI-compatible endpoint for chat,
    // models listing, and image generation.
    kind: 'CUSTOM',
    name: 'Custom',
    defaultBaseUrl: '', // Admin must provide — no default
    modelsEndpoint: '/models', // OpenAI-compatible models endpoint
    chatEndpoint: '/chat/completions', // OpenAI-compatible chat endpoint
    helpText: 'Enter the Base URL and API key for your OpenAI-compatible provider (e.g. https://api.example.com/v1).',
    icon: 'Settings',
    defaultModels: [], // No defaults — models are synced from the provider's /models endpoint
  },
};

// Set of model IDs that are image-generation models (type IMAGE).
// Used by syncModels to correctly type synced models.
export const IMAGE_MODEL_IDS = new Set([
  'gpt-image-1',
  'dall-e-3',
  'dall-e-2',
  'gemini-2.0-flash-image',
  'gemini-image-gen',
  'imagen-3.0-generate-002',
  'imagen-3.0-fast-generate-001',
]);

export const KNOWN_IMAGE_PATTERNS = [
  'dall-e',
  'imagen',
  'stable-diffusion',
  'sdxl',
  'sd-',
  'sd3',
  'flux',
  'midjourney',
  'kandinsky',
  'playground-v2',
  'image-gen',
  'gpt-image',
];

export function isKnownImageModel(modelId: string): boolean {
  const lower = (modelId || '').toLowerCase();
  return KNOWN_IMAGE_PATTERNS.some((p) => lower.includes(p));
}

export const KNOWN_TEXT_PATTERNS = [
  'llama', 'mistral', 'mixtral', 'qwen', 'gemma', 'deepseek', 'claude', 'phi',
  'codestral', 'nemotron', 'command-r', 'glm', 'kimi', 'yi-', 'solar', 'vicuna',
  'falcon', 'zephyr', 'openhermes', 'starcoder', 'chatglm', 'baichuan', 'minimax',
  'jamba', 'granite', 'embed', 'guard', 'translate', 'palmyra', 'zamba', 'arctic',
  'gpt-', 'gpt-3', 'gpt-4', 'gpt-5', 'gpt-6', 'o1', 'o3', 'chatgpt', 'whisper',
  'tts-', 'audio', 'babbage', 'davinci', 'gemini', 'cohere', 'jurassic',
];

/** Check whether a provider kind has any image generation endpoint support */
export function canProviderSupportImageGeneration(kind: string): boolean {
  const upper = (kind || '').toUpperCase();
  return upper === 'OPENAI' || upper === 'GEMINI' || upper === 'CUSTOM';
}

/** Check whether a model is explicitly forbidden from being marked as IMAGE_GENERATION */
export function isModelForbiddenForImageGeneration(providerKind: string, modelId: string): { forbidden: boolean; reason?: string } {
  const kind = (providerKind || '').toUpperCase();
  if (!canProviderSupportImageGeneration(kind)) {
    return {
      forbidden: true,
      reason: `${providerKind} does not support image generation. It is a text-only provider.`,
    };
  }

  const lowerModel = (modelId || '').toLowerCase().trim();
  if (!lowerModel) return { forbidden: false };

  // If it's a known explicit image generation model, it is allowed
  if (isKnownImageModel(lowerModel)) {
    return { forbidden: false };
  }

  // 1. OpenAI: Only DALL-E / gpt-image models can generate images
  if (kind === 'OPENAI') {
    if (!lowerModel.startsWith('dall-e') && lowerModel !== 'gpt-image-1') {
      return {
        forbidden: true,
        reason: `${modelId} is a text/chat model and does not support image generation. OpenAI only supports image generation via DALL-E models (e.g. dall-e-3).`,
      };
    }
  }

  // 2. Gemini: Only Imagen models generate images. Gemini vision models read images, they do NOT generate images!
  if (kind === 'GEMINI') {
    if (!lowerModel.includes('imagen') && !lowerModel.includes('image-gen')) {
      return {
        forbidden: true,
        reason: `${modelId} is a language/multimodal input model and does not generate images. Google Gemini only supports image generation via Imagen models (e.g. imagen-3.0-generate-002).`,
      };
    }
  }

  // 3. Custom / Other OpenAI-compatible providers:
  // If the model matches known LLM/text-only architectures:
  const isTextArchitecture = KNOWN_TEXT_PATTERNS.some((p) => lowerModel.includes(p));
  if (isTextArchitecture) {
    return {
      forbidden: true,
      reason: `${modelId} is a language/text model and cannot generate images. Only image models (e.g. DALL-E, Imagen, Stable Diffusion, Flux) support image generation.`,
    };
  }

  return { forbidden: false };
}

/**
 * Safely parse capabilities from DB string or array.
 */
export function parseCapabilities(raw: unknown): ModelCapability[] {
  if (Array.isArray(raw)) {
    const valid = raw.filter((c): c is ModelCapability => c === 'TEXT_GENERATION' || c === 'IMAGE_GENERATION');
    return valid.length > 0 ? Array.from(new Set(valid)) : ['TEXT_GENERATION'];
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((c): c is ModelCapability => c === 'TEXT_GENERATION' || c === 'IMAGE_GENERATION');
        if (valid.length > 0) return Array.from(new Set(valid));
      }
    } catch {
      // ignore
    }
  }
  return ['TEXT_GENERATION'];
}

/**
 * Detect real capabilities for a model from provider kind, modelId, and metadata.
 * Enforces: Vision input != Image generation.
 */
export function detectModelCapabilities(
  providerKind: string,
  modelId: string,
  metadata?: { supportedGenerationMethods?: string[] }
): ModelCapability[] {
  const kind = (providerKind || '').toUpperCase();
  const lowerId = (modelId || '').toLowerCase();

  // 1. Providers that have NO image generation capability at all
  if (kind === 'ANTHROPIC' || kind === 'GROQ' || kind === 'DEEPSEEK') {
    return ['TEXT_GENERATION'];
  }

  // 2. Gemini
  if (kind === 'GEMINI') {
    const methods = metadata?.supportedGenerationMethods || [];
    const isExplicitImagen = lowerId.includes('imagen') || lowerId.includes('image-gen') || lowerId === 'gemini-2.0-flash-image';
    const hasImageMethod = methods.includes('predict') || methods.includes('imageGeneration') || methods.includes('generateImages');

    if (isExplicitImagen || (hasImageMethod && !methods.includes('generateContent'))) {
      return ['IMAGE_GENERATION'];
    }

    // Models with generateContent (e.g. gemini-1.5-flash, gemini-2.5-pro): TEXT_GENERATION only!
    // Vision input is NOT image generation.
    return ['TEXT_GENERATION'];
  }

  // 3. OpenAI
  if (kind === 'OPENAI') {
    if (lowerId.startsWith('dall-e') || lowerId === 'gpt-image-1') {
      return ['IMAGE_GENERATION'];
    }
    return ['TEXT_GENERATION'];
  }

  // 4. Custom / OpenAI-compatible
  if (
    lowerId.startsWith('dall-e') ||
    lowerId.includes('imagen') ||
    lowerId.includes('stable-diffusion') ||
    lowerId.startsWith('sdxl') ||
    lowerId.startsWith('sd-') ||
    lowerId.startsWith('sd3') ||
    lowerId.includes('flux') ||
    lowerId.includes('midjourney') ||
    lowerId.includes('kandinsky') ||
    lowerId.includes('playground-v2')
  ) {
    return ['IMAGE_GENERATION'];
  }

  // Default custom models to TEXT_GENERATION
  return ['TEXT_GENERATION'];
}

export function getProviderConfig(kind: string): ProviderConfig {
  return PROVIDER_CONFIGS[kind] ?? {
    kind,
    name: kind,
    defaultBaseUrl: '',
    modelsEndpoint: '',
    chatEndpoint: '',
    helpText: '',
    icon: 'Settings',
    defaultModels: [],
  };
}

export function isImageModelId(modelId: string): boolean {
  return IMAGE_MODEL_IDS.has(modelId) || (modelId || '').toLowerCase().startsWith('dall-e') || (modelId || '').toLowerCase().includes('imagen');
}

