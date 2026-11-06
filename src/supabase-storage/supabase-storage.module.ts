import { Global, Module } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service.js';

@Global()
@Module({
  providers: [SupabaseStorageService],
  exports : [SupabaseStorageService]
})
export class SupabaseStorageModule {}
