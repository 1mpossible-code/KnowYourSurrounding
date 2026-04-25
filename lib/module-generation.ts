import {
  buildMetadataPrompt,
  buildPrompt,
  coerceTopic,
  createModule,
  deriveTitleFromMarkdown,
  normalizeMarkdown,
} from '@/lib/cultural-orientation';
import { getJsonFromGroq, streamMarkdownFromGroq } from '@/lib/groq';
import { getJob, updateJob } from '@/lib/job-store';

type MetadataResponse = {
  title?: string;
  topic?: string;
};

export async function generateModuleForJob(jobId: string) {
  const job = await getJob(jobId);
  if (!job || job.status === 'generating' || job.status === 'completed') return;

  await updateJob(jobId, { status: 'generating', progress: 5 });
  const prompt = buildPrompt(job.input);
  let accumulated = '';

  try {
    const markdown = await streamMarkdownFromGroq(prompt, (chunk) => {
      accumulated += chunk;
      void updateJob(jobId, {
        status: 'generating',
        partialText: normalizeMarkdown(accumulated),
        progress: Math.min(90, 10 + Math.floor(normalizeMarkdown(accumulated).length / 40)),
      });
    });

    const cleanMarkdown = normalizeMarkdown(markdown);
    const metadata = await getJsonFromGroq<MetadataResponse>(buildMetadataPrompt(cleanMarkdown)).catch(
      () => ({}) as MetadataResponse,
    );
    const title = metadata.title?.trim() || deriveTitleFromMarkdown(cleanMarkdown);
    const topic = coerceTopic(metadata.topic || '', `${title}\n${cleanMarkdown}`);
    const generatedModule = createModule(title, topic, cleanMarkdown);

    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      partialText: cleanMarkdown,
      module: generatedModule,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown generation error.';
    await updateJob(jobId, {
      status: 'failed',
      progress: 100,
      error: message,
      partialText: normalizeMarkdown(accumulated),
    });
  }
}
