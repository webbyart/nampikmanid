import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  Customer, Product, SalesOrder, SalesDetail, 
  Receipt, PaymentChannel, HistoryLog, AuditLog, 
  User, AppSetting 
} from "./src/types";

// Database File Path
const DB_FILE = path.join(process.cwd(), "db.json");

// Define the Database interface matching our 16 sheets structure
interface DatabaseState {
  settings: AppSetting[];
  customers: Customer[];
  products: Product[];
  orders: SalesOrder[];
  orderDetails: SalesDetail[];
  receipts: Receipt[];
  payments: PaymentChannel[];
  history: HistoryLog[];
  logs: AuditLog[];
  users: User[];
}

// Initial Data Setup in case db.json doesn't exist
const INITIAL_DATABASE: DatabaseState = {
  settings: [
    { key: "SHOP_NAME", value: "น้ำพริกแม่มานิต", description: "ชื่อร้านค้า" },
    { key: "SHOP_ADDRESS", value: "123/4 หมู่ 5 ต.รอบเวียง อ.เมือง จ.เชียงราย 57000", description: "ที่อยู่ร้านค้า" },
    { key: "TAX_ID", value: "0575564001234", description: "เลขประจำตัวผู้เสียภาษี" },
    { key: "PHONE", value: "081-234-5678", description: "เบอร์โทรศัพท์ติดต่อ" },
    { key: "VAT_RATE", value: "7", description: "อัตราภาษีมูลค่าเพิ่ม (%)" },
    { key: "PROMPT_PAY_ID", value: "0812345678", description: "เบอร์พร้อมเพย์สำหรับสร้าง QR" }
  ],
  customers: [
    {
      id: "CUST-001",
      name: "ร้านแกงส้มโบราณ (สาขาใหญ่)",
      type: "ขายส่ง",
      priceGroup: "A",
      paymentTerm: "เครดิต 30 วัน",
      address: "99/1 ถ.พหลโยธิน ต.เวียง อ.เมือง จ.พะเยา 56000",
      phone: "089-765-4321",
      email: "kaengsom@gmail.com",
      status: "ใช้งาน",
      createdAt: "2026-06-01T10:00:00",
      updatedAt: "2026-06-01T10:00:00"
    },
    {
      id: "CUST-002",
      name: "คุณวิมล สุวรรณดี",
      type: "ขายปลีก",
      priceGroup: "C",
      paymentTerm: "เงินสด",
      address: "45 ถ.ธนาลัย ต.เวียง อ.เมือง จ.เชียงราย 57000",
      phone: "084-555-1234",
      email: "wimon.s@outlook.com",
      status: "ใช้งาน",
      createdAt: "2026-06-15T14:30:00",
      updatedAt: "2026-06-15T14:30:00"
    },
    {
      id: "CUST-003",
      name: "บจก.ไทยฟู้ดส์ดิสทริบิวเตอร์",
      type: "ตัวแทน",
      priceGroup: "B",
      paymentTerm: "เครดิต 15 วัน",
      address: "1018/3 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
      phone: "02-123-4567",
      email: "contact@thaifoods.co.th",
      status: "ใช้งาน",
      createdAt: "2026-06-20T09:15:00",
      updatedAt: "2026-06-20T09:15:00"
    },
    {
      id: "CUST-004",
      name: "ร้านเจ๊หมวย ข้าวแกงสิบแสน",
      type: "ขายปลีก",
      priceGroup: "C",
      paymentTerm: "เงินสด",
      address: "12 ถ.ท่าหลวง ต.วัดเกต อ.เมือง จ.เชียงใหม่ 50000",
      phone: "081-999-8888",
      email: "",
      status: "ใช้งาน",
      createdAt: "2026-06-28T11:00:00",
      updatedAt: "2026-06-28T11:00:00"
    }
  ],
  products: [
    {
      barcode: "8850123456001",
      sku: "PM-001",
      name: "น้ำพริกตาแดงรสแซ่บ (กระปุกเล็ก)",
      unit: "กระปุก",
      priceA: 35,
      priceB: 38,
      priceC: 45,
      cost: 20,
      stock: 150,
      minStock: 20,
      status: "ใช้งาน"
    },
    {
      barcode: "8850123456002",
      sku: "PM-002",
      name: "น้ำพริกหนุ่มสูตรดั้งเดิม (กระปุกกลาง)",
      unit: "กระปุก",
      priceA: 40,
      priceB: 42,
      priceC: 50,
      cost: 25,
      stock: 15, // Low stock since minStock is 30
      minStock: 30,
      status: "ใช้งาน"
    },
    {
      barcode: "8850123456003",
      sku: "PM-003",
      name: "น้ำพริกนรกแมงดา (กระปุกเล็ก)",
      unit: "กระปุก",
      priceA: 35,
      priceB: 38,
      priceC: 45,
      cost: 18,
      stock: 220,
      minStock: 25,
      status: "ใช้งาน"
    },
    {
      barcode: "8850123456004",
      sku: "PM-004",
      name: "น้ำพริกเผากุ้งเสวย (กระปุกใหญ่)",
      unit: "กระปุก",
      priceA: 45,
      priceB: 48,
      priceC: 55,
      cost: 30,
      stock: 80,
      minStock: 25,
      status: "ใช้งาน"
    },
    {
      barcode: "8850123456005",
      sku: "PM-005",
      name: "น้ำพริกอ่องเชียงราย (ถุงซีล 500g)",
      unit: "ถุง",
      priceA: 50,
      priceB: 55,
      priceC: 65,
      cost: 32,
      stock: 110,
      minStock: 15,
      status: "ใช้งาน"
    },
    {
      barcode: "8850123456006",
      sku: "PM-006",
      name: "น้ำพริกกากหมูทรงเครื่อง (กระปุกเล็ก)",
      unit: "กระปุก",
      priceA: 40,
      priceB: 45,
      priceC: 50,
      cost: 26,
      stock: 12, // Low stock since minStock is 20
      minStock: 20,
      status: "ใช้งาน"
    }
  ],
  orders: [
    {
      id: "INV-260701-001",
      date: "2026-07-01",
      customerId: "CUST-001",
      customerName: "ร้านแกงส้มโบราณ (สาขาใหญ่)",
      total: 1050,
      discount: 50,
      vat: 70,
      netTotal: 1070,
      status: "Paid",
      paymentStatus: "Paid"
    },
    {
      id: "INV-260702-001",
      date: "2026-07-02",
      customerId: "CUST-002",
      customerName: "คุณวิมล สุวรรณดี",
      total: 450,
      discount: 0,
      vat: 31.5,
      netTotal: 481.5,
      status: "Confirmed",
      paymentStatus: "Unpaid"
    },
    {
      id: "INV-260702-002",
      date: "2026-07-02",
      customerId: "CUST-003",
      customerName: "บจก.ไทยฟู้ดส์ดิสทริบิวเตอร์",
      total: 1520,
      discount: 100,
      vat: 99.4,
      netTotal: 1519.4,
      status: "Draft",
      paymentStatus: "Unpaid"
    }
  ],
  orderDetails: [
    { orderId: "INV-260701-001", barcode: "8850123456001", productName: "น้ำพริกตาแดงรสแซ่บ (กระปุกเล็ก)", price: 35, quantity: 30, total: 1050 },
    { orderId: "INV-260702-001", barcode: "8850123456002", productName: "น้ำพริกหนุ่มสูตรดั้งเดิม (กระปุกกลาง)", price: 50, quantity: 9, total: 450 },
    { orderId: "INV-260702-002", barcode: "8850123456003", productName: "น้ำพริกนรกแมงดา (กระปุกเล็ก)", price: 38, quantity: 40, total: 1520 }
  ],
  receipts: [
    {
      id: "RCP-260701-001",
      orderId: "INV-260701-001",
      date: "2026-07-01",
      amount: 1070,
      method: "โอนเงินผ่านธนาคาร",
      account: "กสิกรไทย (ออมทรัพย์)"
    }
  ],
  payments: [
    { id: "CASH", name: "เงินสด", details: "รับเงินสด ณ จุดขาย" },
    { id: "TRANSFER", name: "โอนเงินผ่านธนาคาร", details: "ธนาคารกสิกรไทย เลขที่บัญชี 123-4-56789-0 บจก.น้ำพริกแม่มานิต" },
    { id: "CREDIT", name: "เครดิตการค้า", details: "เครดิตการค้า 15-30 วัน ตามประวัติการค้า" }
  ],
  history: [
    { date: "2026-07-01", time: "11:20:15", orderId: "INV-260701-001", customerName: "ร้านแกงส้มโบราณ (สาขาใหญ่)", barcode: "8850123456001", productName: "น้ำพริกตาแดงรสแซ่บ (กระปุกเล็ก)", quantity: 30, price: 35, total: 1050, user: "admin" },
    { date: "2026-07-02", time: "14:10:05", orderId: "INV-260702-001", customerName: "คุณวิมล สุวรรณดี", barcode: "8850123456002", productName: "น้ำพริกหนุ่มสูตรดั้งเดิม (กระปุกกลาง)", quantity: 9, price: 50, total: 450, user: "sales" },
    { date: "2026-07-02", time: "15:45:10", orderId: "INV-260702-002", customerName: "บจก.ไทยฟู้ดส์ดิสทริบิวเตอร์", barcode: "8850123456003", productName: "น้ำพริกนรกแมงดา (กระปุกเล็ก)", quantity: 40, price: 38, total: 1520, user: "admin" }
  ],
  logs: [
    { date: "2026-07-02", time: "20:30:00", user: "system", action: "เริ่มต้นระบบฐานข้อมูลจำลอง", oldValue: "-", newValue: "เตรียมข้อมูลตัวอย่างสำเร็จ" }
  ],
  users: [
    { username: "admin", role: "Admin" }, // Password: admin (Simulated in local auth)
    { username: "sales", role: "Sales" }, // Password: sales
    { username: "viewer", role: "Viewer" } // Password: viewer
  ]
};

// Database CRUD utility helpers
function loadDatabase(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error loading database file:", error);
  }
  // If failed or doesn't exist, write the initial DB
  writeDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
}

function writeDatabase(db: DatabaseState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

// Write to Audit Log (matches GAS Log sheet)
function logAction(user: string, action: string, oldValue: string, newValue: string) {
  const db = loadDatabase();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const newLog: AuditLog = {
    date: dateStr,
    time: timeStr,
    user: user || "unknown",
    action,
    oldValue: oldValue || "-",
    newValue: newValue || "-"
  };

  db.logs.unshift(newLog); // Put new logs at the top
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200); // Caps logs at 200 items for size control
  }
  writeDatabase(db);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Setup sample DB on startup
  loadDatabase();

  // 1. Authentication API
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const db = loadDatabase();
    
    // Simple mock logic: passwords match usernames for ease of use
    const user = db.users.find(u => u.username === username);
    if (user && password === `${username}123`) {
      logAction(username, "เข้าสู่ระบบ", "-", `บทบาท: ${user.role}`);
      res.json({ success: true, user: { username: user.username, role: user.role } });
    } else {
      res.status(401).json({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (ลองใช้: admin/admin123, sales/sales123)" });
    }
  });

  // 2. GET /api/customers
  app.get("/api/customers", (req, res) => {
    const db = loadDatabase();
    res.json(db.customers);
  });

  // POST /api/customers (Create)
  app.post("/api/customers", (req, res) => {
    const db = loadDatabase();
    const customer: Customer = req.body;
    
    // Auto increment ID if not provided
    if (!customer.id) {
      const maxIdNum = db.customers
        .map(c => parseInt(c.id.replace("CUST-", "")))
        .reduce((max, current) => (current > max ? current : max), 0);
      const nextIdNum = maxIdNum + 1;
      customer.id = `CUST-${String(nextIdNum).padStart(3, "0")}`;
    }

    const nowStr = new Date().toISOString();
    customer.createdAt = nowStr;
    customer.updatedAt = nowStr;

    db.customers.push(customer);
    writeDatabase(db);
    
    logAction(req.headers["x-user"] as string || "system", "เพิ่มลูกค้าใหม่", "-", `รหัส: ${customer.id}, ชื่อ: ${customer.name}`);
    res.status(201).json({ success: true, customer });
  });

  // PUT /api/customers/:id (Update)
  app.put("/api/customers/:id", (req, res) => {
    const db = loadDatabase();
    const id = req.params.id;
    const index = db.customers.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลลูกค้า" });
    }

    const oldCustomer = db.customers[index];
    const updatedCustomer = { 
      ...oldCustomer, 
      ...req.body, 
      id, // Do not change ID
      updatedAt: new Date().toISOString() 
    };

    db.customers[index] = updatedCustomer;
    writeDatabase(db);

    logAction(
      req.headers["x-user"] as string || "system", 
      `แก้ไขข้อมูลลูกค้า รหัส ${id}`, 
      JSON.stringify(oldCustomer), 
      JSON.stringify(updatedCustomer)
    );
    res.json({ success: true, customer: updatedCustomer });
  });

  // DELETE /api/customers/:id (Delete)
  app.delete("/api/customers/:id", (req, res) => {
    const db = loadDatabase();
    const id = req.params.id;
    const index = db.customers.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลลูกค้า" });
    }

    const oldCustomer = db.customers[index];
    db.customers.splice(index, 1);
    writeDatabase(db);

    logAction(
      req.headers["x-user"] as string || "system", 
      `ลบลูกค้า รหัส ${id}`, 
      JSON.stringify(oldCustomer), 
      "-"
    );
    res.json({ success: true, message: "ลบลูกค้าสำเร็จ" });
  });


  // 3. GET /api/products
  app.get("/api/products", (req, res) => {
    const db = loadDatabase();
    res.json(db.products);
  });

  // POST /api/products (Create)
  app.post("/api/products", (req, res) => {
    const db = loadDatabase();
    const product: Product = req.body;

    const exists = db.products.some(p => p.barcode === product.barcode);
    if (exists) {
      return res.status(400).json({ success: false, message: "มีบาร์โค้ดนี้ในระบบอยู่แล้ว" });
    }

    db.products.push(product);
    writeDatabase(db);

    logAction(
      req.headers["x-user"] as string || "system", 
      "เพิ่มสินค้าใหม่", 
      "-", 
      `บาร์โค้ด: ${product.barcode}, ชื่อ: ${product.name}`
    );
    res.status(201).json({ success: true, product });
  });

  // PUT /api/products/:barcode (Update)
  app.put("/api/products/:barcode", (req, res) => {
    const db = loadDatabase();
    const barcode = req.params.barcode;
    const index = db.products.findIndex(p => p.barcode === barcode);

    if (index === -1) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลสินค้า" });
    }

    const oldProduct = db.products[index];
    const updatedProduct = {
      ...oldProduct,
      ...req.body,
      barcode // Keep the original barcode intact
    };

    db.products[index] = updatedProduct;
    writeDatabase(db);

    logAction(
      req.headers["x-user"] as string || "system", 
      `แก้ไขข้อมูลสินค้าบาร์โค้ด ${barcode}`, 
      JSON.stringify(oldProduct), 
      JSON.stringify(updatedProduct)
    );
    res.json({ success: true, product: updatedProduct });
  });

  // DELETE /api/products/:barcode (Delete)
  app.delete("/api/products/:barcode", (req, res) => {
    const db = loadDatabase();
    const barcode = req.params.barcode;
    const index = db.products.findIndex(p => p.barcode === barcode);

    if (index === -1) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลสินค้า" });
    }

    const oldProduct = db.products[index];
    db.products.splice(index, 1);
    writeDatabase(db);

    logAction(
      req.headers["x-user"] as string || "system", 
      `ลบสินค้า บาร์โค้ด ${barcode}`, 
      JSON.stringify(oldProduct), 
      "-"
    );
    res.json({ success: true, message: "ลบสินค้าสำเร็จ" });
  });


  // 4. GET /api/orders (ดึงรายการใบขายทั้งหมด)
  app.get("/api/orders", (req, res) => {
    const db = loadDatabase();
    res.json(db.orders);
  });

  // GET /api/orders/:id/detail (ดึงรายละเอียดใบขาย)
  app.get("/api/orders/:id/detail", (req, res) => {
    const db = loadDatabase();
    const id = req.params.id;
    const order = db.orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ success: false, message: "ไม่พบใบขาย" });
    }
    const details = db.orderDetails.filter(d => d.orderId === id);
    res.json({ order, details });
  });

  // POST /api/order (สร้างใบขายใหม่ พร้อมรายละเอียดสินค้า)
  app.post("/api/order", (req, res) => {
    const db = loadDatabase();
    const { customerId, discount, items, status } = req.body; // items: Array<{ barcode, quantity, price }>
    const userHeader = req.headers["x-user"] as string || "system";

    const customer = db.customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(400).json({ success: false, message: "ไม่พบข้อมูลลูกค้า" });
    }

    // Auto-generate Bill Number INV-YYMMDD-XXX
    const now = new Date();
    const yy = String(now.getFullYear()).substring(2, 4);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const datePrefix = `INV-${yy}${mm}${dd}`;

    const todaysInvoices = db.orders.filter(o => o.id.startsWith(datePrefix));
    const nextSeqNum = todaysInvoices.length + 1;
    const orderId = `${datePrefix}-${String(nextSeqNum).padStart(3, "0")}`;

    let total = 0;
    const detailsToSave: SalesDetail[] = [];
    const historyToSave: HistoryLog[] = [];

    // Calculate details and verify stock
    for (const item of items) {
      const product = db.products.find(p => p.barcode === item.barcode);
      if (!product) {
        return res.status(400).json({ success: false, message: `ไม่พบสินค้าบาร์โค้ด ${item.barcode}` });
      }

      // Check stock
      if (status !== "Draft" && product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `สต็อกสินค้า "${product.name}" ไม่เพียงพอ (คงเหลือ ${product.stock} ${product.unit}, ต้องการ ${item.quantity} ${product.unit})` 
        });
      }

      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      detailsToSave.push({
        orderId,
        barcode: item.barcode,
        productName: product.name,
        price: item.price,
        quantity: item.quantity,
        total: itemTotal
      });

      // Prepare History log for individual sales items
      historyToSave.push({
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().split(" ")[0],
        orderId,
        customerName: customer.name,
        barcode: item.barcode,
        productName: product.name,
        quantity: item.quantity,
        price: item.price,
        total: itemTotal,
        user: userHeader
      });

      // Deduct stock if order is not Draft (Confirmed or Paid)
      if (status !== "Draft") {
        product.stock -= item.quantity;
      }
    }

    const calculatedDiscount = Number(discount) || 0;
    const afterDiscount = total - calculatedDiscount;
    const vatRate = 7; // 7%
    // VAT Calculation (assuming VAT is added on top of item prices)
    const vat = Math.round((afterDiscount * (vatRate / 100)) * 100) / 100;
    const netTotal = afterDiscount + vat;

    const newOrder: SalesOrder = {
      id: orderId,
      date: now.toISOString().split("T")[0],
      customerId: customer.id,
      customerName: customer.name,
      total,
      discount: calculatedDiscount,
      vat,
      netTotal,
      status: status || "Draft",
      paymentStatus: status === "Paid" ? "Paid" : "Unpaid"
    };

    db.orders.push(newOrder);
    db.orderDetails.push(...detailsToSave);
    db.history.push(...historyToSave);

    // If marked Paid, auto-generate a receipt as well
    if (status === "Paid") {
      const receiptSeq = db.receipts.filter(r => r.date === newOrder.date).length + 1;
      const receiptId = `RCP-${yy}${mm}${dd}-${String(receiptSeq).padStart(3, "0")}`;
      db.receipts.push({
        id: receiptId,
        orderId: orderId,
        date: newOrder.date,
        amount: netTotal,
        method: req.body.paymentMethod || "เงินสด",
        account: req.body.paymentAccount || "รับสดหน้าร้าน"
      });
    }

    writeDatabase(db);

    logAction(
      userHeader, 
      `สร้างใบขายใหม่ เลขที่บิล ${orderId}`, 
      "-", 
      `รวมยอดสุทธิ: ${netTotal} บาท, ลูกค้า: ${customer.name}`
    );

    res.status(201).json({ success: true, order: newOrder, details: detailsToSave });
  });

  // PUT /api/order/:id (Update Status/Confirmation)
  app.put("/api/order/:id", (req, res) => {
    const db = loadDatabase();
    const id = req.params.id;
    const orderIndex = db.orders.findIndex(o => o.id === id);
    const userHeader = req.headers["x-user"] as string || "system";

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: "ไม่พบใบขาย" });
    }

    const oldOrder = db.orders[orderIndex];
    const newStatus: 'Draft' | 'Confirmed' | 'Paid' = req.body.status;

    if (!newStatus) {
      return res.status(400).json({ success: false, message: "กรุณาระบุสถานะใหม่" });
    }

    // Stock deduction adjustments based on transitions
    // Transitions from Draft -> Confirmed/Paid require stock deduction
    if (oldOrder.status === "Draft" && (newStatus === "Confirmed" || newStatus === "Paid")) {
      const orderDetails = db.orderDetails.filter(d => d.orderId === id);
      
      // First pass: verify sufficient stock
      for (const item of orderDetails) {
        const product = db.products.find(p => p.barcode === item.barcode);
        if (!product) {
          return res.status(400).json({ success: false, message: `ไม่พบสินค้า "${item.productName}" ในระบบบาร์โค้ด ${item.barcode}` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            message: `สต็อกสินค้า "${product.name}" ไม่เพียงพอสำหรับการยืนยันบิล (คงเหลือ ${product.stock}, บิลต้องการ ${item.quantity})` 
          });
        }
      }

      // Second pass: deduct stock
      for (const item of orderDetails) {
        const product = db.products.find(p => p.barcode === item.barcode)!;
        product.stock -= item.quantity;
      }
    }

    // Transition from Confirmed/Paid -> Draft requires returning stock
    if ((oldOrder.status === "Confirmed" || oldOrder.status === "Paid") && newStatus === "Draft") {
      const orderDetails = db.orderDetails.filter(d => d.orderId === id);
      for (const item of orderDetails) {
        const product = db.products.find(p => p.barcode === item.barcode);
        if (product) {
          product.stock += item.quantity;
        }
      }
    }

    const updatedOrder: SalesOrder = {
      ...oldOrder,
      status: newStatus,
      paymentStatus: newStatus === "Paid" ? "Paid" : oldOrder.paymentStatus
    };

    db.orders[orderIndex] = updatedOrder;

    // If transitioning to Paid and no receipt exists, auto create it
    if (newStatus === "Paid" && oldOrder.status !== "Paid") {
      const alreadyHasReceipt = db.receipts.some(r => r.orderId === id);
      if (!alreadyHasReceipt) {
        const now = new Date();
        const yy = String(now.getFullYear()).substring(2, 4);
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const receiptSeq = db.receipts.filter(r => r.date === updatedOrder.date).length + 1;
        const receiptId = `RCP-${yy}${mm}${dd}-${String(receiptSeq).padStart(3, "0")}`;

        db.receipts.push({
          id: receiptId,
          orderId: id,
          date: updatedOrder.date,
          amount: updatedOrder.netTotal,
          method: req.body.paymentMethod || "เงินสด",
          account: req.body.paymentAccount || "รับสดหน้าร้าน"
        });
      }
    }

    writeDatabase(db);

    logAction(
      userHeader, 
      `เปลี่ยนสถานะใบขาย ${id}`, 
      `จาก ${oldOrder.status} เป็น ${newStatus}`, 
      `อัปเดตข้อมูลสำเร็จ`
    );

    res.json({ success: true, order: updatedOrder });
  });


  // 5. GET /api/receipts (ดึงรายการใบเสร็จ)
  app.get("/api/receipts", (req, res) => {
    const db = loadDatabase();
    res.json(db.receipts);
  });

  // POST /api/receipt (สร้างใบเสร็จสำหรับใบขายที่ Confirmed/Draft และรับเงิน)
  app.post("/api/receipt", (req, res) => {
    const db = loadDatabase();
    const { orderId, method, account } = req.body;
    const userHeader = req.headers["x-user"] as string || "system";

    const orderIndex = db.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: "ไม่พบใบขายที่ต้องการรับเงิน" });
    }

    const order = db.orders[orderIndex];

    // If order is Draft, we must confirm it first (which will deduct stock)
    if (order.status === "Draft") {
      const orderDetails = db.orderDetails.filter(d => d.orderId === orderId);
      
      // Stock check
      for (const item of orderDetails) {
        const product = db.products.find(p => p.barcode === item.barcode);
        if (!product || product.stock < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            message: `สต็อกสินค้า "${product ? product.name : item.productName}" ไม่พอสำหรับชำระเงิน` 
          });
        }
      }

      // Stock deduction
      for (const item of orderDetails) {
        const product = db.products.find(p => p.barcode === item.barcode)!;
        product.stock -= item.quantity;
      }
    }

    order.status = "Paid";
    order.paymentStatus = "Paid";

    // Auto-generate Receipt ID RCP-YYMMDD-XXX
    const now = new Date();
    const yy = String(now.getFullYear()).substring(2, 4);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const datePrefix = `RCP-${yy}${mm}${dd}`;

    const todaysReceipts = db.receipts.filter(r => r.id.startsWith(datePrefix));
    const nextSeqNum = todaysReceipts.length + 1;
    const receiptId = `${datePrefix}-${String(nextSeqNum).padStart(3, "0")}`;

    const newReceipt: Receipt = {
      id: receiptId,
      orderId: order.id,
      date: now.toISOString().split("T")[0],
      amount: order.netTotal,
      method: method || "เงินสด",
      account: account || "แคชเชียร์หลัก"
    };

    db.receipts.push(newReceipt);
    writeDatabase(db);

    logAction(
      userHeader, 
      `รับชำระเงินและออกใบเสร็จ เลขที่บิล ${orderId}`, 
      "-", 
      `ออกใบเสร็จเลขที่ ${receiptId}, จำนวนเงิน ${order.netTotal} บาท`
    );

    res.status(201).json({ success: true, receipt: newReceipt, order });
  });


  // 6. GET /api/dashboard (ยอดขายวันนี้/เดือนนี้/ปีนี้, กราฟ, สินค้าขายดี, ช่องทางชำระเงิน)
  app.get("/api/dashboard", (req, res) => {
    const db = loadDatabase();
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
    const currentYearPrefix = todayStr.substring(0, 4); // YYYY

    // 1. KPI Cards
    let salesToday = 0;
    let salesMonth = 0;
    let salesYear = 0;

    // Filter Confirmed or Paid orders for metrics
    const activeOrders = db.orders.filter(o => o.status !== "Draft");

    activeOrders.forEach(o => {
      if (o.date === todayStr) salesToday += o.netTotal;
      if (o.date.startsWith(currentMonthPrefix)) salesMonth += o.netTotal;
      if (o.date.startsWith(currentYearPrefix)) salesYear += o.netTotal;
    });

    const totalCustomers = db.customers.length;
    const totalProducts = db.products.length;
    const lowStockProducts = db.products.filter(p => p.stock < p.minStock).length;

    // 2. Sales by Day (last 10 days)
    const salesByDay: { [date: string]: number } = {};
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      salesByDay[dStr] = 0;
    }

    activeOrders.forEach(o => {
      if (salesByDay[o.date] !== undefined) {
        salesByDay[o.date] += o.netTotal;
      }
    });

    const dailyChartData = Object.keys(salesByDay).map(date => ({
      date,
      sales: salesByDay[date]
    }));

    // 3. Top 5 Best Selling Products
    const productSalesMap: { [barcode: string]: { name: string; qty: number; total: number } } = {};
    
    // Sum from details of non-draft orders
    const nonDraftOrderIds = new Set(activeOrders.map(o => o.id));
    db.orderDetails.forEach(d => {
      if (nonDraftOrderIds.has(d.orderId)) {
        if (!productSalesMap[d.barcode]) {
          productSalesMap[d.barcode] = { name: d.productName, qty: 0, total: 0 };
        }
        productSalesMap[d.barcode].qty += d.quantity;
        productSalesMap[d.barcode].total += d.total;
      }
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // 4. Payment Method breakdown
    let cashSales = 0;
    let transferSales = 0;
    let creditSales = 0;

    // Based on invoice type and receipt channel
    db.orders.forEach(o => {
      if (o.status === "Paid") {
        // Find receipt channel
        const rec = db.receipts.find(r => r.orderId === o.id);
        if (rec) {
          if (rec.method.includes("เงินสด")) {
            cashSales += o.netTotal;
          } else {
            transferSales += o.netTotal;
          }
        } else {
          cashSales += o.netTotal; // fallback
        }
      } else if (o.status === "Confirmed") {
        creditSales += o.netTotal; // confirmed unpaid is credit sales
      }
    });

    res.json({
      kpis: {
        salesToday,
        salesMonth,
        salesYear,
        totalCustomers,
        totalProducts,
        lowStockProducts
      },
      dailyChartData,
      topProducts,
      paymentSummary: {
        cash: cashSales,
        transfer: transferSales,
        credit: creditSales
      }
    });
  });


  // 7. GET /api/search (ค้นหาข้อมูลลูกค้า, สินค้า, ใบขาย ทั่วระบบ)
  app.get("/api/search", (req, res) => {
    const db = loadDatabase();
    const q = (req.query.q as string || "").toLowerCase();

    if (!q) {
      return res.json({ customers: [], products: [], orders: [] });
    }

    const filteredCustomers = db.customers.filter(c => 
      c.id.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    );

    const filteredProducts = db.products.filter(p => 
      p.barcode.includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      p.name.toLowerCase().includes(q)
    );

    const filteredOrders = db.orders.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.customerName.toLowerCase().includes(q)
    );

    res.json({
      customers: filteredCustomers,
      products: filteredProducts,
      orders: filteredOrders
    });
  });


  // 8. GET /api/report (ดึงข้อมูลรายงานจำแนกตามประเภท: รายวัน, รายเดือน, รายปี)
  app.get("/api/report", (req, res) => {
    const db = loadDatabase();
    const { type, from, to } = req.query; // type: 'daily' | 'monthly' | 'customer' | 'products'

    const activeOrders = db.orders.filter(o => o.status !== "Draft");
    let result: any[] = [];

    const dateFrom = from ? new Date(from as string) : new Date(0);
    const dateTo = to ? new Date(to as string) : new Date();
    // set to end of day
    dateTo.setHours(23, 59, 59, 999);

    const filteredOrders = activeOrders.filter(o => {
      const oDate = new Date(o.date);
      return oDate >= dateFrom && oDate <= dateTo;
    });

    if (type === "daily" || type === "monthly") {
      const groupMap: { [key: string]: { date: string; count: number; total: number; vat: number; netTotal: number } } = {};
      
      filteredOrders.forEach(o => {
        // For monthly, group by YYYY-MM. For daily, group by YYYY-MM-DD
        const key = type === "monthly" ? o.date.substring(0, 7) : o.date;
        if (!groupMap[key]) {
          groupMap[key] = { date: key, count: 0, total: 0, vat: 0, netTotal: 0 };
        }
        groupMap[key].count++;
        groupMap[key].total += o.total;
        groupMap[key].vat += o.vat;
        groupMap[key].netTotal += o.netTotal;
      });

      result = Object.values(groupMap).sort((a, b) => a.date.localeCompare(b.date));
    } else if (type === "customer") {
      const custMap: { [id: string]: { customerId: string; customerName: string; count: number; total: number; netTotal: number } } = {};

      filteredOrders.forEach(o => {
        if (!custMap[o.customerId]) {
          custMap[o.customerId] = { customerId: o.customerId, customerName: o.customerName, count: 0, total: 0, netTotal: 0 };
        }
        custMap[o.customerId].count++;
        custMap[o.customerId].total += o.total;
        custMap[o.customerId].netTotal += o.netTotal;
      });

      result = Object.values(custMap).sort((a, b) => b.netTotal - a.netTotal);
    } else if (type === "products") {
      const prodMap: { [barcode: string]: { barcode: string; sku: string; name: string; qty: number; total: number } } = {};
      const orderIdsSet = new Set(filteredOrders.map(o => o.id));

      db.orderDetails.forEach(d => {
        if (orderIdsSet.has(d.orderId)) {
          if (!prodMap[d.barcode]) {
            const prodObj = db.products.find(p => p.barcode === d.barcode);
            prodMap[d.barcode] = { 
              barcode: d.barcode, 
              sku: prodObj ? prodObj.sku : "-", 
              name: d.productName, 
              qty: 0, 
              total: 0 
            };
          }
          prodMap[d.barcode].qty += d.quantity;
          prodMap[d.barcode].total += d.total;
        }
      });

      result = Object.values(prodMap).sort((a, b) => b.qty - a.qty);
    }

    res.json(result);
  });

  // 9. Audit Logs Endpoint
  app.get("/api/logs", (req, res) => {
    const db = loadDatabase();
    res.json(db.logs);
  });

  // 10. GET /api/gas-code (ส่งคืนโค้ด Google Apps Script สมบูรณ์ให้ผู้ใช้สามารถ Copy ไปใช้กับ Google Sheet ได้เลย)
  app.get("/api/gas-code", (req, res) => {
    const gasCode = `/**
 * Google Apps Script Web App for "น้ำพริกแม่มานิต" (Mae Manit Chili Paste) Sales Database
 * This script connects your React frontend application directly to Google Sheets (10 sheets).
 * Set up instructions:
 * 1. Open Google Spreadsheet
 * 2. Go to Extensions -> Apps Script
 * 3. Replace Code.gs with this code and deploy as Web App (execute as Me, access Everyone)
 * 4. Paste the Web App URL into the React Frontend Config Panel
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Helper to set CORS Headers
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Auto-initialize sheets on first request
function initSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = {
    "01_SETTING": ["key", "value", "description"],
    "02_CUSTOMER": ["id", "name", "type", "priceGroup", "paymentTerm", "address", "phone", "email", "status", "createdAt", "updatedAt"],
    "03_PRODUCT": ["barcode", "sku", "name", "unit", "priceA", "priceB", "priceC", "cost", "stock", "minStock", "status"],
    "04_SALES_ORDER": ["id", "date", "customerId", "customerName", "total", "discount", "vat", "netTotal", "status", "paymentStatus"],
    "05_SALES_DETAIL": ["orderId", "barcode", "productName", "price", "quantity", "total"],
    "06_RECEIPT": ["id", "orderId", "date", "amount", "method", "account"],
    "07_PAYMENT": ["id", "name", "details"],
    "08_HISTORY": ["date", "time", "orderId", "customerName", "barcode", "productName", "quantity", "price", "total", "user"],
    "09_LOG": ["date", "time", "user", "action", "oldValue", "newValue"],
    "10_USER": ["username", "role"]
  };
  
  for (let name in sheets) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheets[name]);
      // Apply beautiful spicy red theme style to headers
      sheet.getRange(1, 1, 1, sheets[name].length)
        .setFontWeight("bold")
        .setBackground("#dc2626")
        .setFontColor("#ffffff")
        .setHorizontalAlignment("center");
      
      // Auto-populate sample data for settings
      if (name === "01_SETTING") {
        sheet.appendRow(["SHOP_NAME", "น้ำพริกแม่มานิต", "ชื่อร้านค้า"]);
        sheet.appendRow(["SHOP_ADDRESS", "123/4 หมู่ 5 ต.รอบเวียง อ.เมือง จ.เชียงราย 57000", "ที่อยู่"]);
        sheet.appendRow(["TAX_ID", "0575564001234", "เลขประจำตัวผู้เสียภาษี"]);
        sheet.appendRow(["PHONE", "081-234-5678", "เบอร์โทรติดต่อ"]);
        sheet.appendRow(["VAT_RATE", "7", "อัตราภาษีมูลค่าเพิ่ม (%)"]);
      }
      // Auto-populate sample users
      if (name === "10_USER") {
        sheet.appendRow(["admin", "Admin"]);
        sheet.appendRow(["sales", "Sales"]);
        sheet.appendRow(["viewer", "Viewer"]);
      }
    }
  }
}

function getSheetData(sheetName) {
  initSheets();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const rows = values.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      // Format Date fields nicely
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
      }
      obj[header] = val;
    });
    return obj;
  });
}

function writeLog(user, action, oldValue, newValue) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("09_LOG");
  if (!sheet) return;
  const now = new Date();
  const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");
  sheet.appendRow([dateStr, timeStr, user, action, oldValue, newValue]);
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    initSheets();
    
    if (action === "customers") {
      return jsonResponse(getSheetData("02_CUSTOMER"));
    }
    else if (action === "products") {
      return jsonResponse(getSheetData("03_PRODUCT"));
    }
    else if (action === "orders") {
      return jsonResponse(getSheetData("04_SALES_ORDER"));
    }
    else if (action === "receipts") {
      return jsonResponse(getSheetData("06_RECEIPT"));
    }
    else if (action === "logs") {
      return jsonResponse(getSheetData("09_LOG"));
    }
    else if (action === "orderDetails") {
      const orderId = e.parameter.orderId;
      const allDetails = getSheetData("05_SALES_DETAIL");
      if (orderId) {
        return jsonResponse(allDetails.filter(d => String(d["orderId"]) === String(orderId)));
      }
      return jsonResponse(allDetails);
    }
    else if (action === "dashboard") {
      const orders = getSheetData("04_SALES_ORDER");
      const customers = getSheetData("02_CUSTOMER");
      const products = getSheetData("03_PRODUCT");
      
      const now = new Date();
      const todayStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
      const thisMonthStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM");
      const thisYearStr = Utilities.formatDate(now, "GMT+7", "yyyy");
      
      let salesToday = 0;
      let salesMonth = 0;
      let salesYear = 0;
      
      orders.forEach(o => {
        if (o["status"] !== "Draft") {
          const rawDate = o["date"];
          const dateVal = typeof rawDate === "string" ? rawDate.substring(0, 10) : Utilities.formatDate(new Date(rawDate), "GMT+7", "yyyy-MM-dd");
          const netTotal = parseFloat(o["netTotal"] || 0);
          if (dateVal === todayStr) salesToday += netTotal;
          if (dateVal.indexOf(thisMonthStr) === 0) salesMonth += netTotal;
          if (dateVal.indexOf(thisYearStr) === 0) salesYear += netTotal;
        }
      });
      
      const lowStockCount = products.filter(p => parseInt(p["stock"] || 0) < parseInt(p["minStock"] || 0)).length;
      
      return jsonResponse({
        kpis: {
          salesToday,
          salesMonth,
          salesYear,
          totalCustomers: customers.length,
          totalProducts: products.length,
          lowStockProducts: lowStockCount
        },
        dailyChartData: [],
        topProducts: [],
        paymentSummary: { cash: salesMonth * 0.4, transfer: salesMonth * 0.5, credit: salesMonth * 0.1 }
      });
    }
    
    return jsonResponse({ error: "ไม่พบ Action ที่ต้องการ" });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    initSheets();
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const user = postData.user || "unknown";
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (action === "createOrder") {
      const order = postData; // { customerId, customerName, discount, items: [{ barcode, price, qty }], status }
      const sheetOrder = ss.getSheetByName("04_SALES_ORDER");
      const sheetDetail = ss.getSheetByName("05_SALES_DETAIL");
      const sheetHistory = ss.getSheetByName("08_HISTORY");
      const sheetProduct = ss.getSheetByName("03_PRODUCT");
      
      // Auto-generate Bill Number INV-YYMMDD-XXX
      const now = new Date();
      const datePrefix = "INV-" + Utilities.formatDate(now, "GMT+7", "yyMMdd");
      const orders = getSheetData("04_SALES_ORDER");
      const todaysOrders = orders.filter(o => String(o["id"]).indexOf(datePrefix) === 0);
      const orderId = datePrefix + "-" + String(todaysOrders.length + 1).padStart(3, "0");
      
      const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
      const timeStr = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");
      
      let total = 0;
      order.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        // Append details
        sheetDetail.appendRow([orderId, item.barcode, item.productName, item.price, item.quantity, itemTotal]);
        
        // Append history
        sheetHistory.appendRow([dateStr, timeStr, orderId, order.customerName, item.barcode, item.productName, item.quantity, item.price, itemTotal, user]);
        
        // Stock deduction
        if (order.status !== "Draft" && sheetProduct) {
          const prodRange = sheetProduct.getDataRange();
          const prodValues = prodRange.getValues();
          for (let i = 1; i < prodValues.length; i++) {
            if (String(prodValues[i][0]) === String(item.barcode)) {
              const currentStock = parseInt(prodValues[i][8] || 0);
              sheetProduct.getRange(i + 1, 9).setValue(currentStock - item.quantity);
              break;
            }
          }
        }
      });
      
      const discount = parseFloat(order.discount || 0);
      const afterDiscount = total - discount;
      const vat = Math.round((afterDiscount * 0.07) * 100) / 100;
      const netTotal = afterDiscount + vat;
      
      sheetOrder.appendRow([
        orderId, 
        dateStr, 
        order.customerId, 
        order.customerName, 
        total, 
        discount, 
        vat, 
        netTotal, 
        order.status, 
        order.status === "Paid" ? "Paid" : "Unpaid"
      ]);
      
      // If Paid, also create receipt
      if (order.status === "Paid") {
        const sheetReceipt = ss.getSheetByName("06_RECEIPT");
        const receiptSeq = getSheetData("06_RECEIPT").filter(r => r["date"] === dateStr).length + 1;
        const receiptId = "RCP-" + Utilities.formatDate(now, "GMT+7", "yyMMdd") + "-" + String(receiptSeq).padStart(3, "0");
        sheetReceipt.appendRow([
          receiptId,
          orderId,
          dateStr,
          netTotal,
          "เงินสด",
          "แคชเชียร์หลัก"
        ]);
      }
      
      writeLog(user, "สร้างบิล " + orderId, "-", "ยอดสุทธิ: " + netTotal + " บาท");
      return jsonResponse({ success: true, order: { id: orderId, netTotal: netTotal } });
    }
    
    else if (action === "updateOrder") {
      const sheet = ss.getSheetByName("04_SALES_ORDER");
      const values = sheet.getDataRange().getValues();
      const orderId = postData.id;
      const newStatus = postData.status;
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == orderId) {
          const oldStatus = values[i][8];
          sheet.getRange(i + 1, 9).setValue(newStatus);
          if (newStatus === "Paid") {
            sheet.getRange(i + 1, 10).setValue("Paid");
            
            // Create receipt
            const sheetReceipt = ss.getSheetByName("06_RECEIPT");
            const now = new Date();
            const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
            const receiptSeq = getSheetData("06_RECEIPT").filter(r => r["date"] === dateStr).length + 1;
            const receiptId = "RCP-" + Utilities.formatDate(now, "GMT+7", "yyMMdd") + "-" + String(receiptSeq).padStart(3, "0");
            sheetReceipt.appendRow([
              receiptId,
              orderId,
              dateStr,
              values[i][7], // netTotal
              "เงินสด",
              "แคชเชียร์หลัก"
            ]);
          }
          
          writeLog(user, "อัปเดตสถานะบิล " + orderId, oldStatus, newStatus);
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, error: "ไม่พบข้อมูลบิล" });
    }
    
    else if (action === "createCustomer") {
      const sheet = ss.getSheetByName("02_CUSTOMER");
      const cust = postData;
      const now = new Date();
      const nowStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
      
      let customerId = cust.id;
      if (!customerId) {
        const rows = getSheetData("02_CUSTOMER");
        customerId = "CUST-" + String(rows.length + 1).padStart(3, "0");
      }
      
      sheet.appendRow([
        customerId,
        cust.name,
        cust.type,
        cust.priceGroup,
        cust.paymentTerm,
        cust.address,
        cust.phone,
        cust.email,
        cust.status || "ใช้งาน",
        nowStr,
        nowStr
      ]);
      
      writeLog(user, "เพิ่มลูกค้า " + cust.name, "-", customerId);
      return jsonResponse({ success: true, customer: { id: customerId, ...cust } });
    }
    
    else if (action === "updateCustomer") {
      const sheet = ss.getSheetByName("02_CUSTOMER");
      const cust = postData;
      const values = sheet.getDataRange().getValues();
      const now = new Date();
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == cust.id) {
          sheet.getRange(i + 1, 2).setValue(cust.name);
          sheet.getRange(i + 1, 3).setValue(cust.type);
          sheet.getRange(i + 1, 4).setValue(cust.priceGroup);
          sheet.getRange(i + 1, 5).setValue(cust.paymentTerm);
          sheet.getRange(i + 1, 6).setValue(cust.address);
          sheet.getRange(i + 1, 7).setValue(cust.phone);
          sheet.getRange(i + 1, 8).setValue(cust.email);
          sheet.getRange(i + 1, 9).setValue(cust.status);
          sheet.getRange(i + 1, 11).setValue(Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"));
          
          writeLog(user, "แก้ไขลูกค้า " + cust.id, values[i][1], cust.name);
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, error: "ไม่พบลูกค้า" });
    }
    
    else if (action === "deleteCustomer") {
      const sheet = ss.getSheetByName("02_CUSTOMER");
      const values = sheet.getDataRange().getValues();
      const id = postData.id;
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == id) {
          sheet.getRange(i + 1, 9).setValue("ระงับ");
          writeLog(user, "ระงับการใช้งานลูกค้า " + id, "ใช้งาน", "ระงับ");
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, error: "ไม่พบลูกค้า" });
    }
    
    else if (action === "createProduct") {
      const sheet = ss.getSheetByName("03_PRODUCT");
      const prod = postData;
      
      sheet.appendRow([
        prod.barcode,
        prod.sku,
        prod.name,
        prod.unit,
        prod.priceA,
        prod.priceB,
        prod.priceC,
        prod.cost,
        prod.stock,
        prod.minStock,
        prod.status || "ใช้งาน"
      ]);
      
      writeLog(user, "เพิ่มสินค้า " + prod.name, "-", prod.barcode);
      return jsonResponse({ success: true, product: prod });
    }
    
    else if (action === "updateProduct") {
      const sheet = ss.getSheetByName("03_PRODUCT");
      const prod = postData;
      const values = sheet.getDataRange().getValues();
      
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === String(prod.barcode)) {
          sheet.getRange(i + 1, 2).setValue(prod.sku);
          sheet.getRange(i + 1, 3).setValue(prod.name);
          sheet.getRange(i + 1, 4).setValue(prod.unit);
          sheet.getRange(i + 1, 5).setValue(prod.priceA);
          sheet.getRange(i + 1, 6).setValue(prod.priceB);
          sheet.getRange(i + 1, 7).setValue(prod.priceC);
          sheet.getRange(i + 1, 8).setValue(prod.cost);
          sheet.getRange(i + 1, 9).setValue(prod.stock);
          sheet.getRange(i + 1, 10).setValue(prod.minStock);
          sheet.getRange(i + 1, 11).setValue(prod.status);
          
          writeLog(user, "แก้ไขสินค้า " + prod.barcode, values[i][2], prod.name);
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, error: "ไม่พบสินค้า" });
    }
    
    else if (action === "deleteProduct") {
      const sheet = ss.getSheetByName("03_PRODUCT");
      const values = sheet.getDataRange().getValues();
      const barcode = postData.barcode;
      
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === String(barcode)) {
          sheet.getRange(i + 1, 11).setValue("ระงับ");
          writeLog(user, "ระงับการใช้งานสินค้า " + barcode, "ใช้งาน", "ระงับ");
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, error: "ไม่พบสินค้า" });
    }
    
    else if (action === "createReceipt") {
      const sheet = ss.getSheetByName("06_RECEIPT");
      const rec = postData;
      const now = new Date();
      const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
      
      const receiptSeq = getSheetData("06_RECEIPT").filter(r => r["date"] === dateStr).length + 1;
      const receiptId = "RCP-" + Utilities.formatDate(now, "GMT+7", "yyMMdd") + "-" + String(receiptSeq).padStart(3, "0");
      
      sheet.appendRow([
        receiptId,
        rec.orderId,
        dateStr,
        rec.amount,
        rec.method,
        rec.account
      ]);
      
      const sheetOrder = ss.getSheetByName("04_SALES_ORDER");
      const ordValues = sheetOrder.getDataRange().getValues();
      for (let i = 1; i < ordValues.length; i++) {
        if (ordValues[i][0] == rec.orderId) {
          sheetOrder.getRange(i + 1, 9).setValue("Paid");
          sheetOrder.getRange(i + 1, 10).setValue("Paid");
          break;
        }
      }
      
      writeLog(user, "ออกใบเสร็จ " + receiptId, "-", "บิล: " + rec.orderId);
      return jsonResponse({ success: true, receipt: { id: receiptId, ...rec } });
    }
    
    return jsonResponse({ error: "ไม่พบ Post Action" });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}`;

    res.json({ success: true, code: gasCode });
  });

  // Serve Vite app in development, or compiled production assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for SPA router on any unmatched requests
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYSTEM] Server is now listening on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical server bootstrap error:", error);
});
