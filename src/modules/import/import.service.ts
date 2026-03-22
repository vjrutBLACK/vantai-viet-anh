import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Vehicle } from '../../entities/vehicle.entity';
import { Employee } from '../../entities/employee.entity';
import { Customer } from '../../entities/customer.entity';
import { ImportResult, ImportType, ImportError } from './import.types';

const MAX_ROWS = 5000;
const CHUNK_SIZE = 100;

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async import(companyId: string, type: ImportType, fileBuffer: Buffer): Promise<ImportResult> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

    if (!rows.length) {
      throw new BadRequestException('Empty file');
    }

    // Remove empty trailing rows
    const trimmed = rows.filter((r) => Array.isArray(r) && r.some((c) => c !== null && c !== ''));

    if (trimmed.length - 1 > MAX_ROWS) {
      throw new BadRequestException(`Max rows exceeded (${MAX_ROWS})`);
    }

    const headerRow = (trimmed[0] as any[]).map((c) => this.normHeader(c));
    const dataRows = trimmed.slice(1);

    if (type === 'vehicles') return this.importVehicles(companyId, headerRow, dataRows);
    if (type === 'employees') return this.importEmployees(companyId, headerRow, dataRows);
    return this.importCustomers(companyId, headerRow, dataRows);
  }

  private async importVehicles(companyId: string, header: string[], rows: any[]): Promise<ImportResult> {
    const idxPlate = this.findCol(header, ['biển số', 'bien so', 'plate', 'license plate']);
    const idxType = this.findCol(header, ['loại xe', 'loai xe', 'type']);
    const idxBrand = this.findCol(header, ['hãng', 'hang', 'brand']);
    const idxModel = this.findCol(header, ['model', 'mẫu', 'mau']);
    const idxYear = this.findCol(header, ['năm', 'nam', 'year']);
    const idxCapacity = this.findCol(header, ['tải trọng', 'tai trong', 'capacity']);
    const idxStatus = this.findCol(header, ['trạng thái', 'trang thai', 'status']);

    if (idxPlate === -1) throw new BadRequestException('Missing required column: Biển số');

    const errors: ImportError[] = [];
    const candidates: {
      row: number;
      licensePlate: string;
      vehicleType?: string;
      brand?: string;
      model?: string;
      year?: number;
      capacity?: number;
      status: string;
    }[] = [];

    const seenPlate = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2;
      const r = rows[i] as any[];
      const plateRaw = this.str(r[idxPlate]);
      const plate = this.normalizePlate(plateRaw);

      if (!plate) {
        errors.push({ row: excelRow, field: 'licensePlate', message: 'Missing vehicle plate' });
        continue;
      }
      if (seenPlate.has(plate)) {
        errors.push({ row: excelRow, field: 'licensePlate', message: 'Duplicate vehicle plate in file' });
        continue;
      }
      seenPlate.add(plate);

      const statusRaw = idxStatus >= 0 ? this.str(r[idxStatus]) : '';
      const status = this.mapVehicleStatus(statusRaw);
      if (!status) {
        errors.push({ row: excelRow, field: 'status', message: 'Invalid status (ACTIVE/MAINTENANCE)' });
        continue;
      }

      const vehicleType = idxType >= 0 ? this.str(r[idxType]) : undefined;
      const brand = idxBrand >= 0 ? this.str(r[idxBrand]) : undefined;
      const model = idxModel >= 0 ? this.str(r[idxModel]) : undefined;
      const year = idxYear >= 0 ? (this.num(r[idxYear]) ?? undefined) : undefined;
      const capacity = idxCapacity >= 0 ? this.num(r[idxCapacity]) : undefined;

      candidates.push({ row: excelRow, licensePlate: plate, vehicleType, brand, model, year, capacity, status });
    }

    // Check duplicates in DB
    const plates = candidates.map((c) => c.licensePlate);
    const existing = plates.length
      ? await this.vehicleRepo.find({ where: { companyId, licensePlate: In(plates) }, select: ['licensePlate'] })
      : [];
    const existingSet = new Set(existing.map((v) => this.normalizePlate(v.licensePlate)));

    const toInsert = [];
    for (const c of candidates) {
      if (existingSet.has(c.licensePlate)) {
        errors.push({ row: c.row, field: 'licensePlate', message: 'Vehicle plate already exists' });
        continue;
      }
      toInsert.push(
        this.vehicleRepo.create({
          companyId,
          licensePlate: c.licensePlate,
          vehicleType: c.vehicleType || null,
          brand: c.brand || null,
          model: c.model || null,
          year: c.year ?? null,
          capacity: c.capacity ?? null,
          status: c.status,
        }),
      );
    }

    const success = await this.bulkSave(toInsert, async (entity, e) => {
      errors.push({ row: (entity as any).__row ?? 0, message: e?.message || 'Insert failed' });
    });

    return { success, failed: errors.length, errors };
  }

  private async importEmployees(companyId: string, header: string[], rows: any[]): Promise<ImportResult> {
    const idxName = this.findCol(header, ['họ tên', 'ho ten', 'tên', 'ten', 'name']);
    const idxRole = this.findCol(header, ['vai trò', 'vai tro', 'role', 'vị trí', 'vi tri', 'position']);
    const idxCode = this.findCol(header, ['mã nv', 'ma nv', 'employee code', 'employee_code']);
    const idxPhone = this.findCol(header, ['số điện thoại', 'so dien thoai', 'sđt', 'sdt', 'phone', 'điện thoại', 'dien thoai']);
    const idxEmail = this.findCol(header, ['email', 'e-mail']);
    const idxSalary = this.findCol(header, ['lương cơ bản', 'luong co ban', 'base salary']);
    const idxLicenseNumber = this.findCol(header, ['số gplx', 'so gplx', 'license number', 'license_no']);
    const idxLicenseType = this.findCol(header, ['hạng gplx', 'hang gplx', 'license type', 'license_class']);
    const idxStatus = this.findCol(header, ['trạng thái', 'trang thai', 'status']);

    if (idxName === -1) throw new BadRequestException('Missing required column: Tên');
    if (idxRole === -1) throw new BadRequestException('Missing required column: Vai trò/Vị trí');

    const errors: ImportError[] = [];
    const candidates: {
      row: number;
      fullName: string;
      position: string;
      employeeCode?: string;
      phone?: string;
      email?: string;
      baseSalary?: number;
      licenseNumber?: string;
      licenseType?: string;
      status: string;
    }[] = [];

    const seenPhone = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2;
      const r = rows[i] as any[];
      const fullName = this.str(r[idxName]);
      const roleRaw = this.str(r[idxRole]);
      const position = this.mapEmployeeRole(roleRaw) || this.mapEmployeePosition(roleRaw);

      if (!fullName) {
        errors.push({ row: excelRow, field: 'name', message: 'Missing employee name' });
        continue;
      }
      if (!position) {
        errors.push({ row: excelRow, field: 'role', message: 'Invalid role (DRIVER/ACCOUNTANT/OPERATOR/ADMIN)' });
        continue;
      }

      const phone = idxPhone >= 0 ? this.str(r[idxPhone]) : '';
      const normPhone = phone ? phone.replace(/\s/g, '') : '';
      if (normPhone) {
        if (seenPhone.has(normPhone)) {
          errors.push({ row: excelRow, field: 'phone', message: 'Duplicate phone in file' });
          continue;
        }
        seenPhone.add(normPhone);
      }

      const statusRaw = idxStatus >= 0 ? this.str(r[idxStatus]) : '';
      const status = this.mapEmployeeStatus(statusRaw);
      if (!status) {
        errors.push({ row: excelRow, field: 'status', message: 'Invalid status (ACTIVE/INACTIVE/ON_LEAVE)' });
        continue;
      }

      const baseSalary = idxSalary >= 0 ? this.money(r[idxSalary]) : 0;
      const employeeCode = idxCode >= 0 ? this.str(r[idxCode]) : '';
      const email = idxEmail >= 0 ? this.str(r[idxEmail]) : '';
      const licenseNumber = idxLicenseNumber >= 0 ? this.str(r[idxLicenseNumber]) : '';
      const licenseType = idxLicenseType >= 0 ? this.str(r[idxLicenseType]) : '';

      candidates.push({
        row: excelRow,
        fullName,
        position,
        employeeCode: employeeCode || null,
        phone: normPhone || null,
        email: email || null,
        baseSalary,
        licenseNumber: licenseNumber || null,
        licenseType: licenseType || null,
        status,
      });
    }

    // Check phone duplicates in DB (optional but recommended)
    const phones = candidates.map((c) => c.phone).filter(Boolean) as string[];
    const existing = phones.length
      ? await this.employeeRepo.find({ where: { companyId, phone: In(phones) }, select: ['phone'] })
      : [];
    const existingSet = new Set(existing.map((e) => (e.phone || '').replace(/\s/g, '')));

    const toInsert = [];
    for (const c of candidates) {
      if (c.phone && existingSet.has(c.phone)) {
        errors.push({ row: c.row, field: 'phone', message: 'Phone already exists' });
        continue;
      }
      toInsert.push(
        this.employeeRepo.create({
          companyId,
          fullName: c.fullName,
          position: c.position,
          employeeCode: c.employeeCode,
          phone: c.phone,
          email: c.email,
          baseSalary: c.baseSalary ?? 0,
          licenseNumber: c.licenseNumber,
          licenseType: c.licenseType,
          status: c.status,
        }),
      );
    }

    const success = await this.bulkSave(toInsert, async (entity, e) => {
      errors.push({ row: (entity as any).__row ?? 0, message: e?.message || 'Insert failed' });
    });

    return { success, failed: errors.length, errors };
  }

  private async importCustomers(companyId: string, header: string[], rows: any[]): Promise<ImportResult> {
    const idxName = this.findCol(header, [
      'tên khách',
      'ten khach',
      'tên khách hàng',
      'ten khach hang',
      'name',
      'customer name',
      'khách hàng',
      'khach hang',
    ]);
    const idxPhone = this.findCol(header, ['sđt', 'sdt', 'phone', 'điện thoại', 'dien thoai']);
    const idxEmail = this.findCol(header, ['email', 'e-mail']);
    const idxAddress = this.findCol(header, ['địa chỉ', 'dia chi', 'address']);
    const idxCode = this.findCol(header, ['mã khách', 'ma khach', 'code', 'customer code']);
    const idxTaxCode = this.findCol(header, ['mst', 'mã số thuế', 'ma so thue', 'tax code']);
    const idxContactPerson = this.findCol(header, ['người liên hệ', 'nguoi lien he', 'contact person']);
    const idxAccountOwner = this.findCol(header, [
      'nhân viên phụ trách',
      'nhan vien phu trach',
      'account owner',
      'phụ trách',
      'phu trach',
    ]);
    const idxCommissionRate = this.findCol(header, ['hoa hồng (%)', 'hoa hong (%)', 'commission (%)', 'commission rate']);
    const idxStatus = this.findCol(header, ['trạng thái', 'trang thai', 'status']);

    if (idxName === -1) throw new BadRequestException('Missing required column: Tên khách');

    const errors: ImportError[] = [];
    const candidates: {
      row: number;
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      code?: string;
      taxCode?: string;
      contactPerson?: string;
      contactEmployeeId?: string;
      commissionRate?: number;
      status?: string;
    }[] = [];

    const seenCode = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2;
      const r = rows[i] as any[];
      const name = this.str(r[idxName]);
      if (!name) {
        errors.push({ row: excelRow, field: 'name', message: 'Missing customer name' });
        continue;
      }

      const phone = idxPhone >= 0 ? this.str(r[idxPhone]).replace(/\s/g, '') : '';
      const email = idxEmail >= 0 ? this.str(r[idxEmail]) : '';
      const address = idxAddress >= 0 ? this.str(r[idxAddress]) : '';
      const code = idxCode >= 0 ? this.str(r[idxCode]) : '';
      const normCode = code ? code.trim() : '';
      const taxCode = idxTaxCode >= 0 ? this.str(r[idxTaxCode]) : '';
      const contactPerson = idxContactPerson >= 0 ? this.str(r[idxContactPerson]) : '';

      let contactEmployeeId: string = null;
      if (idxAccountOwner >= 0) {
        const ownerRaw = this.str(r[idxAccountOwner]);
        if (ownerRaw) {
          // Accept employeeCode (NV001) or fullName
          const byCode = await this.employeeRepo.findOne({
            where: { companyId, employeeCode: ownerRaw },
            select: ['id'],
          });
          if (byCode) {
            contactEmployeeId = byCode.id;
          } else {
            const byName = await this.employeeRepo.findOne({
              where: { companyId, fullName: ownerRaw },
              select: ['id'],
            });
            if (byName) {
              contactEmployeeId = byName.id;
            } else {
              errors.push({
                row: excelRow,
                field: 'contactEmployee',
                message: `Không tìm thấy nhân viên phụ trách: ${ownerRaw}`,
              });
              continue;
            }
          }
        }
      }

      const commissionRate =
        idxCommissionRate >= 0 ? (this.num(r[idxCommissionRate]) ?? 0) : 0;
      if (commissionRate < 0 || commissionRate > 100) {
        errors.push({
          row: excelRow,
          field: 'commissionRate',
          message: 'Hoa hồng phải trong khoảng 0-100',
        });
        continue;
      }
      const statusRaw = idxStatus >= 0 ? this.str(r[idxStatus]) : '';
      const status = this.mapCustomerStatus(statusRaw);
      if (idxStatus >= 0 && !status) {
        errors.push({ row: excelRow, field: 'status', message: 'Invalid status (ACTIVE/INACTIVE)' });
        continue;
      }

      if (normCode) {
        if (seenCode.has(normCode)) {
          errors.push({ row: excelRow, field: 'code', message: 'Duplicate customer code in file' });
          continue;
        }
        seenCode.add(normCode);
      }

      candidates.push({
        row: excelRow,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        code: normCode || null,
        taxCode: taxCode || null,
        contactPerson: contactPerson || null,
        contactEmployeeId,
        commissionRate,
        status: status || 'active',
      });
    }

    const codes = candidates.map((c) => c.code).filter(Boolean) as string[];
    const existing = codes.length
      ? await this.customerRepo.find({ where: { companyId, customerCode: In(codes) }, select: ['customerCode'] })
      : [];
    const existingSet = new Set(existing.map((c) => c.customerCode));

    const toInsert = [];
    for (const c of candidates) {
      if (c.code && existingSet.has(c.code)) {
        errors.push({ row: c.row, field: 'code', message: 'Customer code already exists' });
        continue;
      }
      toInsert.push(
        this.customerRepo.create({
          companyId,
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          customerCode: c.code,
          taxCode: c.taxCode,
          contactPerson: c.contactPerson,
          contactEmployeeId: c.contactEmployeeId,
          commissionRate: c.commissionRate ?? 0,
          status: c.status || 'active',
        }),
      );
    }

    const success = await this.bulkSave(toInsert, async (entity, e) => {
      errors.push({ row: (entity as any).__row ?? 0, message: e?.message || 'Insert failed' });
    });

    return { success, failed: errors.length, errors };
  }

  private async bulkSave<T>(entities: T[], onError: (entity: T, error: any) => Promise<void>) {
    let success = 0;
    for (let i = 0; i < entities.length; i += CHUNK_SIZE) {
      const chunk = entities.slice(i, i + CHUNK_SIZE);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const repo = this.getRepoForEntity(chunk[0] as any);
        await repo.save(chunk as any);
        success += chunk.length;
      } catch (e) {
        // Fallback: save one by one to collect errors
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const repo = this.getRepoForEntity(chunk[0] as any);
        for (const ent of chunk) {
          try {
            await repo.save(ent as any);
            success += 1;
          } catch (err) {
            await onError(ent, err);
          }
        }
      }
    }
    return success;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getRepoForEntity(entity: any): Repository<any> {
    if (!entity) throw new Error('No entity');
    if (entity instanceof Vehicle) return this.vehicleRepo;
    if (entity instanceof Employee) return this.employeeRepo;
    if (entity instanceof Customer) return this.customerRepo;
    // Fallback by presence of fields
    if ('licensePlate' in entity) return this.vehicleRepo;
    if ('baseSalary' in entity || 'position' in entity) return this.employeeRepo;
    return this.customerRepo;
  }

  private findCol(header: string[], candidates: string[]) {
    const set = new Set(candidates.map((c) => this.normHeader(c)));
    for (let i = 0; i < header.length; i++) {
      if (set.has(header[i])) return i;
    }
    return -1;
  }

  private normHeader(v: any) {
    return this.str(v)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private str(v: any) {
    if (v === null || v === undefined) return '';
    return v.toString().trim();
  }

  private num(v: any) {
    if (v === null || v === undefined || v === '') return null;
    const cleaned = v.toString().replace(/[,\s]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  private money(v: any) {
    if (v === null || v === undefined || v === '') return 0;
    let cleaned = v
      .toString()
      .replace(/[₫$€£,\s]/g, '')
      .trim();
    cleaned = cleaned.replace(/\./g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  private normalizePlate(plate: string) {
    return this.str(plate).toUpperCase().replace(/\s/g, '').replace(/-/g, '');
  }

  private mapVehicleStatus(v: string): string | null {
    const s = this.normHeader(v);
    if (!s) return 'active';
    if (['active', 'hoat dong', 'hoạt động'].includes(s)) return 'active';
    if (['maintenance', 'bao tri', 'bảo trì'].includes(s)) return 'maintenance';
    if (['inactive', 'nghi', 'nghỉ', 'off'].includes(s)) return 'inactive';
    return null;
  }

  private mapEmployeeRole(v: string): string | null {
    const s = this.normHeader(v);
    if (!s) return null;
    if (['driver', 'lai xe', 'lái xe'].includes(s)) return 'lái xe';
    if (['accountant', 'ke toan', 'kế toán'].includes(s)) return 'kế toán';
    if (['operator', 'dispatcher', 'dieu phoi', 'điều phối'].includes(s)) return 'điều phối';
    if (['admin', 'quan tri', 'quản trị'].includes(s)) return 'admin';
    return null;
  }

  // Accept direct position values from UI/Excel (e.g. "Lái xe", "Kế toán")
  private mapEmployeePosition(v: string): string | null {
    const s = this.normHeader(v);
    if (!s) return null;
    if (['lai xe', 'lái xe'].includes(s)) return 'lái xe';
    if (['ke toan', 'kế toán'].includes(s)) return 'kế toán';
    if (['dieu phoi', 'điều phối'].includes(s)) return 'điều phối';
    if (['admin'].includes(s)) return 'admin';
    return null;
  }

  private mapEmployeeStatus(v: string): string | null {
    const s = this.normHeader(v);
    if (!s) return 'active';
    if (['active', 'hoat dong', 'hoạt động'].includes(s)) return 'active';
    if (['inactive', 'nghi', 'nghỉ', 'off'].includes(s)) return 'inactive';
    if (['on_leave', 'on leave', 'nghi phep', 'nghỉ phép'].includes(s)) return 'on_leave';
    return null;
  }

  private mapCustomerStatus(v: string): string | null {
    const s = this.normHeader(v);
    if (!s) return 'active';
    if (['active', 'hoat dong', 'hoạt động'].includes(s)) return 'active';
    if (['inactive', 'nghi', 'nghỉ', 'off'].includes(s)) return 'inactive';
    return null;
  }
}

