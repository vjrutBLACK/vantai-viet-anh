import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { seedRbac } from '../../database/seeds/rbac.seed';
import { Permission } from '../../entities/permission.entity';

@Injectable()
export class RbacSeeder implements OnModuleInit {
  private readonly logger = new Logger(RbacSeeder.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      const permRepo = this.dataSource.getRepository(Permission);
      const count = await permRepo.count();
      if (count > 0) return;

      await seedRbac(this.dataSource);
      this.logger.log('Seeded RBAC roles/permissions');
    } catch (e: any) {
      // Do not crash app on seed failure, but log for visibility
      this.logger.error(`RBAC seed failed: ${e?.message || e}`);
    }
  }
}

