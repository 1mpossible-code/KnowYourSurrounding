import { notFound } from 'next/navigation';

import { ModuleWorkspace } from '@/app/_components/module-workspace';
import { isTopic } from '@/lib/cultural-orientation';

export default async function ModulePage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  if (!isTopic(topic)) {
    notFound();
  }

  return <ModuleWorkspace topic={topic} />;
}
