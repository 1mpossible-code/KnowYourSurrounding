import { getJob, subscribe } from '@/lib/job-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function encode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const job = await getJob(jobId);

  if (!job) {
    return new Response('Job not found.', { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encode('status', {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        partialText: job.partialText,
        module: job.module,
        error: job.error,
      }));

      const unsubscribe = subscribe(jobId, (event) => {
        controller.enqueue(encode(event.type, event));
        if (event.type === 'completed' || event.type === 'failed') {
          unsubscribe();
          controller.close();
        }
      });

      const interval = setInterval(() => {
        controller.enqueue(': keep-alive\n\n');
      }, 15000);

      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    },
    cancel() {
      return;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
