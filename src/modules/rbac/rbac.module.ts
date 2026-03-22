import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { UserRole } from '../../entities/user-role.entity';
import { User } from '../../entities/user.entity';
import { RbacService } from './rbac.service';
import { RbacSeeder } from './rbac.seeder';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, UserRole, User])],
  providers: [RbacService, RbacSeeder],
  exports: [RbacService, TypeOrmModule],
})
export class RbacModule {}

