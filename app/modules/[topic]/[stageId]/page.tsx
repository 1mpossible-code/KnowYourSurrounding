import { notFound } from 'next/navigation';

import { ModuleWorkspace } from '@/app/_components/module-workspace';
import { isTopic } from '@/lib/cultural-orientation';

export default async function ModuleStagePage({ params }: { params: Promise<{ topic: string; stageId: string }> }) {
  const { topic, stageId } = await params;
  if (!isTopic(topic) || !stageId.trim()) {
    notFound();
  }

  return <ModuleWorkspace topic={topic} initialStageId={stageId} />;
}
