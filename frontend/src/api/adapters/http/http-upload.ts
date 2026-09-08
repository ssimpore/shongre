import { apiOperation } from "./generated-api-operation";

export interface HttpUploadFile {
  name: string;
  type: string;
  size: number;
  body?: Blob;
}

export async function uploadPublicImage(file: HttpUploadFile) {
  if (!file.body) throw new Error("Le contenu du fichier est manquant.");
  const prepared = await apiOperation<
    {
      assetId: string;
      signedUrl: string;
      contentType: string;
    },
    "postMediaListingsUploads"
  >("postMediaListingsUploads", {
    body: {
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    },
  });
  const uploaded = await fetch(prepared.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": prepared.contentType },
    body: file.body,
  });
  if (!uploaded.ok) throw new Error("Le téléversement du fichier a échoué.");
  return apiOperation<
    { assetId: string; url: string },
    "postMediaListingsUploadsByIdComplete"
  >("postMediaListingsUploadsByIdComplete", { path: { id: prepared.assetId } });
}

export async function uploadPrivateDocument(file: HttpUploadFile) {
  if (!file.body) throw new Error("Le contenu du fichier est manquant.");
  const prepared = await apiOperation<
    {
      assetId: string;
      signedUrl: string;
      contentType: string;
    },
    "postMediaPrivateDocumentsUploads"
  >("postMediaPrivateDocumentsUploads", {
    body: {
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    },
  });
  const uploaded = await fetch(prepared.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": prepared.contentType },
    body: file.body,
  });
  if (!uploaded.ok) throw new Error("Le téléversement du document a échoué.");
  return apiOperation<
    {
      assetId: string;
      privateStorageKey: string;
    },
    "postMediaPrivateDocumentsUploadsByIdComplete"
  >("postMediaPrivateDocumentsUploadsByIdComplete", {
    path: { id: prepared.assetId },
  });
}
