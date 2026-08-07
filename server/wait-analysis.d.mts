export interface AnalysisWaiterOptions {
  get?: (jobId: string) => Promise<{ status: string; error?: string | null; result?: unknown }>;
  hasEventSource?: () => boolean;
  createEventSource?: (jobId: string) => {
    close(): void;
    addEventListener(type: string, cb: (event: { data: string }) => void): void;
    onError(handler: () => void): void;
  };
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
  now?: () => number;
  pollIntervalMs?: number;
  sseFallbackMs?: number;
  pollDeadlineMs?: number;
}

export interface AnalysisWaiter {
  wait: (jobId: string) => Promise<{ status: string; error?: string | null; result?: unknown }>;
  poll: (jobId: string) => Promise<{ status: string; error?: string | null; result?: unknown }>;
}

export function createAnalysisWaiter(options?: AnalysisWaiterOptions): AnalysisWaiter;
