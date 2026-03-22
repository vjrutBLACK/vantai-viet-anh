import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly rbacService: RbacService,
  ) {}

  async create(companyId: string, dto: CreateUserDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
      companyId,
      role: 'staff',
      status: 'active',
    });

    const saved = await this.userRepo.save(user);
    await this.rbacService.assignRolesToUser(saved.id, dto.roles);

    return {
      id: saved.id,
      email: saved.email,
      fullName: saved.fullName,
      companyId: saved.companyId,
      status: saved.status,
      roles: dto.roles,
    };
  }

  async findAll(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepo.findAndCount({
      where: { companyId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const data = await Promise.all(
      users.map(async (u) => {
        const roles = await this.rbacService.getUserPermissions(u.id);
        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          companyId: u.companyId,
          status: u.status,
          role: u.role,
          permissions: roles,
        };
      }),
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateRoles(companyId: string, userId: string, roles: string[]) {
    const user = await this.userRepo.findOne({ where: { id: userId, companyId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.rbacService.assignRolesToUser(user.id, roles);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      companyId: user.companyId,
      status: user.status,
      roles,
    };
  }
}

