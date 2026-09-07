import { forwardWebApiRequest } from "../../src/platform/api/web-api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = forwardWebApiRequest;
export const HEAD = forwardWebApiRequest;
