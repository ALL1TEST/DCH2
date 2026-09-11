// POST /api/automations/[id]/run — Trigger an automation run
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { executeAutomation } from '@/lib/automation/automation-service';
import { requireFeature } from '@/lib/platform/platform-auth';

function reqId() { return 'req_' + nanoid(8); }
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireFeature(request, 'automation');
  if ('response' in auth) return auth.response;
  const id = reqId();
  try {
    const { id: automationId } = await context.params;
    const automation = await db.automation.findUnique({ where: { id: automationId } });
    if (!automation) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Automation not found' }, meta: { requestId: id } }, { status: 404 });

    // Create a run record
    const run = await db.automationRun.create({
      data: {
        automationId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Update automation stats
    await db.automation.update({
      where: { id: automationId },
      data: { totalRuns: { increment: 1 }, lastRunAt: new Date() },
    });

    // Execute the automation workflow (async — don't block the HTTP request)
    executeAutomation(automationId, run.id).catch((err) => {
      console.error(`[AUTOMATION:RUN] ${id} async execution failure:`, err);
    });

    return NextResponse.json({ data: { runId: run.id, status: 'RUNNING', message: 'Automation execution started' }, meta: { requestId: id } });
  } catch (error) {
    console.error(`[AUTOMATIONS:RUN] ${id} —`, error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to start automation' }, meta: { requestId: id } }, { status: 500 });
  }
}
