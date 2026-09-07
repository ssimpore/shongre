import { forwardWebApiRequest } from "../../../../src/platform/api/web-api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export {
  forwardWebApiRequest as GET,
  forwardWebApiRequest as POST,
  forwardWebApiRequest as PUT,
  forwardWebApiRequest as PATCH,
  forwardWebApiRequest as DELETE,
  forwardWebApiRequest as HEAD,
  forwardWebApiRequest as OPTIONS,
};
