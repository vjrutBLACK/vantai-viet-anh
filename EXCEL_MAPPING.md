# Excel Mapping Guide - Mapping từ Excel sang Database

## Giả định cấu trúc Excel

Dựa trên nghiệp vụ quản lý vận tải, mỗi dòng Excel thường chứa thông tin về một chuyến xe. Dưới đây là mapping chi tiết:

## Mapping Table

| Cột Excel | Tên Field | Database Table | Field Name | Data Type | Notes |
|-----------|-----------|----------------|------------|-----------|-------|
| A | Ngày chuyến | trips | trip_date | DATE | Parse nhiều format: dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd |
| B | Mã chuyến | trips | trip_code | VARCHAR(100) | Unique per company |
| C | Biển số xe | vehicles | license_plate | VARCHAR(20) | Lookup hoặc tạo mới |
| D | Lái xe | employees | full_name | VARCHAR(255) | Lookup theo tên, position = "lái xe" |
| E | Phụ xe | employees | full_name | VARCHAR(255) | Lookup theo tên, position = "phụ xe", nullable |
| F | Khách hàng | customers | name | VARCHAR(255) | Lookup hoặc tạo mới |
| G | Điểm đi | trips | origin | VARCHAR(255) | |
| H | Điểm đến | trips | destination | VARCHAR(255) | |
| I | Khoảng cách (km) | trips | distance | DECIMAL(10,2) | Parse số, có thể có dấu phẩy |
| J | Loại hàng | trips | cargo_type | VARCHAR(100) | |
| K | Trọng lượng (tấn) | trips | cargo_weight | DECIMAL(10,2) | Parse số |
| L | Số lượng | trips | cargo_quantity | INTEGER | |
| M | Doanh thu | trips | revenue | DECIMAL(15,2) | Parse số tiền, có thể có dấu phẩy/chấm |
| N | Chi phí xăng | trips | fuel_cost | DECIMAL(15,2) | |
| O | Chi phí cầu đường | trips | toll_cost | DECIMAL(15,2) | |
| P | Lương lái xe | trips | driver_salary | DECIMAL(15,2) | |
| Q | Chi phí khác | trips | other_costs | DECIMAL(15,2) | |
| R | Lợi nhuận | trips | profit | DECIMAL(15,2) | **Tính toán**: revenue - (fuel + toll + salary + other) |
| S | Ghi chú | trips | notes | TEXT | |

## Quy trình Import chi tiết

### Bước 1: Parse Excel File
```javascript
// Pseudo code
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { 
  header: 1, 
  defval: null,
  raw: false // Convert dates to strings
});
```

### Bước 2: Validate Header Row
Kiểm tra header row (row 1) có đúng format không:
- Có thể có nhiều format header (tiếng Việt, tiếng Anh, hoặc không có header)
- Auto-detect header row bằng pattern matching
- Support cả có/không có header

### Bước 3: Parse từng dòng

#### 3.1. Parse Date
```javascript
function parseDate(dateStr) {
  // Support multiple formats
  const formats = [
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'YYYY-MM-DD',
    'DD-MM-YYYY'
  ];
  
  for (const format of formats) {
    const parsed = moment(dateStr, format, true);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }
  
  throw new Error(`Invalid date format: ${dateStr}`);
}
```

#### 3.2. Parse Number (Money)
```javascript
function parseMoney(moneyStr) {
  if (!moneyStr) return 0;
  
  // Remove currency symbols, spaces
  let cleaned = moneyStr.toString()
    .replace(/[₫$€£,]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Handle dot as thousand separator (1.000.000)
  // vs dot as decimal (1.5)
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal: 1.5
      cleaned = cleaned.replace('.', '');
    } else {
      // Thousand separator: 1.000.000
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  return parseFloat(cleaned) || 0;
}
```

#### 3.3. Lookup/Create Vehicle
```javascript
async function lookupOrCreateVehicle(companyId, licensePlate) {
  // Normalize license plate
  const normalized = normalizeLicensePlate(licensePlate);
  
  // Lookup in cache first
  if (vehicleCache[normalized]) {
    return vehicleCache[normalized];
  }
  
  // Lookup in database
  let vehicle = await Vehicle.findOne({
    where: { 
      company_id: companyId,
      license_plate: normalized 
    }
  });
  
  // If not found, check data_mappings
  if (!vehicle) {
    const mapping = await DataMapping.findOne({
      where: {
        company_id: companyId,
        entity_type: 'vehicle',
        source_value: licensePlate
      }
    });
    
    if (mapping) {
      vehicle = await Vehicle.findByPk(mapping.target_id);
    }
  }
  
  // If still not found, create new
  if (!vehicle) {
    vehicle = await Vehicle.create({
      company_id: companyId,
      license_plate: normalized,
      status: 'active'
    });
  }
  
  // Cache for this import session
  vehicleCache[normalized] = vehicle;
  return vehicle;
}

function normalizeLicensePlate(plate) {
  return plate
    .toUpperCase()
    .replace(/\s/g, '')
    .replace(/-/g, '');
}
```

#### 3.4. Lookup/Create Employee (Driver/Co-driver)
```javascript
async function lookupOrCreateEmployee(companyId, fullName, position) {
  // Normalize name
  const normalized = normalizeName(fullName);
  
  // Check cache
  if (employeeCache[normalized]) {
    return employeeCache[normalized];
  }
  
  // Fuzzy search in database
  let employee = await Employee.findOne({
    where: {
      company_id: companyId,
      position: position
    }
  });
  
  // Use fuzzy matching
  const employees = await Employee.findAll({
    where: { company_id: companyId, position: position }
  });
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const emp of employees) {
    const score = levenshteinDistance(
      normalized, 
      normalizeName(emp.full_name)
    );
    const similarity = 1 - (score / Math.max(normalized.length, emp.full_name.length));
    
    if (similarity > 0.8 && similarity > bestScore) {
      bestMatch = emp;
      bestScore = similarity;
    }
  }
  
  if (bestMatch) {
    // Create mapping for future
    await DataMapping.upsert({
      company_id: companyId,
      entity_type: 'employee',
      source_value: fullName,
      target_id: bestMatch.id,
      confidence_score: bestScore
    });
    
    employeeCache[normalized] = bestMatch;
    return bestMatch;
  }
  
  // Create new employee
  employee = await Employee.create({
    company_id: companyId,
    full_name: fullName,
    position: position,
    status: 'active'
  });
  
  employeeCache[normalized] = employee;
  return employee;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}
```

#### 3.5. Lookup/Create Customer
Tương tự như Employee, sử dụng fuzzy matching.

### Bước 4: Create Trip Record
```javascript
async function createTrip(companyId, rowData, entities) {
  // Calculate profit
  const profit = rowData.revenue - (
    rowData.fuel_cost + 
    rowData.toll_cost + 
    rowData.driver_salary + 
    rowData.other_costs
  );
  
  // Validate profit matches Excel (if provided)
  if (rowData.profit !== null && Math.abs(rowData.profit - profit) > 0.01) {
    // Log warning but use calculated value
    console.warn(`Profit mismatch: Excel=${rowData.profit}, Calculated=${profit}`);
  }
  
  const trip = await Trip.create({
    company_id: companyId,
    trip_code: rowData.trip_code,
    trip_date: rowData.trip_date,
    vehicle_id: entities.vehicle.id,
    driver_id: entities.driver.id,
    co_driver_id: entities.coDriver?.id,
    customer_id: entities.customer.id,
    cargo_type: rowData.cargo_type,
    cargo_weight: rowData.cargo_weight,
    cargo_quantity: rowData.cargo_quantity,
    origin: rowData.origin,
    destination: rowData.destination,
    distance: rowData.distance,
    revenue: rowData.revenue,
    fuel_cost: rowData.fuel_cost,
    toll_cost: rowData.toll_cost,
    driver_salary: rowData.driver_salary,
    other_costs: rowData.other_costs,
    profit: profit, // Use calculated value
    status: 'completed',
    notes: rowData.notes
  });
  
  return trip;
}
```

### Bước 5: Handle Errors & Warnings

#### Error Types:
1. **Required Field Missing**: Thiếu thông tin bắt buộc (xe, lái xe, khách hàng)
2. **Invalid Date Format**: Không parse được ngày
3. **Invalid Number Format**: Không parse được số tiền
4. **Duplicate Trip Code**: Mã chuyến đã tồn tại (nếu không overwrite)
5. **Foreign Key Constraint**: Reference đến entity không tồn tại

#### Warning Types:
1. **Fuzzy Match**: Tìm thấy entity với similarity < 1.0
2. **Profit Mismatch**: Profit tính toán khác với Excel
3. **Auto-created Entity**: Tự động tạo mới vehicle/employee/customer
4. **Empty Optional Field**: Trường optional bị trống

## Example: Full Import Flow

```javascript
async function importTripsFromExcel(companyId, filePath, options = {}) {
  const {
    sheetName = null,
    startRow = 2,
    overwrite = false
  } = options;
  
  // Step 1: Parse Excel
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const targetSheet = sheetName || sheetNames[0];
  const sheet = workbook.Sheets[targetSheet];
  const rows = XLSX.utils.sheet_to_json(sheet, { 
    header: 1, 
    defval: null 
  });
  
  // Step 2: Detect header row
  const headerRow = detectHeaderRow(rows);
  const dataRows = rows.slice(headerRow + 1);
  
  // Step 3: Initialize caches
  const vehicleCache = {};
  const employeeCache = {};
  const customerCache = {};
  
  // Step 4: Process rows
  const results = {
    success: [],
    errors: [],
    warnings: []
  };
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = headerRow + 2 + i; // Excel row number (1-based)
    
    try {
      // Parse row data
      const rowData = parseRow(row, headerRow);
      
      // Validate required fields
      validateRow(rowData, rowNumber);
      
      // Lookup/Create entities
      const entities = {
        vehicle: await lookupOrCreateVehicle(companyId, rowData.license_plate),
        driver: await lookupOrCreateEmployee(companyId, rowData.driver_name, 'lái xe'),
        coDriver: rowData.co_driver_name 
          ? await lookupOrCreateEmployee(companyId, rowData.co_driver_name, 'phụ xe')
          : null,
        customer: await lookupOrCreateCustomer(companyId, rowData.customer_name)
      };
      
      // Check duplicate
      if (!overwrite) {
        const existing = await Trip.findOne({
          where: {
            company_id: companyId,
            trip_code: rowData.trip_code
          }
        });
        
        if (existing) {
          results.errors.push({
            row: rowNumber,
            message: `Mã chuyến ${rowData.trip_code} đã tồn tại`
          });
          continue;
        }
      }
      
      // Create trip
      const trip = await createTrip(companyId, rowData, entities);
      
      results.success.push({
        row: rowNumber,
        tripId: trip.id,
        tripCode: trip.trip_code
      });
      
    } catch (error) {
      results.errors.push({
        row: rowNumber,
        message: error.message,
        data: row
      });
    }
  }
  
  return results;
}
```

## Data Normalization Rules

### License Plate
- Uppercase
- Remove spaces and hyphens
- Example: "29A-12345" → "29A12345"

### Name (Employee/Customer)
- Lowercase
- Remove accents
- Trim spaces
- Example: "Nguyễn Văn A" → "nguyen van a"

### Date
- Standardize to ISO format: YYYY-MM-DD
- Handle multiple input formats

### Money
- Remove currency symbols
- Remove thousand separators
- Parse as decimal
- Example: "1.500.000 ₫" → 1500000

## Duplicate Detection

### Trip Duplicate Check
```sql
-- Check by trip_code
SELECT * FROM trips 
WHERE company_id = ? AND trip_code = ?

-- Or check by combination
SELECT * FROM trips 
WHERE company_id = ? 
  AND trip_date = ?
  AND vehicle_id = ?
  AND driver_id = ?
  AND customer_id = ?
```

## Performance Optimization

1. **Batch Lookups**: Thay vì lookup từng entity, collect tất cả và lookup một lần
2. **In-Memory Cache**: Cache entities trong memory khi import
3. **Batch Inserts**: Insert nhiều trips cùng lúc với transaction
4. **Async Processing**: Import chạy background job để không block request

## Validation Rules

### Required Fields
- trip_date
- license_plate (hoặc vehicle_id)
- driver_name (hoặc driver_id)
- customer_name (hoặc customer_id)
- revenue

### Optional but Recommended
- trip_code (nếu không có sẽ auto-generate)
- destination
- distance

### Business Rules
- trip_date không được trong tương lai (có thể config)
- revenue >= 0
- Các chi phí >= 0
- profit = revenue - (sum of costs)
