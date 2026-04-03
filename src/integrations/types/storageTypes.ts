export type StorageAction =
  | "upload"
  | "delete"
  | "getDownloadUrl"
  | "presignedUploadUrl"
  | "presignedDownloadUrl";

export type StorageProvider = "s3" | "azure_blob" | "minio";