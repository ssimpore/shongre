import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { imageWidth, verifyImageTransform } from "./verify-image-transform.mjs";

/** A real, decodable grayscale PNG of the requested size. */
function png(width, height) {
  const chunk = (type, data) => {
    const typed = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([length, typed, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // grayscale
  const rows = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 1; x <= width; x += 1) {
      rows[y * (width + 1) + x] = (x * 7 + y * 13) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// The sniffer must read every format a storage transformer can emit.
assert.equal(imageWidth(png(640, 480)), 640);
assert.equal(
  imageWidth(
    Buffer.concat([
      Buffer.from("GIF89a", "latin1"),
      Buffer.from([0x40, 0x01, 0xf0, 0x00, 0x00, 0x00, 0x00]),
    ]),
  ),
  320,
);
const webpLossy = Buffer.alloc(30);
webpLossy.write("RIFF", 0, "latin1");
webpLossy.write("WEBP", 8, "latin1");
webpLossy.write("VP8 ", 12, "latin1");
webpLossy.writeUInt16LE(320, 26);
assert.equal(imageWidth(webpLossy), 320);
const webpExtended = Buffer.alloc(30);
webpExtended.write("RIFF", 0, "latin1");
webpExtended.write("WEBP", 8, "latin1");
webpExtended.write("VP8X", 12, "latin1");
webpExtended.writeUIntLE(319, 24, 3);
assert.equal(imageWidth(webpExtended), 320);
const jpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08,
  0x01, 0xe0, 0x01, 0x40, 0x01, 0x01, 0x11, 0x00,
]);
assert.equal(imageWidth(jpeg), 320);
assert.equal(imageWidth(Buffer.from("<html>not an image</html>")), null);

const directory = mkdtempSync(resolve(tmpdir(), "shongre-image-transform-"));
const evidencePath = resolve(directory, "image-transform.json");
const original = png(640, 480);
const rendered = png(320, 240);
let renderMode = "resize";
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname === "/storage/v1/object/public/listing-media/sample.png") {
    response.setHeader("Content-Type", "image/png");
    response.end(original);
    return;
  }
  if (
    url.pathname === "/storage/v1/render/image/public/listing-media/sample.png"
  ) {
    if (renderMode === "unprovisioned") {
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "image transformation disabled" }));
      return;
    }
    if (renderMode === "passthrough") {
      response.setHeader("Content-Type", "image/png");
      response.end(original);
      return;
    }
    assert.equal(url.searchParams.get("width"), "320");
    assert.equal(url.searchParams.get("resize"), "contain");
    response.setHeader("Content-Type", "image/png");
    response.end(rendered);
    return;
  }
  response.statusCode = 404;
  response.end();
});

try {
  await new Promise((resolveStarted) => server.listen(0, resolveStarted));
  const { port } = server.address();
  const sampleUrl = `http://127.0.0.1:${port}/storage/v1/object/public/listing-media/sample.png`;
  const run = () =>
    verifyImageTransform({
      sampleUrl,
      environment: "staging",
      allowInsecure: true,
      evidencePath,
    });

  const evidence = await run();
  assert.equal(evidence.result, "PASS");
  assert.equal(evidence.original.width, 640);
  assert.equal(evidence.transformed.width, 320);
  assert.ok(evidence.transformed.bytes < evidence.original.bytes);
  const persisted = JSON.parse(readFileSync(evidencePath, "utf8"));
  assert.equal(persisted.result, "PASS");
  assert.equal(persisted.environment, "staging");
  assert.equal(persisted.transformMode, "supabase_render");

  // A transformer that is not provisioned must fail closed, with evidence.
  renderMode = "unprovisioned";
  await assert.rejects(run, /HTTP 400.*PUBLIC_MEDIA_IMAGE_TRANSFORM=disabled/s);
  assert.equal(JSON.parse(readFileSync(evidencePath, "utf8")).result, "FAIL");

  // A transformer that answers with the original is a silent no-op, not a pass.
  renderMode = "passthrough";
  await assert.rejects(run, /640px wide, not 320px/);

  // Only public storage objects over HTTPS without secrets may be sampled.
  await assert.rejects(
    () =>
      verifyImageTransform({
        sampleUrl,
        environment: "staging",
        evidencePath,
      }),
    /must use HTTPS/,
  );
  await assert.rejects(
    () =>
      verifyImageTransform({
        sampleUrl: `${sampleUrl}?token=secret`,
        environment: "staging",
        allowInsecure: true,
      }),
    /no credentials or query string/,
  );
  await assert.rejects(
    () =>
      verifyImageTransform({
        sampleUrl: `http://127.0.0.1:${port}/storage/v1/object/sign/private.png`,
        environment: "staging",
        allowInsecure: true,
      }),
    /object\/public/,
  );
  await assert.rejects(
    () => verifyImageTransform({ sampleUrl, allowInsecure: true }),
    /IMAGE_TRANSFORM_ENVIRONMENT/,
  );
  console.log("Storage image transformer evidence invariants passed.");
} finally {
  await new Promise((resolveClosed) => server.close(resolveClosed));
  rmSync(directory, { recursive: true, force: true });
}
