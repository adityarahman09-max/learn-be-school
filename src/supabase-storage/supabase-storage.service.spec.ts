import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseStorageService } from './supabase-storage.service.js';

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SupabaseStorageService],
    }).compile();

    service = module.get<SupabaseStorageService>(SupabaseStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
