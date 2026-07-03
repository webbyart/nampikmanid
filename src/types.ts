/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Customer {
  id: string; // รหัสลูกค้า
  name: string; // ชื่อลูกค้า
  type: string; // ประเภท (เช่น ขายส่ง, ขายปลีก, ตัวแทน)
  priceGroup: 'A' | 'B' | 'C'; // กลุ่มราคา (ราคา A, ราคา B, ราคา C)
  paymentTerm: string; // ชำระ (เช่น เงินสด, เครดิต 15 วัน, เครดิต 30 วัน)
  address: string; // ที่อยู่
  phone: string; // โทร
  email: string; // Email
  status: 'ใช้งาน' | 'ระงับ'; // สถานะ
  createdAt: string; // วันที่สร้าง
  updatedAt: string; // วันที่อัปเดต
}

export interface Product {
  barcode: string; // Barcode
  sku: string; // SKU
  name: string; // ชื่อสินค้า
  unit: string; // หน่วย
  priceA: number; // ราคา A
  priceB: number; // ราคา B
  priceC: number; // ราคา C;
  cost: number; // ต้นทุน
  stock: number; // สต็อก
  minStock: number; // Min Stock
  status: 'ใช้งาน' | 'ระงับ'; // สถานะ
}

export interface SalesOrder {
  id: string; // เลขที่บิล (INV-YYMMDD-XXX)
  date: string; // วันที่
  customerId: string; // รหัสลูกค้า
  customerName: string; // ชื่อลูกค้า
  total: number; // ยอดรวม
  discount: number; // ส่วนลด
  vat: number; // VAT (7%)
  netTotal: number; // ยอดสุทธิ
  status: 'Draft' | 'Confirmed' | 'Paid'; // สถานะบิล
  paymentStatus: 'Unpaid' | 'Paid'; // ชำระ (เช่น ค้างชำระ / ชำระแล้ว)
}

export interface SalesDetail {
  orderId: string; // เลขที่บิล
  barcode: string; // Barcode
  productName: string; // สินค้า
  price: number; // ราคา
  quantity: number; // จำนวน
  total: number; // รวม
}

export interface Receipt {
  id: string; // เลขที่ใบเสร็จ (RCP-YYMMDD-XXX)
  orderId: string; // เลขที่บิล
  date: string; // วันที่รับ
  amount: number; // จำนวนเงิน
  method: string; // ช่องทาง (เช่น เงินสด, โอนเงินผ่านธนาคาร)
  account: string; // บัญชี
}

export interface PaymentChannel {
  id: string; // รหัสชำระ
  name: string; // ชื่อช่องทาง
  details: string; // รายละเอียด
}

export interface HistoryLog {
  date: string;
  time: string;
  orderId: string;
  customerName: string;
  barcode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  user: string;
}

export interface AuditLog {
  date: string;
  time: string;
  user: string;
  action: string;
  oldValue: string;
  newValue: string;
}

export interface User {
  username: string;
  role: 'Admin' | 'Sales' | 'Viewer';
}

export interface AppSetting {
  key: string;
  value: string;
  description: string;
}
