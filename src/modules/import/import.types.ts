export type ImportType = 'vehicles' | 'employees' | 'customers';

export type ImportError = {
  row: number;
  field?: string;
  message: string;
};

export type ImportResult = {
  success: number;
  failed: number;
  errors: ImportError[];
};

