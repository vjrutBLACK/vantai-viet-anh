import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../../entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async create(companyId: string, dto: CreateSupplierDto) {
    if (dto.code?.trim()) {
      const dup = await this.supplierRepository.findOne({
        where: { companyId, code: dto.code.trim() },
      });
      if (dup) {
        throw new BadRequestException('Mã nhà cung cấp đã tồn tại');
      }
    }
    const supplier = this.supplierRepository.create({
      ...dto,
      code: dto.code?.trim() || null,
      companyId,
      status: dto.status ?? 'active',
    });
    return this.supplierRepository.save(supplier);
  }

  async findAll(companyId: string) {
    return this.supplierRepository.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async findOneOrFail(companyId: string, id: string): Promise<Supplier> {
    const s = await this.supplierRepository.findOne({ where: { id, companyId } });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }
}
