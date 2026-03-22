import { DataSource } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { RolePermission } from '../../entities/role-permission.entity';

export async function seedRbac(dataSource: DataSource) {
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const rolePermRepo = dataSource.getRepository(RolePermission);

  const roleNames = ['ADMIN', 'ACCOUNTANT', 'DISPATCHER', 'STAFF'];
  const permCodes = [
    'MANAGE_EMPLOYEE',
    'MANAGE_VEHICLE',
    'MANAGE_PAYROLL',
    'VIEW_REPORT',
    'CREATE_TRIP',
    'UPDATE_TRIP',
    'ASSIGN_DRIVER',
  ];

  const roles = await Promise.all(
    roleNames.map(async (name) => {
      let role = await roleRepo.findOne({ where: { name } });
      if (!role) {
        role = roleRepo.create({ name });
        role = await roleRepo.save(role);
      }
      return role;
    }),
  );

  const perms = await Promise.all(
    permCodes.map(async (code) => {
      let perm = await permRepo.findOne({ where: { code } });
      if (!perm) {
        perm = permRepo.create({ code });
        perm = await permRepo.save(perm);
      }
      return perm;
    }),
  );

  const byName = Object.fromEntries(roles.map((r) => [r.name, r]));
  const byCode = Object.fromEntries(perms.map((p) => [p.code, p]));

  const mapping: Record<string, string[]> = {
    ADMIN: permCodes,
    ACCOUNTANT: ['MANAGE_EMPLOYEE', 'MANAGE_VEHICLE', 'MANAGE_PAYROLL', 'VIEW_REPORT'],
    DISPATCHER: ['CREATE_TRIP', 'UPDATE_TRIP', 'ASSIGN_DRIVER', 'VIEW_REPORT'],
    STAFF: [],
  };

  for (const [roleName, codes] of Object.entries(mapping)) {
    const role = byName[roleName];
    if (!role) continue;
    for (const code of codes) {
      const perm = byCode[code];
      if (!perm) continue;
      const exists = await rolePermRepo.findOne({
        where: { roleId: role.id, permissionId: perm.id },
      });
      if (!exists) {
        const rp = rolePermRepo.create({
          roleId: role.id,
          permissionId: perm.id,
        });
        await rolePermRepo.save(rp);
      }
    }
  }
}

