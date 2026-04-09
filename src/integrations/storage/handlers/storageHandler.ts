import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

import { Client as MinioClient } from "minio";

export type StorageAction =
  | "upload"
  | "delete"
  | "getDownloadUrl"
  | "presignedUploadUrl"
  | "presignedDownloadUrl"
  | "getObjectStream";

export type StorageProvider = "s3" | "azure_blob" | "minio";

export class StorageHandler {
  async execute(action: StorageAction, payload: any, credentials: any): Promise<any> {
    if (!credentials?.provider) {
      throw new Error("Storage provider missing in credentials");
    }

    if (Array.isArray(payload)) {
      return Promise.all(
        payload.map((item) =>
          this.execute(action, item, credentials)
        )
      );
    }

    switch (credentials.provider) {
      case "s3":
        return this.handleS3(action, payload, credentials);

      case "azure_blob":
        return this.handleAzure(action, payload, credentials);

      case "minio":
        return this.handleMinio(action, payload, credentials);

      default:
        throw new Error(`Unsupported provider: ${credentials.provider}`);
    }
  }

  private async handleS3(
    action: StorageAction,
    payload: any,
    credentials: any,
  ) {
    const client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    const bucket = credentials.bucketName;

    switch (action) {
      case "upload":
        return client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: payload.key,
            Body: payload.body,
            ContentType: payload.contentType,
          }),
        );

      case "delete":
        return client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: payload.key,
          }),
        );

      case "getDownloadUrl":
        // Better: configurable base URL
        return `${credentials.cdnUrl || `https://${bucket}.s3.${credentials.region}.amazonaws.com`}/${payload.key}`;

      case "presignedUploadUrl":
        return getSignedUrl(
          client,
          new PutObjectCommand({
            Bucket: bucket,
            Key: payload.key,
            ContentType: payload.contentType,
          }),
          { expiresIn: payload.expiresIn || 300 },
        );

      case "presignedDownloadUrl":
        return getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: bucket,
            Key: payload.key,
          }),
          { expiresIn: payload.expiresIn || 300 },
        );

      default:
        throw new Error(`Unsupported S3 action: ${action}`);
    }
  }
  private async handleAzure(
    action: StorageAction,
    payload: any,
    credentials: any,
  ) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      credentials.connectionString,
    );

    const containerClient = blobServiceClient.getContainerClient(
      credentials.containerName,
    );

    const blobClient = containerClient.getBlockBlobClient(payload.key);

    switch (action) {
      case "upload":
        return blobClient.uploadData(payload.body, {
          blobHTTPHeaders: {
            blobContentType: payload.contentType,
          },
        });

      case "delete":
        return blobClient.deleteIfExists();

      case "getDownloadUrl":
        return blobClient.url;

      case "presignedUploadUrl":
      case "presignedDownloadUrl":
        return this.generateAzureSASUrl(
          payload,
          credentials,
          action === "presignedUploadUrl",
        );

      default:
        throw new Error(`Unsupported Azure action: ${action}`);
    }
  }

  private generateAzureSASUrl(
    payload: any,
    credentials: any,
    isUpload: boolean,
  ) {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      credentials.accountName,
      credentials.accountKey,
    );

    const expiresOn = new Date(Date.now() + (payload.expiresIn || 300) * 1000);

    const permissions = isUpload
      ? BlobSASPermissions.parse("cw") // create + write
      : BlobSASPermissions.parse("r");

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: credentials.containerName,
        blobName: payload.key,
        permissions,
        expiresOn,
      },
      sharedKeyCredential,
    ).toString();

    return `https://${credentials.accountName}.blob.core.windows.net/${credentials.containerName}/${payload.key}?${sasToken}`;
  }

  private async handleMinio(
    action: StorageAction,
    payload: any,
    credentials: any,
  ) {
    const client = new MinioClient({
      endPoint: credentials.endPoint,
      port: credentials.port || 9000,
      useSSL: credentials.useSSL || false,
      accessKey: credentials.accessKey,
      secretKey: credentials.secretKey,
    });

    const bucket = credentials.bucketName;

    switch (action) {
      case "upload":
        return client.putObject(
          bucket,
          payload.key,
          payload.body,
          undefined, // size
          { "Content-Type": payload.contentType },
        );

      case "delete":
        return client.removeObject(bucket, payload.key);

      case "getDownloadUrl":
        return `${credentials.useSSL ? "https" : "http"}://${credentials.endPoint}:${credentials.port}/${bucket}/${payload.key}`;

      case "presignedUploadUrl":
        return client.presignedPutObject(
          bucket,
          payload.key,
          payload.expiresIn || 300,
        );

      case "presignedDownloadUrl":
        return client.presignedGetObject(
          bucket,
          payload.key,
          payload.expiresIn || 300,
        );

      case "getObjectStream":
        return client.getObject(bucket, payload.key);

      default:
        throw new Error(`Unsupported MinIO action: ${action}`);
    }
  }
}
