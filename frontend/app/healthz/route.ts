import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "shongre-web",
      release: process.env.RELEASE_SHA || "unreleased",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
