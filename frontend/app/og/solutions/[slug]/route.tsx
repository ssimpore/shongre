import { ImageResponse } from "next/og";
import { themeColors } from "@shongre/design-tokens";
import { resolveServerApplicationContext } from "../../../../src/platform/applications/server-application-context";

export const dynamic = "force-dynamic";

/** `ImageResponse` cannot read CSS variables, so it consumes token values in JS. */
const BRAND = themeColors["brand-primary"];
const INK = themeColors["brand-ink"];
const GROUND = themeColors["brand-surface-subtle"];
const RULE = themeColors["border-base"];
const MUTED = themeColors["text-secondary"];

/**
 * Slugs are the only input, so they are validated rather than trusted: this
 * endpoint draws Shongre-branded artwork, and an unvalidated slug would let any
 * caller render arbitrary text onto it.
 */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+){0,5}$/;

/**
 * The display name is derived from the slug rather than fetched.
 *
 * It matches every solution in the catalogue today (`prospects` → "Shongre
 * Prospects"), needs no request-time data access, and degrades to a correct
 * generic card instead of a broken one. If a solution ever ships a display name
 * that is not its title-cased slug, read the name from the catalogue service
 * here instead.
 */
function displayName(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await context.params;
  const named = SLUG.test(slug);
  const applicationContext =
    await resolveServerApplicationContext("/solutions");
  if (!applicationContext) {
    return new Response("Solutions application origin is unavailable.", {
      status: 503,
    });
  }
  const brandLogoUrl = new URL(
    "/brand/shongre/logo/header-primary-480.png",
    applicationContext.canonicalOrigin,
  ).href;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: GROUND,
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <img
          src={brandLogoUrl}
          alt="SHONGRE."
          width="240"
          height="61"
          style={{ width: 240, height: 61, objectFit: "contain" }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 20, color: MUTED, marginTop: 2 }}>
            Solutions
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: named ? 88 : 68,
            fontWeight: 700,
            color: INK,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          {named ? `SHONGRE. ${displayName(slug)}` : "SHONGRE. Solutions"}
        </span>
        <div
          style={{
            width: 120,
            height: 8,
            background: BRAND,
            marginTop: 36,
            borderRadius: 4,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          borderTop: `2px solid ${RULE}`,
          paddingTop: 26,
          fontSize: 26,
          color: MUTED,
        }}
      >
        Un compte. Une organisation. Plusieurs solutions.
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
