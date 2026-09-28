// Form validation utilities for admin dashboard

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateRequired(value: unknown, fieldName: string): ValidationError | null {
  if (value === undefined || value === null || value === '') {
    return { field: fieldName, message: `${fieldName} không được để trống` };
  }
  return null;
}

export function validatePositiveNumber(value: number, fieldName: string): ValidationError | null {
  if (isNaN(value) || value < 0) {
    return { field: fieldName, message: `${fieldName} phải là số dương` };
  }
  return null;
}

export function validatePrice(value: number): ValidationError | null {
  if (isNaN(value) || value < 0) {
    return { field: 'price', message: 'Giá phải là số dương' };
  }
  if (value > 100000000) {
    return { field: 'price', message: 'Giá không được vượt quá 100,000,000 VND' };
  }
  return null;
}

export function validateStock(value: number): ValidationError | null {
  if (isNaN(value) || value < 0 || !Number.isInteger(value)) {
    return { field: 'stock', message: 'Tồn kho phải là số nguyên không âm' };
  }
  return null;
}

export function validateColor(value: string): ValidationError | null {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(value)) {
    return { field: 'color', message: 'Màu phải có định dạng hex (ví dụ: #FF0000)' };
  }
  return null;
}

export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationError | null {
  if (value < min || value > max) {
    return { field: fieldName, message: `${fieldName} phải từ ${min} đến ${max}` };
  }
  return null;
}

export function validateBeadProduct(data: {
  name: string;
  material: string;
  color: string;
  price: number;
  metalness: number;
  roughness: number;
  stock: number;
  sku: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const nameErr = validateRequired(data.name, 'Tên sản phẩm');
  if (nameErr) errors.push(nameErr);

  const matErr = validateRequired(data.material, 'Chất liệu');
  if (matErr) errors.push(matErr);

  const colorErr = validateColor(data.color);
  if (colorErr) errors.push(colorErr);

  const priceErr = validatePrice(data.price);
  if (priceErr) errors.push(priceErr);

  const metalErr = validateRange(data.metalness, 0, 1, 'Metalness');
  if (metalErr) errors.push(metalErr);

  const roughErr = validateRange(data.roughness, 0, 1, 'Roughness');
  if (roughErr) errors.push(roughErr);

  const stockErr = validateStock(data.stock);
  if (stockErr) errors.push(stockErr);

  const skuErr = validateRequired(data.sku, 'SKU');
  if (skuErr) errors.push(skuErr);

  return { valid: errors.length === 0, errors };
}
