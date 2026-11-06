import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { RecipesModule } from './recipes/recipes.module.js';
import { IngredientsModule } from './ingredients/ingredients.module.js';
import { SupabaseStorageModule } from './supabase-storage/supabase-storage.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'food',
    }),
    PrismaModule,
    RecipesModule,
    IngredientsModule,
    SupabaseStorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
