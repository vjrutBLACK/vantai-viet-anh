## Import Excel templates

Các file mẫu:

- `import-vehicles-template.xlsx`
  - Header: `Biển số | Loại xe | Hãng | Model | Năm | Tải trọng | Trạng thái`
  - Trạng thái hợp lệ: `ACTIVE`, `MAINTENANCE`, `INACTIVE` (hoặc `Hoạt động`, `Bảo trì`, `Nghỉ`)

- `import-employees-template.xlsx`
  - Header: `Tên | Vai trò | SĐT | Email | Lương cơ bản | Mã NV | Số GPLX | Hạng GPLX | Trạng thái`
  - Vai trò hợp lệ: `DRIVER`, `ACCOUNTANT`, `OPERATOR`, `ADMIN`
  - Trạng thái hợp lệ: `ACTIVE`, `INACTIVE`, `ON_LEAVE`

- `import-customers-template.xlsx`
  - Header: `Tên khách | SĐT | Email | Địa chỉ | Mã khách | MST | Người liên hệ | Trạng thái`
  - Trạng thái hợp lệ: `ACTIVE`, `INACTIVE`

API upload:

- `POST /api/v1/import/vehicles` (multipart field `file`)
- `POST /api/v1/import/employees`
- `POST /api/v1/import/customers`

