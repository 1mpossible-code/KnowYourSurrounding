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
      let closed = false;
      const closeStream = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        unsubscribe();
        controller.close();
      };

      try {
        controller.enqueue(encode('status', {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          partialText: job.partialText,
          module: job.module,
          error: job.error,
        }));
      } catch {
        closeStream();
        return;
      }

      const unsubscribe = subscribe(jobId, (event) => {
        if (closed) return;
        try {
          controller.enqueue(encode(event.type, event));
        } catch {
          closeStream();
          return;
        }
        if (event.type === 'completed' || event.type === 'failed') {
          closeStream();
        }
      });

      const interval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(': keep-alive\n\n');
        } catch {
          closeStream();
        }
      }, 15000);

      return () => {
        closeStream();
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
