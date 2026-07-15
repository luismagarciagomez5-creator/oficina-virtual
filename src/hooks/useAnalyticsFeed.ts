import { useMemo, useState } from 'react';
import {
  selectWorkspaceAnalyticsForActor,
} from '../central-analytics';
import type { AnalyticsPeriod, OfficeActivityEvent, TrendBucket } from '../central-events';
import { createHistoricalOfficeFeed, selectTrendBuckets } from '../central-events';
import { applyRoutineCommand, createCentralRoutineState, createRoutineFixtures } from '../central-routines';
import type { CentralRoutineState } from '../central-routines';
import { applyTaskCommand, createCentralTaskState, createTaskFixtures } from '../central-tasks';
import type { CentralTaskState } from '../central-tasks';
import type { WorkspaceAnalytics } from '../central-analytics';

export type AnalyticsFeed = {
  workspaceId: string;
  period: AnalyticsPeriod;
  setPeriod: (period: AnalyticsPeriod) => void;
  analytics: WorkspaceAnalytics | null;
  trend: TrendBucket[];
  loading: boolean;
  error: 'workspace_mismatch' | 'unauthorized' | null;
};

const DEMO_WORKSPACE_ID = 'workspace-demo';
const TIME_ZONE = 'Europe/Madrid';

export type AnalyticsFeedOptions = {
  workspaceId?: string;
  events?: OfficeActivityEvent[];
  taskState?: CentralTaskState;
  routineState?: CentralRoutineState;
};

function createDemoSources(workspaceId: string, now: number) {
  let taskState = createCentralTaskState(workspaceId);
  for (const command of createTaskFixtures(workspaceId)) {
    const result = applyTaskCommand(taskState, command);
    if (result.success) taskState = result.state;
  }

  let routineState = createCentralRoutineState(workspaceId);
  for (const command of createRoutineFixtures(workspaceId)) {
    const result = applyRoutineCommand(routineState, command);
    if (result.success) routineState = result.state;
  }

  return {
    events: createHistoricalOfficeFeed(workspaceId, new Date(now), 35),
    taskState,
    routineState,
  };
}

export function useAnalyticsFeed(options: AnalyticsFeedOptions = {}): AnalyticsFeed {
  const workspaceId = options.workspaceId ?? DEMO_WORKSPACE_ID;
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const now = useMemo(() => Date.now(), []);
  const demoSources = useMemo(() => createDemoSources(workspaceId, now), [workspaceId, now]);
  const events = options.events ?? demoSources.events;
  const taskState = options.taskState ?? demoSources.taskState;
  const routineState = options.routineState ?? demoSources.routineState;
  const result = useMemo(() => selectWorkspaceAnalyticsForActor(
    { actorId: 'demo-admin', role: 'workspace_admin', workspaceId },
    { workspaceId, period, now, timeZone: TIME_ZONE },
    events,
    taskState,
    routineState,
  ), [events, now, period, routineState, taskState, workspaceId]);

  if (!result.success) {
    return { workspaceId, period, setPeriod, analytics: null, trend: [], loading: false, error: result.error };
  }

  return {
    workspaceId,
    period,
    setPeriod,
    analytics: result.analytics,
    trend: selectTrendBuckets(events, result.analytics.activity.bounds),
    loading: false,
    error: null,
  };
}
