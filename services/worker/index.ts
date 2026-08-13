/** Cloudflare Worker entry point for the Veylumi Web application. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

type Fetcher = { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
type D1DatabaseLike = unknown;
type ImagesTransform = { output(options: { format: string; quality: number }): Promise<{ response(): Response }> };

interface Env {
  ASSETS: Fetcher;
  DB?: D1DatabaseLike;
  IMAGES?: { input(stream: ReadableStream): { transform(options: Record<string, unknown>): ImagesTransform } };
}
interface ExecutionContext { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void; }

const worker = {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    void _ctx;
    const url = new URL(request.url);
    if (url.pathname === "/_vinext/image") {
      const images = env.IMAGES;
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          if (!images) throw new Error("IMAGES binding is not configured");
          return images.input(body).transform(width > 0 ? { width } : {}).output({ format, quality }).then((result) => result.response());
        },
      }, [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES]);
    }
    return handler.fetch(request, env);
  },
};
export default worker;
