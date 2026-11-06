// src/supabase-storage/supabase-storage.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type StorageUploadOptions = {
  /** true = timpa file jika path sudah ada */
  upsert?: boolean;
};

export type StorageUploadResult = {
  path: string;
  bucket: string;
  publicUrl: string | null;
};

export type StorageDeleteResult = {
  deleted: boolean;
  path: string;
  bucket: string;
};

@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private client!: SupabaseClient;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.initSupabaseStorage();
  }

  /**
   * Inisialisasi Supabase Storage client.
   * SUPABASE_SERVICE_ROLE_KEY = Secret key (service_role) di dashboard API.
   */
  initSupabaseStorage(): void {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const secretKey = this.config.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.bucket = this.config.getOrThrow<string>('SUPABASE_STORAGE_BUCKET');

    this.client = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  getBucketName(): string {
    return this.bucket;
  }

  private normalizeObjectPath(objectPath: string): string {
    const normalized = objectPath.replace("/^/+/", '').trim();
    if (!normalized) {
      throw new BadRequestException('objectPath must not be empty');
    }
    return normalized;
  }

  private parseObjectPath(objectPath: string): {
    folder: string;
    fileName: string;
  } {
    const normalized = this.normalizeObjectPath(objectPath);
    const lastSlash = normalized.lastIndexOf('/');

    if (lastSlash === -1) {
      return { folder: '', fileName: normalized };
    }

    return {
      folder: normalized.slice(0, lastSlash),
      fileName: normalized.slice(lastSlash + 1),
    };
  }

  /** Cek apakah file ada di bucket (berdasarkan object path). */
  async fileExists(objectPath: string): Promise<boolean> {
    const normalized = this.normalizeObjectPath(objectPath);
    const { folder, fileName } = this.parseObjectPath(normalized);

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(folder, {
        search: fileName,
        limit: 100,
      });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return (data ?? []).some(
      (item) => item.name === fileName && item.metadata != null,
    );
  }

  /** Upload file dari Multer ke Supabase Storage. */
  async uploadFile(
    file: Express.Multer.File,
    objectPath: string,
    options: StorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is empty or not readable');
    }

    const normalizedPath = this.normalizeObjectPath(objectPath);
    const upsert = options.upsert ?? false;

    if (!upsert && (await this.fileExists(normalizedPath))) {
      throw new BadRequestException(
        'File already exists at path: ' + normalizedPath,
      );
    }

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(normalizedPath, file.buffer, {
        contentType: file.mimetype,
        upsert,
        cacheControl: '3600',
      });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return {
      path: data.path,
      bucket: this.bucket,
      publicUrl: this.getPublicUrl(data.path),
    };
  }

  /** URL publik (hanya untuk bucket public). */
  getPublicUrl(objectPath: string): string | null {
    const normalized = this.normalizeObjectPath(objectPath);
    const { data } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(normalized);
    return data.publicUrl ?? null;
  }

  /** Signed URL untuk bucket private (unduh sementara). */
  async createSignedUrl(
    objectPath: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const normalized = this.normalizeObjectPath(objectPath);
    const exists = await this.fileExists(normalized);

    if (!exists) {
      throw new NotFoundException('File not found: ' + normalized);
    }

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(normalized, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new InternalServerErrorException(
        error?.message ?? 'Failed to create signed URL',
      );
    }

    return data.signedUrl;
  }

  /** Hapus file; cek exists dulu, lalu remove dari bucket. */
  async deleteFile(objectPath: string): Promise<StorageDeleteResult> {
    const normalized = this.normalizeObjectPath(objectPath);
    const exists = await this.fileExists(normalized);

    if (!exists) {
      throw new NotFoundException('File not found: ' + normalized);
    }

    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([normalized]);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return {
      deleted: true,
      path: normalized,
      bucket: this.bucket,
    };
  }
}