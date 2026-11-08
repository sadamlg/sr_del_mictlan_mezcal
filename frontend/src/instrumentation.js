const MEBIBYTE = 1024 * 1024;
const SAMPLE_INTERVAL_MS = 60_000;

function toMiB(bytes) {
  return Number((bytes / MEBIBYTE).toFixed(1));
}

function logMemorySample(memoryUsage, getHeapStatistics, phase) {
  const memory = memoryUsage();
  const heap = getHeapStatistics();

  console.info(JSON.stringify({
    event: 'frontend_memory_diagnostic',
    phase,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Number(process.uptime().toFixed(1)),
    rssMiB: toMiB(memory.rss),
    heapTotalMiB: toMiB(memory.heapTotal),
    heapUsedMiB: toMiB(memory.heapUsed),
    externalMiB: toMiB(memory.external),
    arrayBuffersMiB: toMiB(memory.arrayBuffers),
    v8MallocedMiB: toMiB(heap.malloced_memory),
    v8ExternalMiB: toMiB(heap.external_memory),
    v8HeapLimitMiB: toMiB(heap.heap_size_limit),
    v8NativeContexts: heap.number_of_native_contexts,
    v8DetachedContexts: heap.number_of_detached_contexts,
  }));
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const [{ memoryUsage }, { getHeapStatistics }] = await Promise.all([
    import('node:process'),
    import('node:v8'),
  ]);

  logMemorySample(memoryUsage, getHeapStatistics, 'startup');

  const interval = setInterval(() => {
    logMemorySample(memoryUsage, getHeapStatistics, 'interval');
  }, SAMPLE_INTERVAL_MS);

  interval.unref();
}
