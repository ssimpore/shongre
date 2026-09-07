export interface SignedUploadInput {
  localUri: string;
  signedUploadUrl: string;
  expiresAt: string;
  contentType: string;
  sizeBytes: number;
}

function validateSignedUpload(input: SignedUploadInput): URL {
  const destination = new URL(input.signedUploadUrl);
  const source = new URL(input.localUri);
  if (
    destination.protocol !== "https:" ||
    destination.username ||
    destination.password ||
    destination.hash
  ) {
    throw new Error("private_upload_destination_invalid");
  }
  const expiresAt = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("private_upload_destination_expired");
  }
  if (!["file:", "content:", "blob:"].includes(source.protocol)) {
    throw new Error("private_upload_source_invalid");
  }
  if (
    !input.contentType ||
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0
  ) {
    throw new Error("private_upload_metadata_invalid");
  }
  return destination;
}

export async function uploadSelectedFile(
  input: SignedUploadInput,
): Promise<void> {
  const destination = validateSignedUpload(input);
  const source = await fetch(input.localUri, {
    credentials: "omit",
    redirect: "error",
  });
  if (!source.ok) throw new Error("Le fichier sélectionné est inaccessible.");
  const body = await source.blob();
  if (body.size !== input.sizeBytes || body.type !== input.contentType) {
    throw new Error("Le fichier sélectionné a changé avant le téléversement.");
  }
  const uploaded = await fetch(destination, {
    method: "PUT",
    headers: { "Content-Type": input.contentType },
    body,
    credentials: "omit",
    redirect: "error",
  });
  if (!uploaded.ok) throw new Error("Le téléversement privé a échoué.");
}
