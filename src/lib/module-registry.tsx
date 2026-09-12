'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { platformModuleRegistry } from '@/modules/platform';

function ModuleFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>  );
}

const dashboard = dynamic(() => import('@/modules/dashboard').then(m => ({ default: m.DashboardPage as ComponentType })), { loading: ModuleFallback });
// Internal Account dashboard — the dedicated INTERNAL-role account's
// own dashboard (separate from both the client CMS and Platform Admin).
const internalDashboard = dynamic(() => import('@/modules/internal').then(m => ({ default: m.InternalDashboardModule as ComponentType })), { loading: ModuleFallback });
const content = dynamic(() => import('@/modules/content').then(m => ({ default: m.ContentModule as ComponentType })), { loading: ModuleFallback });
const calendar = dynamic(() => import('@/modules/calendar').then(m => ({ default: m.CalendarModule as ComponentType })), { loading: ModuleFallback });
const tasks = dynamic(() => import('@/modules/tasks').then(m => ({ default: m.TasksModule as ComponentType })), { loading: ModuleFallback });
const media = dynamic(() => import('@/modules/media').then(m => ({ default: m.MediaModule as ComponentType })), { loading: ModuleFallback });
const users = dynamic(() => import('@/modules/users').then(m => ({ default: m.UsersModule as ComponentType })), { loading: ModuleFallback });
const categories = dynamic(() => import('@/modules/categories').then(m => ({ default: m.CategoriesModule as ComponentType })), { loading: ModuleFallback });
const tags = dynamic(() => import('@/modules/tags').then(m => ({ default: m.TagsModule as ComponentType })), { loading: ModuleFallback });
const comments = dynamic(() => import('@/modules/comments').then(m => ({ default: m.CommentsModule as ComponentType })), { loading: ModuleFallback });
const newsletter = dynamic(() => import('@/modules/newsletter').then(m => ({ default: m.NewsletterModule as ComponentType })), { loading: ModuleFallback });
const seo = dynamic(() => import('@/modules/seo').then(m => ({ default: m.SeoModule as ComponentType })), { loading: ModuleFallback });
const analytics = dynamic(() => import('@/modules/analytics').then(m => ({ default: m.AnalyticsModule as ComponentType })), { loading: ModuleFallback });
const notifications = dynamic(() => import('@/modules/notifications').then(m => ({ default: m.NotificationsModule as ComponentType })), { loading: ModuleFallback });
const settings = dynamic(() => import('@/modules/settings').then(m => ({ default: m.SettingsModule as ComponentType })), { loading: ModuleFallback });
const ai = dynamic(() => import('@/modules/ai').then(m => ({ default: m.AiModule as ComponentType })), { loading: ModuleFallback });
const audit = dynamic(() => import('@/modules/audit').then(m => ({ default: m.AuditModule as ComponentType })), { loading: ModuleFallback });
const automation = dynamic(() => import('@/modules/automation').then(m => ({ default: m.AutomationModule as ComponentType })), { loading: ModuleFallback });
const backups = dynamic(() => import('@/modules/backups').then(m => ({ default: m.BackupsModule as ComponentType })), { loading: ModuleFallback });
const jobs = dynamic(() => import('@/modules/jobs').then(m => ({ default: m.JobsModule as ComponentType })), { loading: ModuleFallback });
const emailTemplates = dynamic(() => import('@/modules/email-templates').then(m => ({ default: m.EmailTemplatesModule as ComponentType })), { loading: ModuleFallback });
const profile = dynamic(() => import('@/modules/profile').then(m => ({ default: m.ProfileModule as ComponentType })), { loading: ModuleFallback });
const billing = dynamic(() => import('@/modules/billing').then(m => ({ default: m.BillingModule as ComponentType })), { loading: ModuleFallback });

export const moduleRegistry: Record<string, ComponentType> = {
  ...platformModuleRegistry,
  'internal-dashboard': internalDashboard,
  dashboard, content, calendar, tasks, media, users, categories, tags, comments, newsletter, 'email-templates': emailTemplates, seo, analytics, notifications, settings, ai, audit, backups, automation, jobs, profile, billing,
};
