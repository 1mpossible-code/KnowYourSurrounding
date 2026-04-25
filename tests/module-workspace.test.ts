import { describe, expect, test } from 'bun:test';

import {
  buildWorkspaceSummary,
  createBlankWorkspace,
  createQueuedStage,
  getModuleStagePath,
  setActiveWorkspaceStage,
  updateWorkspaceStage,
  upsertWorkspaceStage,
} from '@/lib/module-workspace';

describe('module workspace helpers', () => {
  test('createBlankWorkspace starts with a blank stage', () => {
    const workspace = createBlankWorkspace('communication');
    expect(workspace.topic).toBe('communication');
    expect(workspace.stages).toHaveLength(1);
    expect(workspace.stages[0]?.status).toBe('blank');
    expect(workspace.activeStageId).toBe(workspace.stages[0]?.id);
  });

  test('upsertWorkspaceStage appends and activates the new stage', () => {
    const workspace = createBlankWorkspace('work');
    const next = upsertWorkspaceStage(workspace, {
      id: 'stage-2',
      topic: 'work',
      title: 'Handling direct feedback',
      seedText: 'Direct feedback can feel abrupt.',
      status: 'completed',
      text: '# Handling direct feedback',
      jobId: 'job-2',
      createdAt: '2026-04-25T00:00:00.000Z',
      updatedAt: '2026-04-25T00:00:00.000Z',
    });

    expect(next.stages).toHaveLength(2);
    expect(next.activeStageId).toBe('stage-2');
  });

  test('updateWorkspaceStage patches an existing stage', () => {
    const workspace = upsertWorkspaceStage(createBlankWorkspace('food'), {
      id: 'stage-2',
      topic: 'food',
      title: 'Shopping at markets',
      seedText: 'Markets work differently.',
      status: 'queued',
      text: '',
      createdAt: '2026-04-25T00:00:00.000Z',
      updatedAt: '2026-04-25T00:00:00.000Z',
    });

    const updated = updateWorkspaceStage(workspace, 'stage-2', {
      status: 'completed',
      text: '# Shopping at markets',
    });

    expect(updated.stages.find((stage) => stage.id === 'stage-2')?.status).toBe('completed');
    expect(updated.stages.find((stage) => stage.id === 'stage-2')?.text).toContain('Shopping at markets');
  });

  test('setActiveWorkspaceStage keeps requested stage active', () => {
    const workspace = upsertWorkspaceStage(createBlankWorkspace('transit'), {
      id: 'stage-2',
      topic: 'transit',
      title: 'Understanding ticket checks',
      seedText: 'Transit inspections can be strict.',
      status: 'completed',
      text: '# Understanding ticket checks',
      createdAt: '2026-04-25T00:00:00.000Z',
      updatedAt: '2026-04-25T00:00:00.000Z',
    });

    const blankId = workspace.stages[0]?.id as string;
    const reverted = setActiveWorkspaceStage(workspace, blankId);
    expect(reverted.activeStageId).toBe(blankId);
  });

  test('createQueuedStage produces a queued note shell', () => {
    const stage = createQueuedStage('laws', 'Understanding local rules', 'Rules can be strict.', 'stage-9');
    expect(stage).toMatchObject({
      id: 'stage-9',
      topic: 'laws',
      title: 'Understanding local rules',
      seedText: 'Rules can be strict.',
      status: 'queued',
      text: '',
    });
  });

  test('buildWorkspaceSummary ignores fully blank workspaces', () => {
    expect(buildWorkspaceSummary(createBlankWorkspace('laws'))).toBeNull();
  });

  test('buildWorkspaceSummary returns latest meaningful stage', () => {
    const workspace = upsertWorkspaceStage(createBlankWorkspace('safety'), {
      id: 'stage-2',
      topic: 'safety',
      title: 'Emergency calls',
      seedText: 'How emergency calls work.',
      status: 'completed',
      text: '# Emergency calls',
      jobId: 'job-2',
      createdAt: '2026-04-25T00:00:00.000Z',
      updatedAt: '2026-04-25T00:00:00.000Z',
    });

    expect(buildWorkspaceSummary(workspace)).toEqual({
      topic: 'safety',
      latestStageId: 'stage-2',
      latestStageTitle: 'Emergency calls',
      latestStageStatus: 'completed',
      latestJobId: 'job-2',
      stageCount: 1,
      updatedAt: workspace.updatedAt,
    });
  });

  test('getModuleStagePath returns root or stage route', () => {
    expect(getModuleStagePath('communication')).toBe('/modules/communication');
    expect(getModuleStagePath('communication', 'stage-2')).toBe('/modules/communication/stage-2');
  });
});
