'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Users,
  Mail,
  Loader2,
  Eye,
  RotateCcw,
  Ban,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DataTable,
  useDataTable,
  ColumnDefHelper,
  StatusBadge,
  PageHeader,
  ConfirmDialog,
} from '@/components/patterns';
import { getApi, postApi, deleteApi, patchApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/lib/i18n';
import { formatDate, cn } from '@/lib/utils';
import type {
  SubscriberStatus,
  CampaignStatus,
} from '@/shared/types';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSiteStore } from '@/lib/stores/site-store';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

// -------------------- Subscriber Types --------------------

interface SubscriberRow {
  id: string;
  email: string;
  name?: string;
  status: SubscriberStatus;
  source?: string;
  subscribedAt: string;
}

// -------------------- Campaign Types --------------------

interface CampaignTemplate {
  id: string;
  name: string;
  subject?: string;
  category?: string;
}

interface CampaignRow {
  id: string;
  name: string;
  subject: string;
  contentOverride?: string | null;
  templateId?: string | null;
  template?: CampaignTemplate | null;
  status: CampaignStatus;
  recipientCount: number;
  openRate?: number;
  clickRate?: number;
  scheduledAt?: string | null;
  sentAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

// -------------------- Campaign Create Form --------------------

interface CampaignForm {
  name: string;
  subject: string;
  templateId: string;
  contentOverride: string;
  scheduledAt: string;
  audience: 'all' | 'selected';
  selectedSubscriberIds: string[];
}

const INITIAL_CAMPAIGN_FORM: CampaignForm = {
  name: '',
  subject: '',
  templateId: '',
  contentOverride: '',
  scheduledAt: '',
  audience: 'all',
  selectedSubscriberIds: [],
};

// -------------------- Campaign Status Options --------------------

const CAMPAIGN_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Sending', value: 'SENDING' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

// -------------------- Component --------------------

type NewsletterSubPage = 'subscribers' | 'campaigns';

export function NewsletterPage() {
  const queryClient = useQueryClient();
  const { t } = useT();
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const navigate = useNavigationStore((s) => s.navigate);

  const activeTab: NewsletterSubPage =
    currentSubPage === 'create' || currentSubPage === 'campaigns'
      ? 'campaigns'
      : (currentSubPage as NewsletterSubPage) || 'subscribers';

  const handleTabChange = (value: string) => {
    navigate('newsletter', null, value);
  };

  useEffect(() => {
    if (!currentSubPage) {
      navigate('newsletter', null, 'subscribers');
    }
  }, [currentSubPage, navigate]);

  // ======================== SUBSCRIBERS ========================

  const subTable = useDataTable({
    initialSortField: 'subscribedAt',
    initialSortOrder: 'desc',
    initialPageSize: DEFAULT_PAGE_SIZE,
  });

  const subQueryParams = useMemo(
    () => ({
      page: subTable.currentPage,
      pageSize: subTable.pageSize,
      sort: subTable.sortField,
      order: subTable.sortOrder,
      search: subTable.searchValue || undefined,
    }),
    [subTable.currentPage, subTable.pageSize, subTable.sortField, subTable.sortOrder, subTable.searchValue],
  );

  const { data: subRaw, isLoading: subLoading } = useQuery({
    queryKey: queryKeys.newsletterSubscribers.list(subQueryParams),
    queryFn: () => getApi<{ data: SubscriberRow[]; meta: { pagination: { page: number; pageSize: number; total: number; totalPages: number } } }>('/api/subscribers', subQueryParams, { raw: true }),
    staleTime: 10_000,
  });

  const subscribers = (Array.isArray(subRaw?.data) ? subRaw.data : []) as SubscriberRow[];
  const totalSubscribers = subRaw?.meta?.pagination?.total ?? 0;

  const subscriberColumns = useMemo<ColumnDef<SubscriberRow>[]>(
    () => [
      ColumnDefHelper.textColumn<SubscriberRow>({
        id: 'email',
        header: t('common.email'),
        accessorKey: 'email',
        className: 'font-medium',
      }),
      ColumnDefHelper.textColumn<SubscriberRow>({
        id: 'name',
        header: t('common.name'),
        accessorKey: 'name',
        enableSorting: false,
      }),
      ColumnDefHelper.statusColumn<SubscriberRow>({
        id: 'status',
        header: t('common.status'),
        accessorKey: 'status',
        renderStatus: (status) => <StatusBadge status={status} size="sm" />,
      }),
      ColumnDefHelper.textColumn<SubscriberRow>({
        id: 'source',
        header: t('newsletter.source'),
        accessorKey: 'source',
        enableSorting: false,
      }),
      ColumnDefHelper.dateColumn<SubscriberRow>({
        id: 'subscribedAt',
        header: t('newsletter.subscribed'),
        accessorKey: 'subscribedAt',
        format: (d) => formatDate(d),
      }),
    ],
    [t],
  );

  // ======================== CAMPAIGNS ========================

  const campTable = useDataTable({
    initialSortField: 'createdAt',
    initialSortOrder: 'desc',
    initialPageSize: DEFAULT_PAGE_SIZE,
  });
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all');
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<CampaignRow | null>(null);

  const campQueryParams = useMemo(
    () => ({
      page: campTable.currentPage,
      pageSize: campTable.pageSize,
      sort: campTable.sortField,
      order: campTable.sortOrder,
      ...(campaignStatusFilter !== 'all' ? { status: campaignStatusFilter } : {}),
    }),
    [campTable.currentPage, campTable.pageSize, campTable.sortField, campTable.sortOrder, campaignStatusFilter],
  );

  const { data: campRaw, isLoading: campLoading } = useQuery({
    queryKey: queryKeys.newsletterCampaigns.list(campQueryParams),
    queryFn: () => getApi<{ data: CampaignRow[]; meta: { pagination: { page: number; pageSize: number; total: number; totalPages: number } } }>('/api/campaigns', campQueryParams, { raw: true }),
    staleTime: 10_000,
  });

  const campaigns = (Array.isArray(campRaw?.data) ? campRaw.data : []) as CampaignRow[];
  const totalCampaigns = campRaw?.meta?.pagination?.total ?? 0;

  // Fetch email templates for the Create/Edit Campaign dialog's template selector.
  // Loads ALL ENABLED templates dynamically from the Email Templates API —
  // no hardcoded list. The API supports filtering by status + category.
  // We fetch all ENABLED templates and filter to campaign-eligible categories
  // (MARKETING, NEWSLETTER, and any non-TRANSACTIONAL/non-SYSTEM categories)
  // on the client side so the dropdown always reflects the latest templates.
  const CAMPAIGN_ELIGIBLE_CATEGORIES = new Set(['MARKETING', 'NEWSLETTER', 'CUSTOMER_EMAILS']);

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['email-templates', 'campaign-eligible'],
    queryFn: () => getApi<{ id: string; name: string; subject?: string; category?: string }[]>(
      '/api/email-templates?status=ENABLED&pageSize=100',
    ),
    staleTime: 30_000,
  });

  // Filter to campaign-eligible categories (MARKETING, NEWSLETTER, CUSTOMER_EMAILS).
  // TRANSACTIONAL, SYSTEM, AUTHENTICATION, NOTIFICATIONS, BILLING templates are
  // not appropriate for manual campaign sending.
  const emailTemplates = useMemo(
    () => (templatesData ?? []).filter(
      (tpl) => !tpl.category || CAMPAIGN_ELIGIBLE_CATEGORIES.has(tpl.category),
    ),
    [templatesData, CAMPAIGN_ELIGIBLE_CATEGORIES],
  );

  // Fetch eligible subscribers (status=SUBSCRIBED) for the audience selector
  // + live recipient count preview.
  const { data: eligibleSubsData } = useQuery({
    queryKey: ['campaigns', 'eligible-subscribers'],
    queryFn: () => getApi<{ id: string; email: string; name?: string }[]>('/api/campaigns/eligible-subscribers'),
    staleTime: 30_000,
  });
  const eligibleSubscribers = eligibleSubsData ?? [];
  const eligibleCount = eligibleSubscribers.length;

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.newsletterCampaigns.all });
      setDeleteCampaignTarget(null);
      toast.success(t('newsletter.campaignDeleted'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('newsletter.deleteCampaignFailed'));
    },
  });

  // Duplicate campaign mutation
  const duplicateCampaignMutation = useMutation({
    mutationFn: (id: string) => postApi(`/api/campaigns/${id}/duplicate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.newsletterCampaigns.all });
      toast.success(t('newsletter.campaignDuplicated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('newsletter.duplicateFailed'));
    },
  });

  const isAllSites = useSiteStore((s) => s.isAllSites());

  // Create campaign dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(INITIAL_CAMPAIGN_FORM);
  const authUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isAllSites) {
      if (createOpen) setCreateOpen(false);
      if (currentSubPage === 'create') {
        navigate('newsletter', null, 'campaigns');
      }
    }
  }, [isAllSites, createOpen, currentSubPage, navigate]);

  useEffect(() => {
    if (!isAllSites && currentSubPage === 'create') {
      setCreateOpen(true);
    }
  }, [currentSubPage, isAllSites]);

  // Compute the live recipient count for the Create Campaign dialog
  // (must be after campaignForm state declaration)
  const liveRecipientCount = campaignForm.audience === 'all'
    ? eligibleCount
    : campaignForm.selectedSubscriberIds.length;

  const createCampaignMutation = useMutation({
    mutationFn: (payload: CampaignForm) => {
      // Build the API payload — audience is 'all' or an array of IDs
      const apiPayload: Record<string, unknown> = {
        name: payload.name,
        subject: payload.subject,
        templateId: payload.templateId,
        contentOverride: payload.contentOverride || '',
        scheduledAt: payload.scheduledAt || '',
        createdById: authUser?.id,
      };
      if (payload.audience === 'all') {
        apiPayload.audience = 'all';
      } else {
        apiPayload.audience = payload.selectedSubscriberIds;
      }
      return postApi('/api/campaigns', apiPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.newsletterCampaigns.all });
      setCreateOpen(false);
      setCampaignForm(INITIAL_CAMPAIGN_FORM);
      toast.success(t('newsletter.campaignCreated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('newsletter.createFailed'));
    },
  });

  // Send campaign now (Draft → Sending → Sent/Failed)
  const sendCampaignMutation = useMutation({
    mutationFn: (id: string) => postApi(`/api/campaigns/${id}/send`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.newsletterCampaigns.all });
      toast.success(t('newsletter.campaignSent'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('newsletter.sendFailed'));
    },
  });

  // Cancel a scheduled campaign
  const cancelCampaignMutation = useMutation({
    mutationFn: (id: string) => postApi(`/api/campaigns/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.newsletterCampaigns.all });
      toast.success(t('newsletter.campaignCancelled'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('newsletter.cancelFailed'));
    },
  });

  // Retry a failed campaign
  const retryCampaignMutation = useMutation({
    mutationFn: (id: string) => postApi(`/api/campaigns/${id}/retry`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.newsletterCampaigns.all });
      toast.success(t('newsletter.campaignRetryStarted'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('newsletter.retryFailed'));
    },
  });

  // View campaign modal state
  const [viewCampaign, setViewCampaign] = useState<CampaignRow | null>(null);

  // Edit campaign modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editSchedulePopoverOpen, setEditSchedulePopoverOpen] = useState(false);
  const [editForm, setEditForm] = useState<CampaignForm>(INITIAL_CAMPAIGN_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Update campaign mutation (for Edit)
  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CampaignForm> }) =>
      patchApi(`/api/campaigns/${id}`, {
        name: data.name,
        subject: data.subject,
        templateId: data.templateId,
        contentOverride: data.contentOverride || '',
        scheduledAt: data.scheduledAt || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.newsletterCampaigns.all });
      setEditOpen(false);
      setEditingId(null);
      toast.success(t('newsletter.campaignUpdated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('newsletter.updateFailed'));
    },
  });

  // Open Edit modal with existing campaign data
  const openEditModal = useCallback((campaign: CampaignRow) => {
    setEditForm({
      name: campaign.name,
      subject: campaign.subject,
      templateId: campaign.templateId || '',
      contentOverride: campaign.contentOverride || '',
      scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : '',
      audience: 'all',
      selectedSubscriberIds: [],
    });
    setEditingId(campaign.id);
    setEditOpen(true);
  }, []);

  const campaignColumns = useMemo<ColumnDef<CampaignRow>[]>(
    () => [
      ColumnDefHelper.textColumn<CampaignRow>({
        id: 'subject',
        header: t('newsletter.subject'),
        accessorKey: 'subject',
        truncate: 50,
        className: 'font-medium',
      }),
      ColumnDefHelper.statusColumn<CampaignRow>({
        id: 'status',
        header: t('common.status'),
        accessorKey: 'status',
        renderStatus: (status) => <StatusBadge status={status} size="sm" />,
      }),
      {
        id: 'recipientCount',
        header: t('newsletter.recipients'),
        size: 110,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{row.original.recipientCount.toLocaleString()}</span>
        ),
      } as ColumnDef<CampaignRow>,
      {
        id: 'openRate',
        header: t('newsletter.openRate'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => {
          const rate = row.original.openRate;
          if (rate === undefined || rate === null) return <span className="text-muted-foreground">—</span>;
          return (
            <span className={cn(
              'text-sm tabular-nums font-medium',
              rate >= 30 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
            )}>
              {rate.toFixed(1)}%
            </span>
          );
        },
      } as ColumnDef<CampaignRow>,
      {
        id: 'clickRate',
        header: t('newsletter.clickRate'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => {
          const rate = row.original.clickRate;
          if (rate === undefined || rate === null) return <span className="text-muted-foreground">—</span>;
          return (
            <span className={cn(
              'text-sm tabular-nums font-medium',
              rate >= 5 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
            )}>
              {rate.toFixed(1)}%
            </span>
          );
        },
      } as ColumnDef<CampaignRow>,
      ColumnDefHelper.dateColumn<CampaignRow>({
        id: 'scheduledAt',
        header: t('newsletter.scheduled'),
        accessorKey: 'scheduledAt',
        format: (d) => formatDate(d),
      }),
      ColumnDefHelper.actionColumn<CampaignRow>({
        id: 'actions',
        render: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t('common.actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* DRAFT: Edit, Delete */}
              {row.status === 'DRAFT' && (
                <>
                  <DropdownMenuItem onClick={() => openEditModal(row)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteCampaignTarget(row)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </>
              )}

              {/* SCHEDULED: View, Edit, Cancel, Delete */}
              {row.status === 'SCHEDULED' && (
                <>
                  <DropdownMenuItem onClick={() => setViewCampaign(row)}>
                    <Eye className="h-4 w-4 mr-2" />
                    {t('common.view')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEditModal(row)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => cancelCampaignMutation.mutate(row.id)}
                    disabled={cancelCampaignMutation.isPending}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    {t('common.cancel')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteCampaignTarget(row)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </>
              )}

              {/* SENDING: View */}
              {row.status === 'SENDING' && (
                <DropdownMenuItem onClick={() => setViewCampaign(row)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t('common.view')}
                </DropdownMenuItem>
              )}

              {/* SENT: View, Duplicate */}
              {row.status === 'SENT' && (
                <>
                  <DropdownMenuItem onClick={() => setViewCampaign(row)}>
                    <Eye className="h-4 w-4 mr-2" />
                    {t('common.view')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicateCampaignMutation.mutate(row.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('newsletter.duplicate')}
                  </DropdownMenuItem>
                </>
              )}

              {/* FAILED: Retry, Edit, View, Delete */}
              {row.status === 'FAILED' && (
                <>
                  <DropdownMenuItem
                    onClick={() => retryCampaignMutation.mutate(row.id)}
                    disabled={retryCampaignMutation.isPending}
                  >
                    {retryCampaignMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                    {t('common.retry')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEditModal(row)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewCampaign(row)}>
                    <Eye className="h-4 w-4 mr-2" />
                    {t('common.view')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteCampaignTarget(row)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </>
              )}

              {/* CANCELLED: Duplicate, Delete */}
              {row.status === 'CANCELLED' && (
                <>
                  <DropdownMenuItem onClick={() => duplicateCampaignMutation.mutate(row.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('newsletter.duplicate')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteCampaignTarget(row)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    [duplicateCampaignMutation, cancelCampaignMutation, retryCampaignMutation, t],
  );

  // Campaign filter content
  const campaignFilterContent = (
    <Select
      value={campaignStatusFilter}
      onValueChange={(v) => {
        setCampaignStatusFilter(v);
        campTable.setCurrentPage(1);
      }}
    >
      <SelectTrigger size="sm" className="w-[140px] h-9">
        <SelectValue placeholder={t('newsletter.allStatuses')} />
      </SelectTrigger>
      <SelectContent>
        {CAMPAIGN_STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.value === 'all'
              ? t('newsletter.allStatuses')
              : opt.value === 'DRAFT'
                ? t('newsletter.statusDraft')
                : opt.value === 'SCHEDULED'
                  ? t('newsletter.statusScheduled')
                  : opt.value === 'SENDING'
                    ? t('newsletter.statusSending')
                    : opt.value === 'SENT'
                      ? t('newsletter.statusSent')
                      : opt.value === 'FAILED'
                        ? t('newsletter.statusFailed')
                        : t('newsletter.statusCancelled')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title.newsletters')}
        description={t('newsletter.pageDescription')}
        breadcrumbs={false}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="subscribers">
            <Users className="h-4 w-4 mr-1" />
            {t('newsletter.subscribers')}
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Mail className="h-4 w-4 mr-1" />
            {t('newsletter.campaigns')}
          </TabsTrigger>
        </TabsList>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="mt-4">
          <DataTable
            columns={subscriberColumns}
            data={subscribers}
            isLoading={subLoading}
            totalItems={totalSubscribers}
            pageSize={subTable.pageSize}
            currentPage={subTable.currentPage}
            onPageChange={(p) => subTable.setCurrentPage(p)}
            onSortChange={(field, order) => subTable.setSortField(field, order)}
            sortField={subTable.sortField}
            sortOrder={subTable.sortOrder}
            searchPlaceholder={t('newsletter.searchByEmail')}
            searchValue={subTable.searchValue}
            onSearch={(v) => { subTable.setSearchValue(v); subTable.setCurrentPage(1); }}
            getRowId={(row) => row.id}
            emptyMessage={t('newsletter.noSubscribers')}
          />
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-4">
          {!isAllSites && (
            <div className="flex justify-end mb-0">
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                setCreateOpen(open);
                if (!open && currentSubPage === 'create') {
                  navigate('newsletter', null, 'campaigns');
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newsletter.createCampaign')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('newsletter.createCampaign')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Campaign Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="camp-name">{t('newsletter.campaignName')} <span className="text-destructive">*</span></Label>
                    <Input
                      id="camp-name"
                      placeholder={t('newsletter.campaignNamePlaceholder')}
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  {/* Email Template Selector — dynamically loads from Email Templates API */}
                  <div className="space-y-1.5">
                    <Label htmlFor="camp-template">{t('newsletter.emailTemplate')} <span className="text-destructive">*</span></Label>
                    {templatesLoading ? (
                      <div className="flex items-center gap-2 h-9 px-3 rounded-md border text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {t('newsletter.loadingTemplates')}
                      </div>
                    ) : emailTemplates.length === 0 ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                        {t('newsletter.noTemplatesHint')}
                      </div>
                    ) : (
                      <Select
                        value={campaignForm.templateId}
                        onValueChange={(v) => setCampaignForm((f) => ({ ...f, templateId: v }))}
                      >
                        <SelectTrigger id="camp-template">
                          <SelectValue placeholder={t('newsletter.selectTemplate')} />
                        </SelectTrigger>
                        <SelectContent>
                          {emailTemplates.map((tpl) => (
                            <SelectItem key={tpl.id} value={tpl.id}>
                              {tpl.name}{tpl.category ? ` (${tpl.category})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Subject Line */}
                  <div className="space-y-1.5">
                    <Label htmlFor="camp-subject">{t('newsletter.subjectLine')} <span className="text-destructive">*</span></Label>
                    <Input
                      id="camp-subject"
                      placeholder={t('newsletter.subjectPlaceholder')}
                      value={campaignForm.subject}
                      onChange={(e) => setCampaignForm((f) => ({ ...f, subject: e.target.value }))}
                    />
                  </div>

                  {/* Content Override (optional) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="camp-content">{t('newsletter.contentOverride')} <span className="text-muted-foreground font-normal">{t('newsletter.optional')}</span></Label>
                    <Textarea
                      id="camp-content"
                      placeholder={t('newsletter.contentOverridePlaceholder')}
                      rows={3}
                      value={campaignForm.contentOverride}
                      onChange={(e) => setCampaignForm((f) => ({ ...f, contentOverride: e.target.value }))}
                    />
                  </div>

                  {/* Recipients */}
                  <div className="space-y-1.5">
                    <Label>{t('newsletter.recipients')} <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="audience"
                          checked={campaignForm.audience === 'all'}
                          onChange={() => setCampaignForm((f) => ({ ...f, audience: 'all' }))}
                          className="h-4 w-4 accent-black dark:accent-white cursor-pointer"
                        />
                        <span className="text-sm">{t('newsletter.allSubscribed')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="audience"
                          checked={campaignForm.audience === 'selected'}
                          onChange={() => setCampaignForm((f) => ({ ...f, audience: 'selected' }))}
                          className="h-4 w-4 accent-black dark:accent-white cursor-pointer"
                        />
                        <span className="text-sm">{t('newsletter.selectSpecific')}</span>
                      </label>
                    </div>

                    {/* Live recipient count */}
                    <div className="rounded-md bg-muted/50 px-3 py-1.5 text-sm">
                      <strong className="text-foreground">{liveRecipientCount}</strong>
                      <span className="text-muted-foreground"> {liveRecipientCount !== 1 ? t('newsletter.subscribersPlural') : t('newsletter.subscriberSingular')} {t(liveRecipientCount !== 1 ? 'newsletter.willReceivePlural' : 'newsletter.willReceiveSingular')}</span>
                    </div>

                    {/* Selected subscribers list (only when audience=selected) */}
                    {campaignForm.audience === 'selected' && (
                      <div className="border rounded-md max-h-48 overflow-y-auto">
                        {eligibleSubscribers.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">{t('newsletter.noEligibleSubscribers')}</p>
                        ) : (
                          eligibleSubscribers.map((sub) => (
                            <label key={sub.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30 cursor-pointer border-b last:border-b-0">
                              <Checkbox
                                checked={campaignForm.selectedSubscriberIds.includes(sub.id)}
                                onCheckedChange={(checked) => {
                                  setCampaignForm((f) => ({
                                    ...f,
                                    selectedSubscriberIds: checked
                                      ? [...f.selectedSubscriberIds, sub.id]
                                      : f.selectedSubscriberIds.filter((id) => id !== sub.id),
                                  }));
                                }}
                              />
                              <span className="text-sm truncate">{sub.name || sub.email}</span>
                              {sub.name && <span className="text-xs text-muted-foreground truncate">{sub.email}</span>}
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Schedule (optional) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="camp-schedule">
                      {t('newsletter.schedule')} <span className="text-muted-foreground font-normal">{t('newsletter.optional')}</span>
                    </Label>
                    <Popover open={schedulePopoverOpen} onOpenChange={setSchedulePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="camp-schedule"
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-between text-left font-normal h-9 px-3',
                            !campaignForm.scheduledAt && 'text-muted-foreground'
                          )}
                        >
                          <span>
                            {campaignForm.scheduledAt && !isNaN(new Date(campaignForm.scheduledAt).getTime())
                              ? format(new Date(campaignForm.scheduledAt), "PPP 'at' HH:mm")
                              : (t('newsletter.selectDateTime') || 'mm/dd/yyyy --:-- --')}
                          </span>
                          <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            campaignForm.scheduledAt && !isNaN(new Date(campaignForm.scheduledAt).getTime())
                              ? new Date(campaignForm.scheduledAt)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (!date) {
                              setCampaignForm((f) => ({ ...f, scheduledAt: '' }));
                              return;
                            }
                            const current = campaignForm.scheduledAt ? new Date(campaignForm.scheduledAt) : null;
                            const h = current && !isNaN(current.getTime()) ? current.getHours() : 9;
                            const m = current && !isNaN(current.getTime()) ? current.getMinutes() : 0;
                            date.setHours(h, m, 0, 0);
                            setCampaignForm((f) => ({
                              ...f,
                              scheduledAt: format(date, "yyyy-MM-dd'T'HH:mm"),
                            }));
                          }}
                          initialFocus
                        />
                        <div className="border-t border-border/60 pt-2.5 mt-2 flex items-center justify-between gap-2 px-1">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              type="time"
                              value={
                                campaignForm.scheduledAt && !isNaN(new Date(campaignForm.scheduledAt).getTime())
                                  ? format(new Date(campaignForm.scheduledAt), 'HH:mm')
                                  : '09:00'
                              }
                              onChange={(e) => {
                                const timeVal = e.target.value;
                                if (!timeVal) return;
                                const [h, m] = timeVal.split(':').map(Number);
                                const baseDate =
                                  campaignForm.scheduledAt && !isNaN(new Date(campaignForm.scheduledAt).getTime())
                                    ? new Date(campaignForm.scheduledAt)
                                    : new Date();
                                baseDate.setHours(h, m, 0, 0);
                                setCampaignForm((f) => ({
                                  ...f,
                                  scheduledAt: format(baseDate, "yyyy-MM-dd'T'HH:mm"),
                                }));
                              }}
                              className="h-8 w-24 text-xs font-mono"
                            />
                          </div>
                          {campaignForm.scheduledAt && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setCampaignForm((f) => ({ ...f, scheduledAt: '' }));
                              }}
                            >
                              {t('common.clear') || 'Clear'}
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={() => createCampaignMutation.mutate(campaignForm)}
                    disabled={
                      createCampaignMutation.isPending ||
                      !campaignForm.name ||
                      !campaignForm.subject ||
                      !campaignForm.templateId ||
                      liveRecipientCount === 0 ||
                      (campaignForm.audience === 'selected' && campaignForm.selectedSubscriberIds.length === 0)
                    }
                  >
                    {createCampaignMutation.isPending ? t('newsletter.creating') : t('newsletter.createCampaign')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          )}

          <DataTable
            columns={campaignColumns}
            data={campaigns}
            isLoading={campLoading}
            totalItems={totalCampaigns}
            pageSize={campTable.pageSize}
            currentPage={campTable.currentPage}
            onPageChange={(p) => campTable.setCurrentPage(p)}
            onSortChange={(field, order) => campTable.setSortField(field, order)}
            sortField={campTable.sortField}
            sortOrder={campTable.sortOrder}
            filterContent={campaignFilterContent}
            getRowId={(row) => row.id}
            emptyMessage={t('newsletter.noCampaigns')}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Campaign Confirmation */}
      <ConfirmDialog
        open={!!deleteCampaignTarget}
        onOpenChange={(open) => !open && setDeleteCampaignTarget(null)}
        title={t('newsletter.deleteCampaign')}
        description={
          deleteCampaignTarget
            ? `${t('newsletter.deleteConfirmPrefix')}${deleteCampaignTarget.name}${t('newsletter.deleteConfirmSuffix')}`
            : undefined
        }
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => {
          if (deleteCampaignTarget) deleteCampaignMutation.mutate(deleteCampaignTarget.id);
        }}
        isLoading={deleteCampaignMutation.isPending}
      />

      {/* View Campaign Modal (read-only) */}
      <Dialog open={!!viewCampaign} onOpenChange={(open) => !open && setViewCampaign(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('newsletter.campaignDetails')}</DialogTitle>
          </DialogHeader>
          {viewCampaign && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('common.name')}</span>
                  <p className="font-medium">{viewCampaign.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('common.status')}</span>
                  <p><StatusBadge status={viewCampaign.status} size="sm" /></p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t('newsletter.subject')}</span>
                  <p className="font-medium">{viewCampaign.subject}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('newsletter.template')}</span>
                  <p className="font-medium">{viewCampaign.template?.name || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('newsletter.recipients')}</span>
                  <p className="font-medium tabular-nums">{viewCampaign.recipientCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('newsletter.scheduled')}</span>
                  <p className="font-medium">{viewCampaign.scheduledAt ? formatDate(viewCampaign.scheduledAt) : '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('newsletter.sent')}</span>
                  <p className="font-medium">{viewCampaign.sentAt ? formatDate(viewCampaign.sentAt) : '—'}</p>
                </div>
                {viewCampaign.status === 'SENT' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">{t('newsletter.openRate')}</span>
                      <p className="font-medium tabular-nums">{viewCampaign.openRate !== undefined ? `${viewCampaign.openRate}%` : '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('newsletter.clickRate')}</span>
                      <p className="font-medium tabular-nums">{viewCampaign.clickRate !== undefined ? `${viewCampaign.clickRate}%` : '—'}</p>
                    </div>
                  </>
                )}
                {viewCampaign.errorMessage && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{t('newsletter.error')}</span>
                    <p className="text-sm text-red-600 dark:text-red-400">{viewCampaign.errorMessage}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCampaign(null)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('newsletter.editCampaign')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">{t('newsletter.campaignName')} <span className="text-destructive">*</span></Label>
              <Input
                id="edit-name"
                placeholder={t('newsletter.campaignNamePlaceholder')}
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-template">{t('newsletter.emailTemplate')} <span className="text-destructive">*</span></Label>
              {templatesLoading ? (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('newsletter.loadingTemplates')}
                </div>
              ) : emailTemplates.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                  {t('newsletter.noTemplates')}
                </div>
              ) : (
              <Select
                value={editForm.templateId}
                onValueChange={(v) => setEditForm((f) => ({ ...f, templateId: v }))}
              >
                <SelectTrigger id="edit-template">
                  <SelectValue placeholder={t('newsletter.selectTemplate')} />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}{tpl.category ? ` (${tpl.category})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-subject">{t('newsletter.subjectLine')} <span className="text-destructive">*</span></Label>
              <Input
                id="edit-subject"
                placeholder={t('newsletter.subjectPlaceholder')}
                value={editForm.subject}
                onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-content">{t('newsletter.contentOverride')} <span className="text-muted-foreground font-normal">{t('newsletter.optional')}</span></Label>
              <Textarea
                id="edit-content"
                placeholder={t('newsletter.contentOverridePlaceholder')}
                rows={3}
                value={editForm.contentOverride}
                onChange={(e) => setEditForm((f) => ({ ...f, contentOverride: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-schedule">{t('newsletter.schedule')} <span className="text-muted-foreground font-normal">{t('newsletter.optional')}</span></Label>
              <Popover open={editSchedulePopoverOpen} onOpenChange={setEditSchedulePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-schedule"
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-between text-left font-normal h-9 px-3',
                      !editForm.scheduledAt && 'text-muted-foreground'
                    )}
                  >
                    <span>
                      {editForm.scheduledAt && !isNaN(new Date(editForm.scheduledAt).getTime())
                        ? format(new Date(editForm.scheduledAt), "PPP 'at' HH:mm")
                        : (t('newsletter.selectDateTime') || 'mm/dd/yyyy --:-- --')}
                    </span>
                    <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      editForm.scheduledAt && !isNaN(new Date(editForm.scheduledAt).getTime())
                        ? new Date(editForm.scheduledAt)
                        : undefined
                    }
                    onSelect={(date) => {
                      if (!date) {
                        setEditForm((f) => ({ ...f, scheduledAt: '' }));
                        return;
                      }
                      const current = editForm.scheduledAt ? new Date(editForm.scheduledAt) : null;
                      const h = current && !isNaN(current.getTime()) ? current.getHours() : 9;
                      const m = current && !isNaN(current.getTime()) ? current.getMinutes() : 0;
                      date.setHours(h, m, 0, 0);
                      setEditForm((f) => ({
                        ...f,
                        scheduledAt: format(date, "yyyy-MM-dd'T'HH:mm"),
                      }));
                    }}
                    initialFocus
                  />
                  <div className="border-t border-border/60 pt-2.5 mt-2 flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="time"
                        value={
                          editForm.scheduledAt && !isNaN(new Date(editForm.scheduledAt).getTime())
                            ? format(new Date(editForm.scheduledAt), 'HH:mm')
                            : '09:00'
                        }
                        onChange={(e) => {
                          const timeVal = e.target.value;
                          if (!timeVal) return;
                          const [h, m] = timeVal.split(':').map(Number);
                          const baseDate =
                            editForm.scheduledAt && !isNaN(new Date(editForm.scheduledAt).getTime())
                              ? new Date(editForm.scheduledAt)
                              : new Date();
                          baseDate.setHours(h, m, 0, 0);
                          setEditForm((f) => ({
                            ...f,
                            scheduledAt: format(baseDate, "yyyy-MM-dd'T'HH:mm"),
                          }));
                        }}
                        className="h-8 w-24 text-xs font-mono"
                      />
                    </div>
                    {editForm.scheduledAt && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditForm((f) => ({ ...f, scheduledAt: '' }));
                        }}
                      >
                        {t('common.clear') || 'Clear'}
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                if (editingId) {
                  updateCampaignMutation.mutate({ id: editingId, data: editForm });
                }
              }}
              disabled={updateCampaignMutation.isPending || !editForm.name || !editForm.subject || !editForm.templateId}
            >
              {updateCampaignMutation.isPending ? t('newsletter.saving') : t('common.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}