'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Zap, FileText, Sparkles, Send, ChevronRight, ChevronLeft, X, Search, FolderOpen, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { postApi, getApi } from '@/lib/api-client';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

// -------------------- Types --------------------

type KeywordSource = 'MANUAL' | 'SAVED' | 'AI_GENERATE';
type MediaSource = 'NONE' | 'MEDIA_LIBRARY' | 'AI_GENERATE';
type ImagePlacement = 'AI_AUTOMATIC' | 'AFTER_INTRO' | 'BEFORE_FIRST_H2' | 'AFTER_EACH_H2' | 'MANUAL_MAPPING';

interface SavedKeyword { id: string; name: string; slug?: string; color?: string; }
interface MediaFolder { id: string; name: string; }
interface MediaItem { id: string; filename: string; url: string; thumbnailUrl?: string; }

// -------------------- Small Reusable UI Pieces --------------------

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">{children}</h3>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}{hint && <span className="text-muted-foreground/50 ml-1">— {hint}</span>}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 rounded-lg px-3 hover:bg-muted/40 transition-colors">
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}

function ConditionalBlock({ children }: { children: React.ReactNode }) {
  return <div className="ml-1 pl-4 border-l-2 border-primary/15 space-y-4 pt-1 pb-1">{children}</div>;
}

// -------------------- Component --------------------

export function AutomationBuilderPage({ mode }: { mode?: 'generate' }) {
  const { t } = useT();
  const navigate = useNavigationStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const isGenerateMode = mode === 'generate';
  const [step, setStep] = useState(isGenerateMode ? 2 : 1);
  const [generating, setGenerating] = useState(false);
  const keywordFileRef = useRef<HTMLInputElement>(null);

  // ── State (same as before, no logic changes) ──
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<'MANUAL' | 'SCHEDULED'>(isGenerateMode ? 'MANUAL' : 'SCHEDULED');
  const [frequency, setFrequency] = useState('DAILY');
  const [time, setTime] = useState('09:00');
  const [topic, setTopic] = useState('');
  const [keywordSource, setKeywordSource] = useState<KeywordSource>('MANUAL');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [semanticKeywords, setSemanticKeywords] = useState('');
  const [savedKeywordSearch, setSavedKeywordSearch] = useState('');
  const [selectedSavedKeywordIds, setSelectedSavedKeywordIds] = useState<string[]>([]);
  const [aiKeywordCount, setAiKeywordCount] = useState('5');
  const [aiKeywordCustomCount, setAiKeywordCustomCount] = useState('');
  const [aiKeywordTone, setAiKeywordTone] = useState('Informational');
  const [aiKeywordCustomTone, setAiKeywordCustomTone] = useState('');
  const [tone, setTone] = useState('Professional');
  const [customTone, setCustomTone] = useState('');
  const [contentLength, setContentLength] = useState('Medium (800-1200 words)');
  const [customWordCount, setCustomWordCount] = useState('');
  const [structIntro, setStructIntro] = useState(true);
  const [structToc, setStructToc] = useState(false);
  const [structH2, setStructH2] = useState(true);
  const [structH3, setStructH3] = useState(true);
  const [structFaq, setStructFaq] = useState(false);
  const [structConclusion, setStructConclusion] = useState(true);
  const [generateSeoTitle, setGenerateSeoTitle] = useState(true);
  const [generateMetaDescription, setGenerateMetaDescription] = useState(true);
  const [generateSlug, setGenerateSlug] = useState(true);
  const [optimizePrimaryKeyword, setOptimizePrimaryKeyword] = useState(true);
  const [includeSecondaryKeywords, setIncludeSecondaryKeywords] = useState(true);
  const [includeSemanticKeywords, setIncludeSemanticKeywords] = useState(true);
  const [generateFaq, setGenerateFaq] = useState(false);
  const [generateFaqSchema, setGenerateFaqSchema] = useState(false);
  const [generateArticleSchema, setGenerateArticleSchema] = useState(true);
  const [mediaSource, setMediaSource] = useState<MediaSource>('AI_GENERATE');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [imageSelectionMode, setImageSelectionMode] = useState<'ALL' | 'RANDOM' | 'AI_CHOOSE'>('AI_CHOOSE');
  const [generateFeaturedImage, setGenerateFeaturedImage] = useState(true);
  const [generateSectionImages, setGenerateSectionImages] = useState(false);
  const [imageCount, setImageCount] = useState('3');
  const [customImageCount, setCustomImageCount] = useState('');
  const [imageStyle, setImageStyle] = useState('Realistic');
  const [customImageStyle, setCustomImageStyle] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [customAspectRatio, setCustomAspectRatio] = useState('');
  const [imageTone, setImageTone] = useState('Modern');
  const [customImageTone, setCustomImageTone] = useState('');
  const [imagePromptInstructions, setImagePromptInstructions] = useState('');
  const [imagePlacement, setImagePlacement] = useState<ImagePlacement>('AI_AUTOMATIC');
  const [finalAction, setFinalAction] = useState('DRAFT');
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');

  // ── Queries ──
  // Fetch ALL saved keywords once (no server-side search) — filter client-side for real-time search
  const { data: savedKeywordsData } = useQuery({
    queryKey: ['saved-keywords-all'],
    queryFn: () => getApi(`/api/tags?pageSize=500`),
    enabled: keywordSource === 'SAVED' && step === 2, staleTime: 30_000,
  });
  const allSavedKeywords: SavedKeyword[] = useMemo(() => {
    const d = savedKeywordsData as any;
    if (Array.isArray(d)) return d as SavedKeyword[];
    if (d?.data && Array.isArray(d.data)) return d.data as SavedKeyword[];
    return [];
  }, [savedKeywordsData]);
  // Client-side real-time filtering
  const savedKeywords = useMemo(() => {
    if (!savedKeywordSearch.trim()) return allSavedKeywords;
    const q = savedKeywordSearch.toLowerCase();
    return allSavedKeywords.filter(k => k.name.toLowerCase().includes(q));
  }, [allSavedKeywords, savedKeywordSearch]);

  const { data: foldersData } = useQuery({
    queryKey: ['media-folders'], queryFn: () => getApi('/api/media-folders?pageSize=100'),
    enabled: mediaSource === 'MEDIA_LIBRARY' && step === 3, staleTime: 60_000,
  });
  const mediaFolders: MediaFolder[] = useMemo(() => { const d = foldersData as any; return Array.isArray(d) ? d : d?.data ?? []; }, [foldersData]);

  const { data: mediaItemsData } = useQuery({
    queryKey: ['media-folder-items', selectedFolderId], queryFn: () => getApi(`/api/media?folderId=${selectedFolderId}&pageSize=50`),
    enabled: mediaSource === 'MEDIA_LIBRARY' && !!selectedFolderId && step === 3, staleTime: 30_000,
  });
  const mediaItems: MediaItem[] = useMemo(() => { const d = mediaItemsData as any; return Array.isArray(d) ? d : d?.data ?? []; }, [mediaItemsData]);

  const toggleSavedKeyword = (id: string) => setSelectedSavedKeywordIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleMediaSelection = (id: string) => setSelectedMediaIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleKeywordFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length > 1) { const [, ...rows] = lines; for (const row of rows) { const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, '')); if (cols[0]) { postApi('/api/tags', { name: cols[0] }).then(() => { queryClient.invalidateQueries({ queryKey: ['saved-keywords'] }); toast.success(`${t('automation.builder.toastImportedPrefix')} ${cols[0]}`); }).catch(() => {}); } } }
      } else if (file.name.endsWith('.txt')) { const match = text.match(/Primary Keyword:\s*(.+)/i); if (match?.[1]) { const kw = match[1].trim(); postApi('/api/tags', { name: kw }).then(() => { queryClient.invalidateQueries({ queryKey: ['saved-keywords'] }); toast.success(`${t('automation.builder.toastImportedPrefix')} ${kw}`); }).catch(() => {}); } }
    };
    reader.readAsText(file); if (keywordFileRef.current) keywordFileRef.current.value = '';
  };

  // ── Create + Run mutation (generate mode creates automation, runs it, redirects to article) ──
  const createMutation = useMutation({
    mutationFn: async () => {
      const finalAiKeywordCount = aiKeywordCount === 'Custom' ? parseInt(aiKeywordCustomCount) || 25 : parseInt(aiKeywordCount);
      const finalContentLength = contentLength === 'Custom' ? `Custom (${customWordCount} words)` : contentLength;
      const finalTone = tone === 'Custom' ? customTone : tone;
      const finalImageCount = imageCount === 'Custom' ? parseInt(customImageCount) || 3 : parseInt(imageCount);
      const finalImageStyle = imageStyle === 'Custom' ? customImageStyle : imageStyle;
      const finalAspectRatio = aspectRatio === 'Custom' ? customAspectRatio : aspectRatio;
      const finalImageTone = imageTone === 'Custom' ? customImageTone : imageTone;
      const actualFinalAction = isGenerateMode ? 'DRAFT' : finalAction;
      const workflowConfig = JSON.stringify({
        contentGeneration: { topic, keywordSource, primaryKeyword: keywordSource === 'MANUAL' ? primaryKeyword : undefined, secondaryKeywords: keywordSource === 'MANUAL' ? secondaryKeywords : undefined, semanticKeywords: keywordSource === 'MANUAL' ? semanticKeywords : undefined, savedKeywordIds: keywordSource === 'SAVED' ? selectedSavedKeywordIds : undefined, aiKeywordCount: keywordSource === 'AI_GENERATE' ? finalAiKeywordCount : undefined, aiKeywordTone: keywordSource === 'AI_GENERATE' ? (aiKeywordTone === 'Custom' ? aiKeywordCustomTone : aiKeywordTone) : undefined, tone: finalTone, contentLength: finalContentLength, articleStructure: { introduction: structIntro, tableOfContents: structToc, h2Sections: structH2, h3Subsections: structH3, faqSection: structFaq, conclusion: structConclusion } },
        seoProcessing: { generateSeoTitle, generateMetaDescription, generateSlug, optimizePrimaryKeyword, includeSecondaryKeywords, includeSemanticKeywords, generateFaq, generateFaqSchema, generateArticleSchema },
        media: { source: mediaSource, folderId: mediaSource === 'MEDIA_LIBRARY' ? selectedFolderId : undefined, selectedMediaIds: mediaSource === 'MEDIA_LIBRARY' && selectedMediaIds.length > 0 ? selectedMediaIds : undefined, imageSelectionMode: mediaSource === 'MEDIA_LIBRARY' ? imageSelectionMode : undefined, generateFeaturedImage: mediaSource === 'AI_GENERATE' ? generateFeaturedImage : undefined, generateSectionImages: mediaSource === 'AI_GENERATE' ? generateSectionImages : undefined, imageCount: mediaSource === 'AI_GENERATE' ? finalImageCount : undefined, imageStyle: mediaSource === 'AI_GENERATE' ? finalImageStyle : undefined, aspectRatio: mediaSource === 'AI_GENERATE' ? finalAspectRatio : undefined, imageTone: mediaSource === 'AI_GENERATE' ? finalImageTone : undefined, imagePromptInstructions: mediaSource === 'AI_GENERATE' ? imagePromptInstructions : undefined, placement: mediaSource !== 'NONE' ? imagePlacement : undefined },
        finalAction: { action: actualFinalAction, publishDate: actualFinalAction === 'SCHEDULE' ? publishDate : undefined, publishTime: actualFinalAction === 'SCHEDULE' ? publishTime : undefined },
      });
      const created = await postApi<any>('/api/automations', { name: isGenerateMode ? `Generate: ${topic}` : name, description, triggerType: isGenerateMode ? 'MANUAL' : triggerType, scheduleConfig: JSON.stringify({ frequency, time }), workflowConfig });
      const automationId = created?.id || created?.data?.id;
      queryClient.invalidateQueries({ queryKey: ['automations'] });

      if (isGenerateMode && automationId) {
        // Run the automation immediately
        setGenerating(true);
        await postApi(`/api/automations/${automationId}/run`);
        // Poll for completion — check the run status until it finishes
        let articleId: string | null = null;
        for (let attempt = 0; attempt < 30; attempt++) {
          await new Promise(r => setTimeout(r, 2000));
          try {
            const runRes = await getApi<any>(`/api/automations/${automationId}`);
            const runData = runRes?.data ?? runRes;
            // Check the latest run's generatedArticleId
            const runs = runData?.runs ?? [];
            const latestRun = runs[0];
            if (latestRun?.status === 'COMPLETED' && latestRun?.generatedArticleId) {
              articleId = latestRun.generatedArticleId;
              break;
            }
            if (latestRun?.status === 'FAILED') {
              throw new Error(latestRun?.errorMessage || 'AI generation failed');
            }
          } catch { /* keep polling */ }
        }
        return { articleId };
      }
      return { articleId: null };
    },
    onSuccess: (result: any) => {
      if (isGenerateMode) {
        setGenerating(false);
        if (result?.articleId) {
          toast.success(t('automation.builder.toastArticleGenerated'));
          navigate('content', result.articleId);
        } else {
          toast.success(t('automation.builder.toastGenerationCompleted'));
          navigate('content');
        }
      } else {
        toast.success(t('automation.builder.toastAutomationCreated'));
        navigate('automation');
      }
    },
    onError: (err: Error) => {
      setGenerating(false);
      toast.error(err.message || t('automation.builder.toastFailed'));
    },
  });

  const steps = isGenerateMode
    ? [{ num: 2, label: t('automation.builder.stepContent'), icon: FileText, desc: t('automation.builder.stepContentDesc') }, { num: 3, label: t('automation.builder.stepSeoMedia'), icon: Sparkles, desc: t('automation.builder.stepSeoMediaDesc') }, { num: 4, label: t('automation.builder.stepAction'), icon: Send, desc: t('automation.builder.stepActionDesc') }]
    : [{ num: 1, label: t('automation.builder.stepTrigger'), icon: Zap, desc: t('automation.builder.stepTriggerDesc') }, { num: 2, label: t('automation.builder.stepContent'), icon: FileText, desc: t('automation.builder.stepContentDesc') }, { num: 3, label: t('automation.builder.stepSeoMedia'), icon: Sparkles, desc: t('automation.builder.stepSeoMediaDesc') }, { num: 4, label: t('automation.builder.stepAction'), icon: Send, desc: t('automation.builder.stepActionDesc') }];

  const canProceed = useMemo(() => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) { if (!topic.trim()) return false; if (keywordSource === 'MANUAL' && !primaryKeyword.trim()) return false; if (keywordSource === 'SAVED' && selectedSavedKeywordIds.length === 0) return false; if (keywordSource === 'AI_GENERATE' && aiKeywordCount === 'Custom' && (!aiKeywordCustomCount || parseInt(aiKeywordCustomCount) < 1)) return false; if (tone === 'Custom' && !customTone.trim()) return false; if (contentLength === 'Custom' && (!customWordCount || parseInt(customWordCount) < 1)) return false; return true; }
    if (step === 3) { if (mediaSource === 'MEDIA_LIBRARY' && selectedMediaIds.length === 0 && imageSelectionMode !== 'ALL') return false; if (mediaSource === 'AI_GENERATE') { if (!generateFeaturedImage && !generateSectionImages) return false; if (imageCount === 'Custom' && (!customImageCount || parseInt(customImageCount) < 1)) return false; if (imageStyle === 'Custom' && !customImageStyle.trim()) return false; if (aspectRatio === 'Custom' && !customAspectRatio.trim()) return false; if (imageTone === 'Custom' && !customImageTone.trim()) return false; } return true; }
    return true;
  }, [step, name, topic, keywordSource, primaryKeyword, selectedSavedKeywordIds, aiKeywordCount, aiKeywordCustomCount, tone, customTone, contentLength, customWordCount, mediaSource, selectedMediaIds, imageSelectionMode, generateFeaturedImage, generateSectionImages, imageCount, customImageCount, imageStyle, customImageStyle, aspectRatio, customAspectRatio, imageTone, customImageTone]);

  // ── Preview helpers ──
  const kwPreview = keywordSource === 'MANUAL' ? (primaryKeyword || '—') : keywordSource === 'SAVED' ? `${selectedSavedKeywordIds.length} ${t('automation.builder.previewKwSavedSuffix')}` : `${t('automation.builder.previewMediaAi')}: ${aiKeywordCount === 'Custom' ? aiKeywordCustomCount : aiKeywordCount} (${aiKeywordTone === 'Custom' ? aiKeywordCustomTone : aiKeywordTone})`;
  const structParts = [structIntro && t('automation.builder.previewStructureIntro'), structToc && t('automation.builder.previewStructureToc'), structH2 && t('automation.builder.previewStructureH2'), structH3 && t('automation.builder.previewStructureH3'), structFaq && t('automation.builder.previewStructureFaq'), structConclusion && t('automation.builder.previewStructureConclusion')].filter(Boolean);
  const seoParts = [generateSeoTitle && t('automation.builder.previewSeoTitle'), generateMetaDescription && t('automation.builder.previewSeoMeta'), generateSlug && t('automation.builder.previewSeoSlug'), optimizePrimaryKeyword && t('automation.builder.previewSeoPrimaryKw'), includeSecondaryKeywords && t('automation.builder.previewSeoSecondary'), includeSemanticKeywords && t('automation.builder.previewSeoSemantic'), generateFaq && t('automation.builder.previewStructureFaq'), generateFaqSchema && t('automation.builder.previewSeoFaqSchema'), generateArticleSchema && t('automation.builder.previewSeoArticleSchema')].filter(Boolean);
  const mediaPreview = mediaSource === 'NONE' ? t('automation.builder.previewNone') : mediaSource === 'MEDIA_LIBRARY' ? `${t('automation.builder.previewMediaLibrary')} (${selectedMediaIds.length || t('automation.builder.previewMediaAuto')}, ${imageSelectionMode})` : `${t('automation.builder.previewMediaAi')} (${imageCount === 'Custom' ? customImageCount : imageCount}, ${imageStyle === 'Custom' ? customImageStyle : imageStyle})`;
  const placementLabel = { AI_AUTOMATIC: t('automation.builder.previewPlacementAiAuto'), AFTER_INTRO: t('automation.builder.previewPlacementAfterIntro'), BEFORE_FIRST_H2: t('automation.builder.previewPlacementBeforeH2'), AFTER_EACH_H2: t('automation.builder.previewPlacementAfterEachH2'), MANUAL_MAPPING: t('automation.builder.previewPlacementManual') }[imagePlacement];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Page Header — integrated, no rectangle */}
      <div>
        <button
          type="button"
          onClick={() => navigate(isGenerateMode ? 'content' : 'automation')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isGenerateMode ? t('automation.builder.backToArticles') : t('automation.builder.backToAutomations')}
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{isGenerateMode ? t('automation.builder.generateArticle') : t('automation.builder.newAutomation')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGenerateMode ? t('automation.builder.generateArticleDesc') : t('automation.builder.newAutomationDesc')}
        </p>
      </div>

      {/* Stepper */}
      <div>
        <div className="flex items-center">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <button type="button" onClick={() => { if (s.num < step || canProceed) setStep(s.num); }} className={cn('flex items-center gap-2.5 transition-all', s.num < step ? 'cursor-pointer' : s.num === step ? '' : 'opacity-40 cursor-not-allowed')}>
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all shrink-0', s.num < step ? 'bg-primary text-primary-foreground' : s.num === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/15' : 'bg-muted text-muted-foreground')}>
                  {s.num < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <div className="hidden sm:block text-left">
                  <p className={cn('text-xs font-semibold leading-tight', s.num <= step ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{s.desc}</p>
                </div>
              </button>
              {i < steps.length - 1 && <div className={cn('h-0.5 flex-1 mx-4 transition-colors', s.num < step ? 'bg-primary' : 'bg-border')} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content Card */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          {/* ─────────── STEP 1: TRIGGER ─────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <SectionLabel icon={Zap}>{t('automation.builder.triggerConfig')}</SectionLabel>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('automation.builder.automationName')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('automation.builder.automationNamePlaceholder')} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('automation.builder.descriptionLabel')}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('automation.builder.descriptionPlaceholder')} rows={2} className="resize-none" />
              </div>
              <Separator />
              <FieldRow label={t('automation.builder.triggerType')}>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as 'MANUAL' | 'SCHEDULED')}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">{t('automation.builder.triggerTypeManual')}</SelectItem>
                    <SelectItem value="SCHEDULED">{t('automation.builder.triggerTypeScheduled')}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              {triggerType === 'SCHEDULED' && (
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label={t('automation.builder.frequency')}>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">{t('automation.builder.frequencyDaily')}</SelectItem><SelectItem value="WEEKLY">{t('automation.builder.frequencyWeekly')}</SelectItem><SelectItem value="MONTHLY">{t('automation.builder.frequencyMonthly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label={t('automation.builder.timeLabel')}>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10" />
                  </FieldRow>
                </div>
              )}
            </div>
          )}

          {/* ─────────── STEP 2: CONTENT ─────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <SectionLabel icon={FileText}>{t('automation.builder.contentGeneration')}</SectionLabel>
              <FieldRow label={t('automation.builder.articleTopic')}>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('automation.builder.articleTopicPlaceholder')} className="h-10" />
              </FieldRow>
              <Separator />
              <FieldRow label={t('automation.builder.keywordSource')}>
                <Select value={keywordSource} onValueChange={(v) => setKeywordSource(v as KeywordSource)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">{t('automation.builder.keywordSourceManual')}</SelectItem><SelectItem value="SAVED">{t('automation.builder.keywordSourceSaved')}</SelectItem><SelectItem value="AI_GENERATE">{t('automation.builder.keywordSourceAi')}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              {keywordSource === 'MANUAL' && (
                <ConditionalBlock>
                  <FieldRow label={t('automation.builder.primaryKeyword')}><Input value={primaryKeyword} onChange={(e) => setPrimaryKeyword(e.target.value)} placeholder={t('automation.builder.primaryKeywordPlaceholder')} className="h-9" /></FieldRow>
                  <FieldRow label={t('automation.builder.secondaryKeywords')} hint={t('automation.builder.hintCommaSeparated')}><Input value={secondaryKeywords} onChange={(e) => setSecondaryKeywords(e.target.value)} placeholder={t('automation.builder.secondaryKeywordsPlaceholder')} className="h-9" /></FieldRow>
                  <FieldRow label={t('automation.builder.semanticKeywords')} hint={t('automation.builder.hintCommaSeparated')}><Input value={semanticKeywords} onChange={(e) => setSemanticKeywords(e.target.value)} placeholder={t('automation.builder.semanticKeywordsPlaceholder')} className="h-9" /></FieldRow>
                </ConditionalBlock>
              )}
              {keywordSource === 'SAVED' && (
                <ConditionalBlock>
                  {/* Search + Import */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input value={savedKeywordSearch} onChange={(e) => setSavedKeywordSearch(e.target.value)} placeholder={t('automation.builder.searchSavedKeywords')} className="pl-8 h-9 text-sm" />
                    </div>
                    <input ref={keywordFileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleKeywordFileImport} />
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={() => keywordFileRef.current?.click()}><Upload className="h-3.5 w-3.5" />{t('automation.builder.import')}</Button>
                  </div>
                  {/* Selected keywords chips */}
                  {selectedSavedKeywordIds.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{selectedSavedKeywordIds.length} {t('automation.builder.selectedSuffix')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSavedKeywordIds.map(id => { const kw = allSavedKeywords.find(k => k.id === id); return <Badge key={id} variant="secondary" className="gap-1 text-xs pr-1 py-1">{kw?.name ?? id}<button type="button" onClick={() => toggleSavedKeyword(id)} className="hover:text-destructive"><X className="h-3 w-3" /></button></Badge>; })}
                      </div>
                    </div>
                  )}
                  {/* Keyword list — real-time filtered, selected items highlighted */}
                  <div className="max-h-56 overflow-y-auto rounded-lg border bg-card">
                    {allSavedKeywords.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm font-medium text-muted-foreground">{t('automation.builder.noSavedKeywords')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('automation.builder.noSavedKeywordsHint')}</p>
                      </div>
                    ) : savedKeywords.length === 0 && savedKeywordSearch.trim() ? (
                      <div className="p-6 text-center">
                        <p className="text-sm font-medium text-muted-foreground">{t('automation.builder.noMatchingKeywords')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('automation.builder.noMatchingKeywordsHint')}</p>
                      </div>
                    ) : (
                      savedKeywords.map(kw => {
                        const isSelected = selectedSavedKeywordIds.includes(kw.id);
                        return (
                          <button key={kw.id} type="button" onClick={() => toggleSavedKeyword(kw.id)} className={cn('w-full flex items-center justify-between text-left px-3 py-2.5 text-sm transition-colors border-b last:border-0', isSelected ? 'bg-primary/5' : 'hover:bg-muted/50')}>
                            <span className={cn(isSelected && 'font-medium text-primary')}>{kw.name}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </ConditionalBlock>
              )}
              {keywordSource === 'AI_GENERATE' && (
                <ConditionalBlock>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow label={t('automation.builder.numberOfKeywords')}>
                      <Select value={aiKeywordCount} onValueChange={setAiKeywordCount}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">{t('automation.builder.numberOfKeywords3')}</SelectItem><SelectItem value="5">{t('automation.builder.numberOfKeywords5')}</SelectItem><SelectItem value="10">{t('automation.builder.numberOfKeywords10')}</SelectItem><SelectItem value="Custom">{t('automation.builder.custom')}</SelectItem></SelectContent></Select>
                    </FieldRow>
                    {aiKeywordCount === 'Custom' && <FieldRow label={t('automation.builder.customCount')}><Input type="number" value={aiKeywordCustomCount} onChange={(e) => setAiKeywordCustomCount(e.target.value)} placeholder="25" className="h-9" min="1" /></FieldRow>}
                  </div>
                  <FieldRow label={t('automation.builder.keywordGenerationTone')}>
                    <Select value={aiKeywordTone} onValueChange={setAiKeywordTone}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Informational">{t('automation.builder.keywordToneInformational')}</SelectItem><SelectItem value="Commercial">{t('automation.builder.keywordToneCommercial')}</SelectItem><SelectItem value="Transactional">{t('automation.builder.keywordToneTransactional')}</SelectItem><SelectItem value="Navigational">{t('automation.builder.keywordToneNavigational')}</SelectItem><SelectItem value="Conversational">{t('automation.builder.keywordToneConversational')}</SelectItem><SelectItem value="Custom">{t('automation.builder.custom')}</SelectItem></SelectContent></Select>
                  </FieldRow>
                  {aiKeywordTone === 'Custom' && <FieldRow label={t('automation.builder.describeKeywordStyle')}><Textarea value={aiKeywordCustomTone} onChange={(e) => setAiKeywordCustomTone(e.target.value)} placeholder={t('automation.builder.describeKeywordStylePlaceholder')} rows={2} className="text-sm resize-none" /></FieldRow>}
                </ConditionalBlock>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label={t('automation.builder.articleTone')}>
                  <Select value={tone} onValueChange={setTone}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Professional">{t('automation.builder.toneProfessional')}</SelectItem><SelectItem value="Informative">{t('automation.builder.toneInformative')}</SelectItem><SelectItem value="Casual">{t('automation.builder.toneCasual')}</SelectItem><SelectItem value="Friendly">{t('automation.builder.toneFriendly')}</SelectItem><SelectItem value="Expert">{t('automation.builder.toneExpert')}</SelectItem><SelectItem value="Conversational">{t('automation.builder.toneConversational')}</SelectItem><SelectItem value="Custom">{t('automation.builder.custom')}</SelectItem></SelectContent></Select>
                </FieldRow>
                <FieldRow label={t('automation.builder.contentLength')}>
                  <Select value={contentLength} onValueChange={setContentLength}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Short (300-600 words)">{t('automation.builder.lengthShort')}</SelectItem><SelectItem value="Medium (800-1200 words)">{t('automation.builder.lengthMedium')}</SelectItem><SelectItem value="Long (1500-2500 words)">{t('automation.builder.lengthLong')}</SelectItem><SelectItem value="Comprehensive (3000+ words)">{t('automation.builder.lengthComprehensive')}</SelectItem><SelectItem value="Custom">{t('automation.builder.custom')}</SelectItem></SelectContent></Select>
                </FieldRow>
              </div>
              {tone === 'Custom' && <FieldRow label={t('automation.builder.describeWritingStyle')}><Textarea value={customTone} onChange={(e) => setCustomTone(e.target.value)} placeholder={t('automation.builder.describeWritingStylePlaceholder')} rows={2} className="text-sm resize-none" /></FieldRow>}
              {contentLength === 'Custom' && <FieldRow label={t('automation.builder.targetWordCount')}><Input type="number" value={customWordCount} onChange={(e) => setCustomWordCount(e.target.value)} placeholder="2200" className="h-9 w-32" min="1" /></FieldRow>}
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-1">{t('automation.builder.articleStructure')}</h3>
                <p className="text-xs text-muted-foreground mb-3">{t('automation.builder.articleStructureHint')}</p>
                <div className="grid grid-cols-2 gap-1 rounded-lg border bg-card/50 overflow-hidden">
                  {[{ label: t('automation.builder.structureIntro'), val: structIntro, set: setStructIntro }, { label: t('automation.builder.structureToc'), val: structToc, set: setStructToc }, { label: t('automation.builder.structureH2'), val: structH2, set: setStructH2 }, { label: t('automation.builder.structureH3'), val: structH3, set: setStructH3 }, { label: t('automation.builder.structureFaq'), val: structFaq, set: setStructFaq }, { label: t('automation.builder.structureConclusion'), val: structConclusion, set: setStructConclusion }].map((item, i, arr) => (
                    <div key={item.label} className={cn('flex items-center justify-between px-3 py-2.5', i < arr.length - 2 && 'border-b', i % 2 === 0 && 'border-r border-border/50')}>
                      <Label className="text-sm cursor-pointer" onClick={() => item.set(!item.val)}>{item.label}</Label>
                      <Switch checked={item.val} onCheckedChange={item.set} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─────────── STEP 3: SEO + MEDIA ─────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <SectionLabel icon={Sparkles}>{t('automation.builder.seoOptimization')}</SectionLabel>
              <div className="rounded-lg border bg-card/50 overflow-hidden">
                {[{ label: t('automation.builder.seoTitleToggle'), desc: t('automation.builder.seoTitleToggleHint'), val: generateSeoTitle, set: setGenerateSeoTitle }, { label: t('automation.builder.metaDescToggle'), desc: t('automation.builder.metaDescToggleHint'), val: generateMetaDescription, set: setGenerateMetaDescription }, { label: t('automation.builder.urlSlugToggle'), desc: t('automation.builder.urlSlugToggleHint'), val: generateSlug, set: setGenerateSlug }, { label: t('automation.builder.optimizePrimaryKw'), desc: t('automation.builder.optimizePrimaryKwHint'), val: optimizePrimaryKeyword, set: setOptimizePrimaryKeyword }, { label: t('automation.builder.includeSecondaryKw'), val: includeSecondaryKeywords, set: setIncludeSecondaryKeywords }, { label: t('automation.builder.includeSemanticKw'), desc: t('automation.builder.includeSemanticKwHint'), val: includeSemanticKeywords, set: setIncludeSemanticKeywords }, { label: t('automation.builder.generateFaqSection'), desc: t('automation.builder.generateFaqSectionHint'), val: generateFaq, set: setGenerateFaq }, { label: t('automation.builder.generateFaqSchema'), val: generateFaqSchema, set: setGenerateFaqSchema }, { label: t('automation.builder.generateArticleSchema'), val: generateArticleSchema, set: setGenerateArticleSchema }].map(item => <ToggleRow key={item.label} label={item.label} description={item.desc} checked={item.val} onChange={item.set} />)}
              </div>
              <Separator />
              <SectionLabel icon={FolderOpen}>{t('automation.builder.mediaSource')}</SectionLabel>
              <FieldRow label={t('automation.builder.source')}>
                <Select value={mediaSource} onValueChange={(v) => setMediaSource(v as MediaSource)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">{t('automation.builder.sourceNone')}</SelectItem><SelectItem value="MEDIA_LIBRARY">{t('automation.builder.sourceMediaLibrary')}</SelectItem><SelectItem value="AI_GENERATE">{t('automation.builder.sourceAiGenerate')}</SelectItem></SelectContent></Select>
              </FieldRow>
              {mediaSource === 'MEDIA_LIBRARY' && (
                <ConditionalBlock>
                  <FieldRow label={t('automation.builder.selectFolder')}>
                    <Select value={selectedFolderId} onValueChange={(v) => { setSelectedFolderId(v); setSelectedMediaIds([]); }}><SelectTrigger className="h-9"><SelectValue placeholder={t('automation.builder.chooseFolderPlaceholder')} /></SelectTrigger><SelectContent>{mediaFolders.length === 0 ? <SelectItem value="_none" disabled>{t('automation.builder.noFolders')}</SelectItem> : mediaFolders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select>
                  </FieldRow>
                  {selectedFolderId && mediaItems.length > 0 && (
                    <>
                      <FieldRow label={t('automation.builder.imageSelection')}>
                        <Select value={imageSelectionMode} onValueChange={(v) => setImageSelectionMode(v as 'ALL' | 'RANDOM' | 'AI_CHOOSE')}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">{t('automation.builder.imageSelectionAll')}</SelectItem><SelectItem value="RANDOM">{t('automation.builder.imageSelectionRandom')}</SelectItem><SelectItem value="AI_CHOOSE">{t('automation.builder.imageSelectionAiChoose')}</SelectItem></SelectContent></Select>
                      </FieldRow>
                      {imageSelectionMode !== 'ALL' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">{t('automation.builder.selectImages')}</Label>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                            {mediaItems.map(item => <button key={item.id} type="button" onClick={() => toggleMediaSelection(item.id)} className={cn('relative aspect-square rounded-lg overflow-hidden border-2 transition-all', selectedMediaIds.includes(item.id) ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50')}><img src={item.thumbnailUrl || item.url} alt={item.filename} className="h-full w-full object-cover" /></button>)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </ConditionalBlock>
              )}
              {mediaSource === 'AI_GENERATE' && (
                <ConditionalBlock>
                  <ToggleRow label={t('automation.builder.generateFeaturedImage')} checked={generateFeaturedImage} onChange={setGenerateFeaturedImage} />
                  <ToggleRow label={t('automation.builder.generateSectionImages')} checked={generateSectionImages} onChange={setGenerateSectionImages} />
                  {(generateFeaturedImage || generateSectionImages) && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <FieldRow label={t('automation.builder.numberOfImages')}><Select value={imageCount} onValueChange={setImageCount}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="5">5</SelectItem><SelectItem value="Custom">{t('automation.builder.custom')}</SelectItem></SelectContent></Select></FieldRow>
                        {imageCount === 'Custom' && <FieldRow label={t('automation.builder.customCount')}><Input type="number" value={customImageCount} onChange={(e) => setCustomImageCount(e.target.value)} placeholder="7" className="h-9" min="1" /></FieldRow>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FieldRow label={t('automation.builder.imageStyle')}><Select value={imageStyle} onValueChange={setImageStyle}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Realistic">{t('automation.builder.imageStyleRealistic')}</SelectItem><SelectItem value="Illustration">{t('automation.builder.imageStyleIllustration')}</SelectItem><SelectItem value="3D">{t('automation.builder.imageStyle3d')}</SelectItem><SelectItem value="Minimal">{t('automation.builder.imageStyleMinimal')}</SelectItem><SelectItem value="Professional">{t('automation.builder.imageStyleProfessional')}</SelectItem><SelectItem value="Editorial">{t('automation.builder.imageStyleEditorial')}</SelectItem><SelectItem value="Custom">{t('automation.builder.custom')}</SelectItem></SelectContent></Select></FieldRow>
                        <FieldRow label={t('automation.builder.aspectRatio')}><Select value={aspectRatio} onValueChange={setAspectRatio}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="16:9">{t('automation.builder.aspect16x9')}</SelectItem><SelectItem value="4:3">{t('automation.builder.aspect4x3')}</SelectItem><SelectItem value="1:1">{t('automation.builder.aspect1x1')}</SelectItem><SelectItem value="3:4">{t('automation.builder.aspect3x4')}</SelectItem><SelectItem value="9:16">{t('automation.builder.aspect9x16')}</SelectItem><SelectItem value="Custom">{t('automation.builder.custom')}</SelectItem></SelectContent></Select></FieldRow>
                      </div>
                      {imageStyle === 'Custom' && <FieldRow label={t('automation.builder.describeImageStyle')}><Input value={customImageStyle} onChange={(e) => setCustomImageStyle(e.target.value)} placeholder={t('automation.builder.describeImageStylePlaceholder')} className="h-9" /></FieldRow>}
                      {aspectRatio === 'Custom' && <FieldRow label={t('automation.builder.customRatio')}><Input value={customAspectRatio} onChange={(e) => setCustomAspectRatio(e.target.value)} placeholder="21:9" className="h-9 w-24" /></FieldRow>}
                      <FieldRow label={t('automation.builder.imageGenerationTone')}><Select value={imageTone} onValueChange={setImageTone}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Modern">{t('automation.builder.imageToneModern')}</SelectItem><SelectItem value="Professional">{t('automation.builder.imageStyleProfessional')}</SelectItem><SelectItem value="Minimal">{t('automation.builder.imageStyleMinimal')}</SelectItem><SelectItem value="Creative">{t('automation.builder.imageToneCreative')}</SelectItem><SelectItem value="Premium">{t('automation.builder.imageTonePremium')}</SelectItem><SelectItem value="Custom">{t('automation.builder.custom')}</SelectItem></SelectContent></Select></FieldRow>
                      {imageTone === 'Custom' && <FieldRow label={t('automation.builder.describeImageTone')}><Input value={customImageTone} onChange={(e) => setCustomImageTone(e.target.value)} placeholder={t('automation.builder.describeImageTonePlaceholder')} className="h-9" /></FieldRow>}
                      <FieldRow label={t('automation.builder.additionalImageInstructions')} hint={t('automation.builder.hintOptional')}><Textarea value={imagePromptInstructions} onChange={(e) => setImagePromptInstructions(e.target.value)} placeholder={t('automation.builder.additionalImageInstructionsPlaceholder')} rows={2} className="text-sm resize-none" /></FieldRow>
                    </>
                  )}
                </ConditionalBlock>
              )}
              {mediaSource !== 'NONE' && (
                <>
                  <Separator />
                  <FieldRow label={t('automation.builder.imagePlacement')}>
                    <Select value={imagePlacement} onValueChange={(v) => setImagePlacement(v as ImagePlacement)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AI_AUTOMATIC">{t('automation.builder.placementAiAuto')}</SelectItem><SelectItem value="AFTER_INTRO">{t('automation.builder.placementAfterIntro')}</SelectItem><SelectItem value="BEFORE_FIRST_H2">{t('automation.builder.placementBeforeFirstH2')}</SelectItem><SelectItem value="AFTER_EACH_H2">{t('automation.builder.placementAfterEachH2')}</SelectItem><SelectItem value="MANUAL_MAPPING">{t('automation.builder.placementManualMapping')}</SelectItem></SelectContent></Select>
                  </FieldRow>
                </>
              )}
            </div>
          )}

          {/* ─────────── STEP 4: ACTION ─────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <SectionLabel icon={Send}>{t('automation.builder.finalAction')}</SectionLabel>
              <FieldRow label={t('automation.builder.finalActionQuestion')}>
                <Select value={finalAction} onValueChange={setFinalAction}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DRAFT">{t('automation.builder.actionSaveAsDraft')}</SelectItem><SelectItem value="REVIEW">{t('automation.builder.actionSendToReview')}</SelectItem><SelectItem value="PUBLISH">{t('automation.builder.actionPublishImmediately')}</SelectItem><SelectItem value="SCHEDULE">{t('automation.builder.actionSchedule')}</SelectItem></SelectContent></Select>
              </FieldRow>
              {finalAction === 'SCHEDULE' && (
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label={t('automation.builder.publicationDate')}><Input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="h-10" /></FieldRow>
                  <FieldRow label={t('automation.builder.publicationTime')}><Input type="time" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} className="h-10" /></FieldRow>
                </div>
              )}
              <Separator />
              {/* Enhanced Workflow Preview */}
              <div className="rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10 p-5 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('automation.builder.workflowPreview')}</p>
                <div className="space-y-3">
                  {/* Trigger */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 shrink-0">
                      <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-medium">{triggerType === 'SCHEDULED' ? t('automation.builder.previewEveryAt').replace('{freq}', frequency.toLowerCase()).replace('{time}', time) : t('automation.builder.previewManualTrigger')}</p>
                    </div>
                  </div>
                  <div className="ml-4 h-4 w-px bg-border" />

                  {/* Content */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-900/20 shrink-0">
                      <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{topic || t('automation.builder.previewUntitled')}</p>
                      <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                        <span className="text-muted-foreground/60">{t('automation.builder.previewKeywordsLabel')}</span>
                        <span className="text-muted-foreground">{kwPreview}</span>
                        <span className="text-muted-foreground/60">{t('automation.builder.previewToneLabel')}</span>
                        <span className="text-muted-foreground">{tone === 'Custom' ? customTone : tone}</span>
                        <span className="text-muted-foreground/60">{t('automation.builder.previewLengthLabel')}</span>
                        <span className="text-muted-foreground">{contentLength === 'Custom' ? `${customWordCount} ${t('automation.builder.previewWordsUnit')}` : contentLength}</span>
                        <span className="text-muted-foreground/60">{t('automation.builder.previewStructureLabel')}</span>
                        <span className="text-muted-foreground">{structParts.join(' + ') || t('automation.builder.previewNone')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 h-4 w-px bg-border" />

                  {/* SEO + Media */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/20 shrink-0">
                      <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t('automation.builder.previewSeoMedia')}</p>
                      <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                        <span className="text-muted-foreground/60">{t('automation.builder.previewSeoLabel')}</span>
                        <span className="text-muted-foreground">{seoParts.join(', ') || t('automation.builder.previewNone')}</span>
                        <span className="text-muted-foreground/60">{t('automation.builder.previewMediaLabel')}</span>
                        <span className="text-muted-foreground">{mediaPreview}</span>
                        <span className="text-muted-foreground/60">{t('automation.builder.previewPlacementLabel')}</span>
                        <span className="text-muted-foreground">{placementLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 h-4 w-px bg-border" />

                  {/* Final Action */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 shrink-0">
                      <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-medium">{finalAction === 'DRAFT' ? t('automation.builder.actionSaveAsDraft') : finalAction === 'REVIEW' ? t('automation.builder.actionSendToReview') : finalAction === 'PUBLISH' ? t('automation.builder.actionPublishImmediately') : `${t('automation.builder.actionSchedule')}: ${publishDate || t('automation.builder.previewScheduleTbd')} ${publishTime || ''}`}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Navigation — integrated with the page, no container */}
      <div className="flex items-center justify-end gap-4 pt-1">
        {(step > (isGenerateMode ? 2 : 1)) && (
          <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-1.5 mr-auto">
            <ChevronLeft className="h-4 w-4" /> {t('automation.builder.backButton')}
          </Button>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">{isGenerateMode ? `${t('automation.builder.stepLabel')} ${step - 1} ${t('automation.builder.of3')}` : `${t('automation.builder.stepLabel')} ${step} ${t('automation.builder.of4')}`}</span>
          <Button variant="ghost" onClick={() => navigate(isGenerateMode ? 'content' : 'automation')}>{t('automation.builder.cancel')}</Button>
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed} className="gap-1.5">
              {t('automation.builder.next')} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || generating || !canProceed} className="gap-1.5">
              {(createMutation.isPending || generating) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isGenerateMode ? (generating ? t('automation.builder.generating') : t('automation.builder.generateArticleButton')) : t('automation.builder.createAutomationButton')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
