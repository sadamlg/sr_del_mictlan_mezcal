const CGROUP_MEMORY_FILES = {
  current: '/sys/fs/cgroup/memory.current',
  maximum: '/sys/fs/cgroup/memory.max',
  statistics: '/sys/fs/cgroup/memory.stat',
};

function toMiB(bytes) {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const [processModule, v8, fileSystem] = await Promise.all([
    import('node:process'),
    import('node:v8'),
    import('node:fs/promises'),
  ]);

  async function readCgroupMemory() {
    try {
      const [current, maximum, statistics] = await Promise.all([
        fileSystem.readFile(CGROUP_MEMORY_FILES.current, 'utf8'),
        fileSystem.readFile(CGROUP_MEMORY_FILES.maximum, 'utf8'),
        fileSystem.readFile(CGROUP_MEMORY_FILES.statistics, 'utf8'),
      ]);
      const stats = Object.fromEntries(
        statistics
          .trim()
          .split('\n')
          .map((line) => line.split(/\s+/, 2))
          .filter(([key]) => ['anon', 'file', 'kernel'].includes(key))
          .map(([key, value]) => [key, Number(value)]),
      );

      return {
        currentMiB: toMiB(Number(current)),
        maximumMiB: maximum.trim() === 'max' ? null : toMiB(Number(maximum)),
        anonMiB: toMiB(stats.anon ?? 0),
        fileMiB: toMiB(stats.file ?? 0),
        kernelMiB: toMiB(stats.kernel ?? 0),
      };
    } catch {
      return null;
    }
  }

  async function logMemory(phase) {
    const memory = processModule.memoryUsage();
    const heap = v8.getHeapStatistics();
    const cgroup = await readCgroupMemory();

    console.info(JSON.stringify({
      event: 'frontend_memory_diagnostic_v2',
      phase,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(processModule.uptime() * 10) / 10,
      pid: processModule.pid,
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
      cgroup,
    }));
  }

  await logMemory('startup');
  const interval = setInterval(() => {
    void logMemory('interval');
  }, 60_000);
  interval.unref();
}
