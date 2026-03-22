import * as path from 'path';
import * as XLSX from 'xlsx';

type Sheet = {
  name: string;
  rows: (string | number)[][];
  colWidths?: number[];
};

function addSheet(workbook: XLSX.WorkBook, sheet: Sheet) {
  const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
  if (sheet.colWidths?.length) {
    (ws as any)['!cols'] = sheet.colWidths.map((w) => ({ wch: w }));
  }
  XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
}

function writeXlsx(filePath: string, sheets: Sheet[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) addSheet(wb, s);
  XLSX.writeFile(wb, filePath, { bookType: 'xlsx' });
}

const outDir = path.resolve(process.cwd(), 'templates');

// Vehicles template
writeXlsx(path.join(outDir, 'import-vehicles-template.xlsx'), [
  {
    name: 'Vehicles',
    colWidths: [18, 16, 14, 14, 8, 12, 16],
    rows: [
      ['Biển số', 'Loại xe', 'Hãng', 'Model', 'Năm', 'Tải trọng', 'Trạng thái'],
      ['29C-123.45', 'Xe tải 8T', 'KIA', 'K250', 2025, 8000, 'ACTIVE'],
      ['30A-888.88', 'Container', 'Hyundai', 'HD320', 2020, 20000, 'MAINTENANCE'],
    ],
  },
]);

// Employees template
writeXlsx(path.join(outDir, 'import-employees-template.xlsx'), [
  {
    name: 'Employees',
    colWidths: [12, 22, 14, 22, 12, 12, 12, 14, 16],
    rows: [
      ['Mã NV', 'Họ tên', 'Số điện thoại', 'Email', 'Vị trí', 'Số GPLX', 'Hạng GPLX', 'Lương cơ bản', 'Trạng thái'],
      ['NV001', 'Nguyễn Văn A', '0988888888', 'a@company.com', 'Lái xe', '123456789', 'C', 10000000, 'ACTIVE'],
      ['NV002', 'Trần Thị B', '0901234567', 'b@company.com', 'Kế toán', '', '', 12000000, 'ON_LEAVE'],
    ],
  },
]);

// Customers template
writeXlsx(path.join(outDir, 'import-customers-template.xlsx'), [
  {
    name: 'Customers',
    colWidths: [28, 14, 22, 22, 14, 16, 18, 16, 12, 14],
    rows: [
      [
        'Tên khách hàng',
        'Số điện thoại',
        'Email',
        'Địa chỉ',
        'Mã khách',
        'MST',
        'Người liên hệ',
        'Nhân viên phụ trách',
        'Hoa hồng (%)',
        'Trạng thái',
      ],
      ['Công ty ABC', '0901234567', 'info@abc.com', 'Hà Nội', 'ABC001', '0101234567', 'Anh A', 'NV001', 5, 'ACTIVE'],
      ['Công ty XYZ', '0909999999', 'info@xyz.com', 'Hải Phòng', 'XYZ001', '', 'Chị B', 'NV002', 3, 'INACTIVE'],
    ],
  },
]);

console.log('Generated templates in ./templates');

