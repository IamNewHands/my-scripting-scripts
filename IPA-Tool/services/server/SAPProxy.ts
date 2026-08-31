// 文件：scripts/ipaTool/services/server/SAPProxy.ts
// 说明：SAP 请求代理，仅处理发往本地服务根路径的请求

import { AbortController, fetch } from "scripting";
import { AppConfig } from "../../constants/AppConfig";

const MAX_BODY_BYTES = 1 << 20;
const REQUEST_TIMEOUT_MS = 30_000;

const USER_AGENT =
  "Configurator/2.17 (Macintosh; OS X 15.2; 24C5089c) AppleWebKit/0620.1.16.11.6";
const CERTIFICATE_URL = "https://s.mzstatic.com/sap/setupCert.plist";
const SETUP_URL = "https://fpinit.itunes.apple.com/v1/signSapSetup/legacy";

const textResponse = (
  status: number,
  phrase: string,
  message: string,
  headers: Record<string, string> = {}
) =>
  HttpResponse.raw(status, phrase, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
    body: Data.fromString(`${message}\n`) ?? undefined,
  });

const isPlistContentType = (value: string) =>
  value.split(";", 1)[0].trim().toLowerCase() === "application/x-plist";

const resolveTarget = (request: HttpRequest) => {
  const requestURL = new URL(`http://${AppConfig.server.host}${request.target}`);
  const encodedTarget = requestURL.searchParams.get("url");

  if (!encodedTarget) throw new Error("url is not an allowed SAP endpoint");

  let target: URL;
  try {
    target = new URL(encodedTarget);
  } catch {
    throw new Error("url is not an allowed SAP endpoint");
  }

  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    target.search ||
    target.hash
  ) {
    throw new Error("url is not an allowed SAP endpoint");
  }

  if (request.method === "GET" && target.href === CERTIFICATE_URL) return target.href;
  if (request.method === "POST" && target.href === SETUP_URL) return target.href;

  throw new Error("url is not an allowed SAP endpoint");
};

const forwardRequest = async (request: HttpRequest, target: string) => {
  if (request.body.size > MAX_BODY_BYTES) {
    throw new Error("body exceeds 1048576 bytes");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { "User-Agent": USER_AGENT };
    if (request.method === "POST") headers["Content-Type"] = "application/x-plist";

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "POST" ? request.body : undefined,
      signal: controller.signal,
      shouldAllowRedirect: async () => false,
    });

    const responseHeaders: Record<string, string> = {};
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders["Content-Type"] = contentType;

    return {
      statusCode: upstream.status,
      reasonPhrase: upstream.statusText,
      headers: responseHeaders,
      body: await upstream.data(),
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const registerSAPProxy = (server: HttpServer) => {
  server.registerMiddleware(async request => {
    if (request.path !== "/") return null;

    const origin = request.headers.origin || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With, Accept, Origin",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return HttpResponse.raw(204, "No Content", { headers: corsHeaders });
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return textResponse(405, "Method Not Allowed", "method not allowed", {
        ...corsHeaders,
        Allow: "GET, POST, OPTIONS",
      });
    }

    try {
      const target = resolveTarget(request);

      if (
        request.method === "POST" &&
        !isPlistContentType(request.headers["content-type"] || "")
      ) {
        return textResponse(
          415,
          "Unsupported Media Type",
          "Content-Type must be application/x-plist",
          corsHeaders
        );
      }

      const response = await forwardRequest(request, target);
      return HttpResponse.raw(response.statusCode, response.reasonPhrase, {
        headers: { ...corsHeaders, ...response.headers },
        body: response.body,
      });
    } catch (error) {
      const message = `${error}`.includes("AbortError")
        ? "upstream SAP request timed out"
        : `${error}`.replace(/^Error:\s*/, "") || "upstream SAP request failed";
      return textResponse(502, "Bad Gateway", message, corsHeaders);
    }
  });
};
