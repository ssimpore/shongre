import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";

/** Shongre brand tokens, inlined: `ImageResponse` has no access to the stylesheet. */
const BRAND = "#CC4018";
const INK = "#1C1917";
const GROUND = "#F8F6F2";
const RULE = "#E6E1D9";
const MUTED = "#57534E";

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

  return new ImageResponse(
    (
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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: BRAND,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            S
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: INK }}>
              shongre
            </span>
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
            {named ? `Shongre ${displayName(slug)}` : "Shongre Solutions"}
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
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
