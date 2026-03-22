import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('MANAGE_EMPLOYEE')
  async findAll(
    @CompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 20 : 20;
    const result = await this.usersService.findAll(companyId, pageNum, limitNum);
    return { success: true, ...result };
  }

  @Post()
  @Permissions('MANAGE_EMPLOYEE')
  async create(
    @CompanyId() companyId: string,
    @Body() dto: CreateUserDto,
  ) {
    const data = await this.usersService.create(companyId, dto);
    return { success: true, data };
  }

  @Patch(':id/roles')
  @Permissions('MANAGE_EMPLOYEE')
  async updateRoles(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body('roles') roles: string[],
  ) {
    const data = await this.usersService.updateRoles(companyId, id, roles || []);
    return { success: true, data };
  }
}

