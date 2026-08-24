import { httpClient } from "./http-client";

export interface HttpUploadFile {
  name: string;
  type: string;
  size: number;
  body?: Blob;
}

export async function uploadPublicImage(file: HttpUploadFile) {
  if (!file.body) throw new Error("Le contenu du fichier est manquant.");
  const prepared = await httpClient.post<{
    assetId: string;
    signedUrl: string;
    contentType: string;
  }>("/media/listings/uploads", {
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });
  const uploaded = await fetch(prepared.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": prepared.contentType },
    body: file.body,
  });
  if (!uploaded.ok) throw new Error("Le téléversement du fichier a échoué.");
  return httpClient.post<{ assetId: string; url: string }>(
    `/media/listings/uploads/${prepared.assetId}/complete`,
  );
}

export async function uploadPrivateDocument(file: HttpUploadFile) {
  if (!file.body) throw new Error("Le contenu du fichier est manquant.");
  const prepared = await httpClient.post<{
    assetId: string;
    signedUrl: string;
    contentType: string;
  }>("/media/private-documents/uploads", {
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });
  const uploaded = await fetch(prepared.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": prepared.contentType },
    body: file.body,
  });
  if (!uploaded.ok) throw new Error("Le téléversement du document a échoué.");
  return httpClient.post<{
    assetId: string;
    privateStorageKey: string;
  }>(`/media/private-documents/uploads/${prepared.assetId}/complete`);
}
