type EdgeHandler = (request: Request) => Response | Promise<Response>;

type DenoLikeRuntime = {
  serve: (handler: EdgeHandler) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

function getRuntime(): DenoLikeRuntime {
  const runtime = (globalThis as { Deno?: DenoLikeRuntime }).Deno;
  if (!runtime) {
    throw new Error('Deno runtime is required for Supabase Edge Functions.');
  }
  return runtime;
}

export function serve(handler: EdgeHandler): void {
  getRuntime().serve(handler);
}

export function readEnv(key: string): string | undefined {
  return getRuntime().env.get(key);
}

