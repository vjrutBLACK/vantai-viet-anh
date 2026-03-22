import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { UserRole } from '../../entities/user-role.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepo.find({
      where: { userId },
    });
    if (!userRoles.length) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      // Backward-compatible: grant full permissions to legacy `user.role === 'admin'`
      if (user?.role === 'admin') {
        const perms = await this.permRepo.find({ select: ['code'] });
        return perms.map((p) => p.code);
      }
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.roleId);
    const rolePerms = await this.rolePermRepo.find({
      where: { roleId: In(roleIds) },
      relations: ['permission'],
    });

    const codes = new Set<string>();
    for (const rp of rolePerms) {
      if (rp.permission?.code) {
        codes.add(rp.permission.code);
      }
    }
    return Array.from(codes);
  }

  async assignRolesToUser(userId: string, roleNames: string[]) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const roles = await this.roleRepo.find({
      where: { name: In(roleNames) },
    });

    await this.userRoleRepo.delete({ userId });

    const toCreate = roles.map((role) =>
      this.userRoleRepo.create({ userId, roleId: role.id }),
    );
    await this.userRoleRepo.save(toCreate);
  }
}

