import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Package, Users, FileText, Receipt, 
  BarChart3, Database, LogOut, Search, ShieldCheck, 
  UserCheck, X, RefreshCw, Sparkles, Menu, ShieldAlert 
} from "lucide-react";

// Import custom page modules
import Dashboard from "./components/Dashboard";
import Products from "./components/Products";
import Customers from "./components/Customers";
import Orders from "./components/Orders";
import Receipts from "./components/Receipts";
import Reports from "./components/Reports";
import GasIntegration from "./components/GasIntegration";
import Login from "./components/Login";
import PrintDocument from "./components/PrintDocument";

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<{ username: string; role: "Admin" | "Sales" | "Viewer" } | null>(() => {
    const saved = localStorage.getItem("maemanit_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation state
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Google Sheets (Apps Script) mode configuration
  const [gasUrl, setGasUrl] = useState<string>(() => {
    return localStorage.getItem("maemanit_gas_url") || "https://script.google.com/macros/s/AKfycbx12JhZOHuZRvMbnO2FxVEed5u7X8IzwB7QgVLz8Zl4rdBmGkXkflmDvMCELQQSEBo3/exec";
  });
  const [gasMode, setGasMode] = useState<boolean>(() => {
    return localStorage.getItem("maemanit_gas_mode") === "true";
  });

  // Save GAS config to localStorage when modified
  useEffect(() => {
    localStorage.setItem("maemanit_gas_url", gasUrl);
    localStorage.setItem("maemanit_gas_mode", String(gasMode));
  }, [gasUrl, gasMode]);

  // API Fetch interceptor (handles Google Sheets Proxy and Client-side Local fallback)
  useEffect(() => {
    const originalFetch = window.fetch;

    const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      let urlStr = "";
      if (typeof input === "string") {
        urlStr = input;
      } else if (input instanceof URL) {
        urlStr = input.toString();
      } else if (input && typeof (input as any).url === "string") {
        urlStr = (input as any).url;
      }

      let pathname = "";
      try {
        const parsedUrl = new URL(urlStr, window.location.origin);
        pathname = parsedUrl.pathname;
      } catch (e) {
        pathname = urlStr.split("?")[0];
      }

      // Only intercept local API requests
      if (pathname.startsWith("/api/")) {
        const apiIndex = urlStr.indexOf("/api/");
        const path = urlStr.substring(apiIndex + 5);

        // 1. Google Sheets Mode
        if (gasMode && gasUrl) {
          try {
            // 1. GET requests
            if (!init || !init.method || init.method.toUpperCase() === "GET") {
              // Handle Customers
              if (path === "customers") {
                const res = await originalFetch(`${gasUrl}?action=customers`);
                return res;
              }
              
              // Handle Products
              if (path === "products") {
                const res = await originalFetch(`${gasUrl}?action=products`);
                return res;
              }
              
              // Handle Orders
              if (path === "orders") {
                const res = await originalFetch(`${gasUrl}?action=orders`);
                return res;
              }
              
              // Handle Receipts
              if (path === "receipts") {
                const res = await originalFetch(`${gasUrl}?action=receipts`);
                return res;
              }
              
              // Handle Logs
              if (path === "logs") {
                const res = await originalFetch(`${gasUrl}?action=logs`);
                return res;
              }

              // Handle Order details
              if (path.startsWith("orders/") && path.endsWith("/detail")) {
                const orderId = path.split("/")[1];
                const res = await originalFetch(`${gasUrl}?action=orderDetails&orderId=${orderId}`);
                return res;
              }

              // Handle Global Search (Search across customers, products, orders)
              if (path.startsWith("search")) {
                const urlObj = new URL(urlStr, window.location.origin);
                const q = (urlObj.searchParams.get("q") || "").toLowerCase();
                if (!q) {
                  return new Response(JSON.stringify({ customers: [], products: [], orders: [] }), { status: 200 });
                }

                // Fetch all lists from Sheets
                const [cRes, pRes, oRes] = await Promise.all([
                  originalFetch(`${gasUrl}?action=customers`),
                  originalFetch(`${gasUrl}?action=products`),
                  originalFetch(`${gasUrl}?action=orders`)
                ]);
                
                const customers = await cRes.json();
                const products = await pRes.json();
                const orders = await oRes.json();

                const filteredC = customers.filter((c: any) => 
                  (c.id && c.id.toLowerCase().includes(q)) || 
                  (c.name && c.name.toLowerCase().includes(q)) || 
                  (c.phone && c.phone.includes(q))
                );
                
                const filteredP = products.filter((p: any) => 
                  (p.barcode && p.barcode.includes(q)) || 
                  (p.sku && p.sku.toLowerCase().includes(q)) || 
                  (p.name && p.name.toLowerCase().includes(q))
                );

                const filteredO = orders.filter((o: any) => 
                  (o.id && o.id.toLowerCase().includes(q)) || 
                  (o.customerName && o.customerName.toLowerCase().includes(q))
                );

                return new Response(JSON.stringify({
                  customers: filteredC,
                  products: filteredP,
                  orders: filteredO
                }), { status: 200 });
              }

              // Handle Reports (Dynamic calculation locally!)
              if (path.startsWith("report")) {
                const urlObj = new URL(urlStr, window.location.origin);
                const type = urlObj.searchParams.get("type") || "daily";
                const fromStr = urlObj.searchParams.get("from") || "";
                const toStr = urlObj.searchParams.get("to") || "";

                const [ordersRes, detailsRes, productsRes] = await Promise.all([
                  originalFetch(`${gasUrl}?action=orders`),
                  originalFetch(`${gasUrl}?action=orderDetails`),
                  originalFetch(`${gasUrl}?action=products`)
                ]);

                const orders = await ordersRes.json();
                const orderDetails = await detailsRes.json();
                const products = await productsRes.json();

                const activeOrders = orders.filter((o: any) => o.status !== "Draft");
                const dateFrom = fromStr ? new Date(fromStr) : new Date(0);
                const dateTo = toStr ? new Date(toStr) : new Date();
                dateTo.setHours(23, 59, 59, 999);

                const filteredOrders = activeOrders.filter((o: any) => {
                  const oDate = new Date(o.date);
                  return oDate >= dateFrom && oDate <= dateTo;
                });

                let result: any[] = [];

                if (type === "daily" || type === "monthly") {
                  const groupMap: any = {};
                  filteredOrders.forEach((o: any) => {
                    const key = type === "monthly" ? o.date.substring(0, 7) : o.date;
                    if (!groupMap[key]) {
                      groupMap[key] = { date: key, count: 0, total: 0, vat: 0, netTotal: 0 };
                    }
                    groupMap[key].count++;
                    groupMap[key].total += Number(o.total || 0);
                    groupMap[key].vat += Number(o.vat || 0);
                    groupMap[key].netTotal += Number(o.netTotal || 0);
                  });
                  result = Object.values(groupMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
                } 
                else if (type === "customer") {
                  const custMap: any = {};
                  filteredOrders.forEach((o: any) => {
                    if (!custMap[o.customerId]) {
                      custMap[o.customerId] = { customerId: o.customerId, customerName: o.customerName, count: 0, total: 0, netTotal: 0 };
                    }
                    custMap[o.customerId].count++;
                    custMap[o.customerId].total += Number(o.total || 0);
                    custMap[o.customerId].netTotal += Number(o.netTotal || 0);
                  });
                  result = Object.values(custMap).sort((a: any, b: any) => b.netTotal - a.netTotal);
                } 
                else if (type === "products") {
                  const prodMap: any = {};
                  const orderIdsSet = new Set(filteredOrders.map((o: any) => o.id));
                  
                  orderDetails.forEach((d: any) => {
                    if (orderIdsSet.has(d.orderId)) {
                      if (!prodMap[d.barcode]) {
                        const prodObj = products.find((p: any) => p.barcode === d.barcode);
                        prodMap[d.barcode] = { 
                          barcode: d.barcode, 
                          sku: prodObj ? prodObj.sku : "-", 
                          name: d.productName, 
                          qty: 0, 
                          total: 0 
                        };
                      }
                      prodMap[d.barcode].qty += Number(d.quantity || 0);
                      prodMap[d.barcode].total += Number(d.total || 0);
                    }
                  });
                  result = Object.values(prodMap).sort((a: any, b: any) => b.qty - a.qty);
                }

                return new Response(JSON.stringify(result), { status: 200 });
              }

              // Handle Dashboard calculations (Calculated dynamically!)
              if (path === "dashboard") {
                const [ordersRes, customersRes, productsRes, receiptsRes, detailsRes] = await Promise.all([
                  originalFetch(`${gasUrl}?action=orders`),
                  originalFetch(`${gasUrl}?action=customers`),
                  originalFetch(`${gasUrl}?action=products`),
                  originalFetch(`${gasUrl}?action=receipts`),
                  originalFetch(`${gasUrl}?action=orderDetails`)
                ]);

                const orders = await ordersRes.json();
                const customers = await customersRes.json();
                const products = await productsRes.json();
                const receipts = await receiptsRes.json();
                const orderDetails = await detailsRes.json();

                const activeOrders = orders.filter((o: any) => o.status !== "Draft");
                
                const todayStr = new Date().toISOString().split("T")[0];
                const currentMonthPrefix = todayStr.substring(0, 7);
                const currentYearPrefix = todayStr.substring(0, 4);

                let salesToday = 0;
                let salesMonth = 0;
                let salesYear = 0;

                activeOrders.forEach((o: any) => {
                  const oDate = o.date ? o.date.substring(0, 10) : "";
                  const net = Number(o.netTotal || 0);
                  if (oDate === todayStr) salesToday += net;
                  if (oDate.startsWith(currentMonthPrefix)) salesMonth += net;
                  if (oDate.startsWith(currentYearPrefix)) salesYear += net;
                });

                // Daily Sales for chart (last 10 days)
                const salesByDay: any = {};
                for (let i = 9; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const dStr = d.toISOString().split("T")[0];
                  salesByDay[dStr] = 0;
                }

                activeOrders.forEach((o: any) => {
                  const oDate = o.date ? o.date.substring(0, 10) : "";
                  if (salesByDay[oDate] !== undefined) {
                    salesByDay[oDate] += Number(o.netTotal || 0);
                  }
                });

                const dailyChartData = Object.keys(salesByDay).map(date => ({
                  date,
                  sales: salesByDay[date]
                }));

                // Best sellers
                const productSalesMap: any = {};
                const nonDraftOrderIds = new Set(activeOrders.map((o: any) => o.id));
                
                orderDetails.forEach((d: any) => {
                  if (nonDraftOrderIds.has(d.orderId)) {
                    if (!productSalesMap[d.barcode]) {
                      productSalesMap[d.barcode] = { name: d.productName, qty: 0, total: 0 };
                    }
                    productSalesMap[d.barcode].qty += Number(d.quantity || 0);
                    productSalesMap[d.barcode].total += Number(d.total || 0);
                  }
                });

                const topProducts = Object.values(productSalesMap)
                  .sort((a: any, b: any) => b.qty - a.qty)
                  .slice(0, 5);

                // Payment Summary
                let cashSales = 0;
                let transferSales = 0;
                let creditSales = 0;

                orders.forEach((o: any) => {
                  if (o.status === "Paid") {
                    const rec = receipts.find((r: any) => r.orderId === o.id);
                    if (rec) {
                      if (rec.method && rec.method.includes("เงินสด")) {
                        cashSales += Number(o.netTotal || 0);
                      } else {
                        transferSales += Number(o.netTotal || 0);
                      }
                    } else {
                      cashSales += Number(o.netTotal || 0);
                    }
                  } else if (o.status === "Confirmed") {
                    creditSales += Number(o.netTotal || 0);
                  }
                });

                const lowStockProducts = products.filter((p: any) => Number(p.stock || 0) < Number(p.minStock || 0)).length;

                return new Response(JSON.stringify({
                  kpis: {
                    salesToday,
                    salesMonth,
                    salesYear,
                    totalCustomers: customers.length,
                    totalProducts: products.length,
                    lowStockProducts
                  },
                  dailyChartData,
                  topProducts,
                  paymentSummary: {
                    cash: cashSales,
                    transfer: transferSales,
                    credit: creditSales
                  }
                }), { status: 200 });
              }
            }

            // 2. POST / PUT / DELETE requests
            if (init && init.method && ["POST", "PUT", "DELETE"].includes(init.method.toUpperCase())) {
              let bodyObj: any = {};
              try {
                bodyObj = JSON.parse(init.body as string);
              } catch (e) {}

              let action = "";
              let payload: any = {};

              if (path === "customers") {
                action = "createCustomer";
                payload = bodyObj;
              } 
              else if (path.startsWith("customers/")) {
                const id = path.split("/")[1];
                if (init.method.toUpperCase() === "PUT") {
                  action = "updateCustomer";
                  payload = bodyObj;
                } else if (init.method.toUpperCase() === "DELETE") {
                  action = "deleteCustomer";
                  payload = { id };
                }
              } 
              else if (path === "products") {
                action = "createProduct";
                payload = bodyObj;
              } 
              else if (path.startsWith("products/")) {
                const barcode = path.split("/")[1];
                if (init.method.toUpperCase() === "PUT") {
                  action = "updateProduct";
                  payload = bodyObj;
                } else if (init.method.toUpperCase() === "DELETE") {
                  action = "deleteProduct";
                  payload = { barcode };
                }
              } 
              else if (path === "order") {
                action = "createOrder";
                payload = bodyObj;
              } 
              else if (path.startsWith("order/")) {
                const id = path.split("/")[1];
                action = "updateOrder";
                payload = { id, status: bodyObj.status };
              } 
              else if (path === "receipt") {
                action = "createReceipt";
                payload = bodyObj;
              }

              if (action) {
                const userObj = localStorage.getItem("maemanit_user") ? JSON.parse(localStorage.getItem("maemanit_user")!) : null;
                const username = userObj ? userObj.username : "system";

                const res = await originalFetch(gasUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                  },
                  body: JSON.stringify({
                    action,
                    user: username,
                    ...payload
                  })
                });
                return res;
              }
            }
          } catch (err: any) {
            console.error("GAS Proxy Error:", err);
            return new Response(JSON.stringify({ success: false, error: err.toString() }), { status: 500 });
          }
        }

        // 2. Normal mode (try active Node.js backend first if not running Google Sheets mode)
        try {
          const originalResponse = await originalFetch(input, init);
          const contentType = originalResponse.headers.get("content-type") || "";
          
          // On static hosts like Netlify, calling non-existent APIs like /api/customers
          // returns a 404 HTML fallback page or standard 404 response.
          if (originalResponse.status !== 404 && !contentType.includes("text/html")) {
            return originalResponse;
          }
        } catch (fetchError) {
          console.warn("Backend server connection failed, falling back to client-side storage simulation:", fetchError);
        }

        // 3. Client-side LocalStorage database fallback (for Netlify / static deployments)
        const getLocalDB = () => {
          const dbStr = localStorage.getItem("maemanit_local_db");
          if (dbStr) {
            try { return JSON.parse(dbStr); } catch (e) {}
          }
          const initialDB = {
            customers: [
              { id: "CUST-001", name: "ร้านแกงส้มโบราณ (สาขาใหญ่)", type: "ขายส่ง", priceGroup: "A", paymentTerm: "เครดิต 30 วัน", address: "99/1 ถ.พหลโยธิน ต.เวียง อ.เมือง จ.พะเยา 56000", phone: "089-765-4321", email: "kaengsom@gmail.com", status: "ใช้งาน", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
              { id: "CUST-002", name: "คุณวิมล สุวรรณดี", type: "ขายปลีก", priceGroup: "C", paymentTerm: "เงินสด", address: "45 ถ.ธนาลัย ต.เวียง อ.เมือง จ.เชียงราย 57000", phone: "084-555-1234", email: "wimon.s@outlook.com", status: "ใช้งาน", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
              { id: "CUST-003", name: "บจก.ไทยฟู้ดส์ดิสทริบิวเตอร์", type: "ตัวแทน", priceGroup: "B", paymentTerm: "เครดิต 15 วัน", address: "1018/3 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110", phone: "02-123-4567", email: "contact@thaifoods.co.th", status: "ใช้งาน", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            ],
            products: [
              { barcode: "8850123456001", sku: "PM-001", name: "น้ำพริกตาแดงรสแซ่บ (กระปุกเล็ก)", unit: "กระปุก", priceA: 35, priceB: 38, priceC: 45, cost: 20, stock: 150, minStock: 20, status: "ใช้งาน" },
              { barcode: "8850123456002", sku: "PM-002", name: "น้ำพริกหนุ่มสูตรดั้งเดิม (กระปุกกลาง)", unit: "กระปุก", priceA: 45, priceB: 48, priceC: 55, cost: 25, stock: 80, minStock: 15, status: "ใช้งาน" },
              { barcode: "8850123456003", sku: "PM-003", name: "น้ำพริกนรกแมงดา (กระปุกเล็ก)", unit: "กระปุก", priceA: 35, priceB: 38, priceC: 45, cost: 20, stock: 120, minStock: 20, status: "ใช้งาน" }
            ],
            orders: [],
            orderDetails: [],
            receipts: [],
            logs: [
              { date: new Date().toISOString().substring(0, 10), time: new Date().toLocaleTimeString(), user: "system", action: "เปิดใช้งานฐานข้อมูลเบราว์เซอร์จำลอง", oldValue: "-", newValue: "ระบบพร้อมทำงานออฟไลน์แบบพกพา" }
            ]
          };
          localStorage.setItem("maemanit_local_db", JSON.stringify(initialDB));
          return initialDB;
        };

        const saveLocalDB = (dbState: any) => {
          localStorage.setItem("maemanit_local_db", JSON.stringify(dbState));
        };

        const db = getLocalDB();
        const isGet = !init || !init.method || init.method.toUpperCase() === "GET";

        // Handle GET Requests
        if (isGet) {
          if (path === "customers") return new Response(JSON.stringify(db.customers), { status: 200 });
          if (path === "products") return new Response(JSON.stringify(db.products), { status: 200 });
          if (path === "orders") return new Response(JSON.stringify(db.orders), { status: 200 });
          if (path === "receipts") return new Response(JSON.stringify(db.receipts), { status: 200 });
          if (path === "logs") return new Response(JSON.stringify(db.logs), { status: 200 });
          if (path.startsWith("orders/") && path.endsWith("/detail")) {
            const orderId = path.split("/")[1];
            const details = db.orderDetails.filter((d: any) => d.orderId === orderId);
            return new Response(JSON.stringify(details), { status: 200 });
          }
          if (path.startsWith("search")) {
            const urlObj = new URL(urlStr, window.location.origin);
            const q = (urlObj.searchParams.get("q") || "").toLowerCase();
            if (!q) {
              return new Response(JSON.stringify({ customers: [], products: [], orders: [] }), { status: 200 });
            }
            const filteredC = db.customers.filter((c: any) => 
              (c.id && c.id.toLowerCase().includes(q)) || 
              (c.name && c.name.toLowerCase().includes(q)) || 
              (c.phone && c.phone.includes(q))
            );
            const filteredP = db.products.filter((p: any) => 
              (p.barcode && p.barcode.includes(q)) || 
              (p.sku && p.sku.toLowerCase().includes(q)) || 
              (p.name && p.name.toLowerCase().includes(q))
            );
            const filteredO = db.orders.filter((o: any) => 
              (o.id && o.id.toLowerCase().includes(q)) || 
              (o.customerName && o.customerName.toLowerCase().includes(q))
            );
            return new Response(JSON.stringify({
              customers: filteredC,
              products: filteredP,
              orders: filteredO
            }), { status: 200 });
          }
          if (path.startsWith("report")) {
            const urlObj = new URL(urlStr, window.location.origin);
            const type = urlObj.searchParams.get("type") || "daily";
            const fromStr = urlObj.searchParams.get("from") || "";
            const toStr = urlObj.searchParams.get("to") || "";

            const activeOrders = db.orders.filter((o: any) => o.status !== "Draft");
            const dateFrom = fromStr ? new Date(fromStr) : new Date(0);
            const dateTo = toStr ? new Date(toStr) : new Date();
            dateTo.setHours(23, 59, 59, 999);

            const filteredOrders = activeOrders.filter((o: any) => {
              const oDate = new Date(o.date);
              return oDate >= dateFrom && oDate <= dateTo;
            });

            let result: any[] = [];
            if (type === "daily" || type === "monthly") {
              const groupMap: any = {};
              filteredOrders.forEach((o: any) => {
                const key = type === "monthly" ? o.date.substring(0, 7) : o.date;
                if (!groupMap[key]) {
                  groupMap[key] = { date: key, count: 0, total: 0, vat: 0, netTotal: 0 };
                }
                groupMap[key].count++;
                groupMap[key].total += Number(o.total || 0);
                groupMap[key].vat += Number(o.vat || 0);
                groupMap[key].netTotal += Number(o.netTotal || 0);
              });
              result = Object.values(groupMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
            } else if (type === "customer") {
              const custMap: any = {};
              filteredOrders.forEach((o: any) => {
                if (!custMap[o.customerId]) {
                  custMap[o.customerId] = { customerId: o.customerId, customerName: o.customerName, count: 0, total: 0, netTotal: 0 };
                }
                custMap[o.customerId].count++;
                custMap[o.customerId].total += Number(o.total || 0);
                custMap[o.customerId].netTotal += Number(o.netTotal || 0);
              });
              result = Object.values(custMap).sort((a: any, b: any) => b.netTotal - a.netTotal);
            } else if (type === "products") {
              const prodMap: any = {};
              const orderIdsSet = new Set(filteredOrders.map((o: any) => o.id));
              db.orderDetails.forEach((d: any) => {
                if (orderIdsSet.has(d.orderId)) {
                  if (!prodMap[d.barcode]) {
                    const prodObj = db.products.find((p: any) => p.barcode === d.barcode);
                    prodMap[d.barcode] = { 
                      barcode: d.barcode, 
                      sku: prodObj ? prodObj.sku : "-", 
                      name: d.productName, 
                      qty: 0, 
                      total: 0 
                    };
                  }
                  prodMap[d.barcode].qty += Number(d.quantity || 0);
                  prodMap[d.barcode].total += Number(d.total || 0);
                }
              });
              result = Object.values(prodMap).sort((a: any, b: any) => b.qty - a.qty);
            }
            return new Response(JSON.stringify(result), { status: 200 });
          }
          if (path === "dashboard") {
            const activeOrders = db.orders.filter((o: any) => o.status !== "Draft");
            const todayStr = new Date().toISOString().split("T")[0];
            const monthStr = todayStr.substring(0, 7);
            const yearStr = todayStr.substring(0, 4);

            let salesToday = 0;
            let salesMonth = 0;
            let salesYear = 0;

            activeOrders.forEach((o: any) => {
              const net = Number(o.netTotal || 0);
              if (o.date === todayStr) salesToday += net;
              if (o.date.startsWith(monthStr)) salesMonth += net;
              if (o.date.startsWith(yearStr)) salesYear += net;
            });

            // sales by day for chart (10 days)
            const salesByDay: any = {};
            for (let i = 9; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const dStr = d.toISOString().split("T")[0];
              salesByDay[dStr] = 0;
            }
            activeOrders.forEach((o: any) => {
              if (salesByDay[o.date] !== undefined) {
                salesByDay[o.date] += Number(o.netTotal || 0);
              }
            });
            const dailyChartData = Object.keys(salesByDay).map(d => ({ date: d, sales: salesByDay[d] }));

            // best sellers
            const prodSales: any = {};
            db.orderDetails.forEach((d: any) => {
              if (!prodSales[d.barcode]) prodSales[d.barcode] = { name: d.productName, qty: 0, total: 0 };
              prodSales[d.barcode].qty += Number(d.quantity || 0);
              prodSales[d.barcode].total += Number(d.total || 0);
            });
            const topProducts = Object.values(prodSales).sort((a: any, b: any) => b.qty - a.qty).slice(0, 5);

            const lowStockProducts = db.products.filter((p: any) => Number(p.stock || 0) < Number(p.minStock || 0)).length;

            return new Response(JSON.stringify({
              kpis: { salesToday, salesMonth, salesYear, totalCustomers: db.customers.length, totalProducts: db.products.length, lowStockProducts },
              dailyChartData,
              topProducts,
              paymentSummary: { cash: salesMonth * 0.5, transfer: salesMonth * 0.5, credit: 0 }
            }), { status: 200 });
          }
        }

        // Handle POST / PUT / DELETE Requests
        if (init && init.method) {
          let bodyObj: any = {};
          try { bodyObj = JSON.parse(init.body as string); } catch (e) {}
          const method = init.method.toUpperCase();

          // POST /api/customers
          if (path === "customers" && method === "POST") {
            const customer = bodyObj;
            if (!customer.id) {
              customer.id = `CUST-${String(db.customers.length + 1).padStart(3, "0")}`;
            }
            customer.createdAt = new Date().toISOString();
            customer.updatedAt = new Date().toISOString();
            db.customers.push(customer);
            saveLocalDB(db);
            return new Response(JSON.stringify(customer), { status: 200 });
          }
          // PUT /api/customers/:id
          if (path.startsWith("customers/") && method === "PUT") {
            const id = path.split("/")[1];
            const idx = db.customers.findIndex((c: any) => c.id === id);
            if (idx !== -1) {
              db.customers[idx] = { ...db.customers[idx], ...bodyObj, updatedAt: new Date().toISOString() };
              saveLocalDB(db);
              return new Response(JSON.stringify(db.customers[idx]), { status: 200 });
            }
          }
          // DELETE /api/customers/:id
          if (path.startsWith("customers/") && method === "DELETE") {
            const id = path.split("/")[1];
            db.customers = db.customers.filter((c: any) => c.id !== id);
            saveLocalDB(db);
            return new Response(JSON.stringify({ success: true }), { status: 200 });
          }

          // POST /api/products
          if (path === "products" && method === "POST") {
            const product = bodyObj;
            db.products.push(product);
            saveLocalDB(db);
            return new Response(JSON.stringify(product), { status: 200 });
          }
          // PUT /api/products/:barcode
          if (path.startsWith("products/") && method === "PUT") {
            const barcode = path.split("/")[1];
            const idx = db.products.findIndex((p: any) => p.barcode === barcode);
            if (idx !== -1) {
              db.products[idx] = { ...db.products[idx], ...bodyObj };
              saveLocalDB(db);
              return new Response(JSON.stringify(db.products[idx]), { status: 200 });
            }
          }
          // DELETE /api/products/:barcode
          if (path.startsWith("products/") && method === "DELETE") {
            const barcode = path.split("/")[1];
            db.products = db.products.filter((p: any) => p.barcode !== barcode);
            saveLocalDB(db);
            return new Response(JSON.stringify({ success: true }), { status: 200 });
          }

          // POST /api/order
          if (path === "order" && method === "POST") {
            const { items, ...orderInfo } = bodyObj;
            const dateStr = new Date().toISOString().substring(2, 10).replace(/-/g, "");
            const orderId = `INV-${dateStr}-${String(db.orders.length + 1).padStart(3, "0")}`;
            const newOrder = {
              id: orderId,
              date: new Date().toISOString().substring(0, 10),
              ...orderInfo,
              createdAt: new Date().toISOString()
            };
            db.orders.push(newOrder);

            // Add items
            items.forEach((item: any) => {
              db.orderDetails.push({
                id: `DT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                orderId,
                ...item
              });

              // Deduct stock if Confirmed/Paid
              if (newOrder.status !== "Draft") {
                const prod = db.products.find((p: any) => p.barcode === item.barcode);
                if (prod) {
                  prod.stock = Math.max(0, Number(prod.stock || 0) - Number(item.quantity || 0));
                }
              }
            });

            // log action
            db.logs.push({
              date: new Date().toISOString().substring(0, 10),
              time: new Date().toLocaleTimeString(),
              user: "admin",
              action: "สร้างใบสั่งซื้อใหม่",
              oldValue: "-",
              newValue: `เลขที่บิล: ${orderId}, ยอดรวม: ฿${newOrder.netTotal}`
            });

            saveLocalDB(db);
            return new Response(JSON.stringify({ success: true, order: newOrder }), { status: 200 });
          }

          // PUT /api/order/:id (Status Update)
          if (path.startsWith("order/") && method === "PUT") {
            const id = path.split("/")[1];
            const ord = db.orders.find((o: any) => o.id === id);
            if (ord) {
              const oldStatus = ord.status;
              ord.status = bodyObj.status;
              
              // If moving from Draft to Confirmed/Paid, deduct stock
              if (oldStatus === "Draft" && bodyObj.status !== "Draft") {
                const details = db.orderDetails.filter((d: any) => d.orderId === id);
                details.forEach((d: any) => {
                  const prod = db.products.find((p: any) => p.barcode === d.barcode);
                  if (prod) {
                    prod.stock = Math.max(0, Number(prod.stock || 0) - Number(d.quantity || 0));
                  }
                });
              }

              db.logs.push({
                date: new Date().toISOString().substring(0, 10),
                time: new Date().toLocaleTimeString(),
                user: "admin",
                action: "ปรับสถานะบิล",
                oldValue: oldStatus,
                newValue: bodyObj.status
              });

              saveLocalDB(db);
              return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
          }

          // POST /api/receipt
          if (path === "receipt" && method === "POST") {
            const receipt = {
              id: `REC-${Date.now()}`,
              date: new Date().toISOString().substring(0, 10),
              ...bodyObj
            };
            db.receipts.push(receipt);

            // Update order status
            const ord = db.orders.find((o: any) => o.id === bodyObj.orderId);
            if (ord) {
              ord.status = "Paid";
            }

            db.logs.push({
              date: new Date().toISOString().substring(0, 10),
              time: new Date().toLocaleTimeString(),
              user: "admin",
              action: "ออกใบเสร็จรับเงิน",
              oldValue: "-",
              newValue: `เลขที่บิล: ${bodyObj.orderId}`
            });

            saveLocalDB(db);
            return new Response(JSON.stringify({ success: true, receipt }), { status: 200 });
          }

          // POST /api/login
          if (path === "login" && method === "POST") {
            const { username, password } = bodyObj;
            const normalizedUser = (username || "").trim().toLowerCase();
            if (normalizedUser === "admin" && password === "admin123") {
              return new Response(JSON.stringify({ success: true, user: { username: "admin", role: "Admin" } }), { status: 200 });
            }
            if (normalizedUser === "sales" && password === "sales123") {
              return new Response(JSON.stringify({ success: true, user: { username: "sales", role: "Sales" } }), { status: 200 });
            }
            if (normalizedUser === "viewer" && password === "viewer123") {
              return new Response(JSON.stringify({ success: true, user: { username: "viewer", role: "Viewer" } }), { status: 200 });
            }
            return new Response(JSON.stringify({ success: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }), { status: 401 });
          }
        }

        return new Response(JSON.stringify({ error: "Endpoint fallback not found" }), { status: 404 });
      }

      return originalFetch(input, init);
    };

    try {
      Object.defineProperty(window, 'fetch', {
        value: customFetch,
        configurable: true,
        writable: true,
      });
    } catch (e) {
      console.warn("Failed to define custom fetch on window, falling back to direct assignment:", e);
      try {
        (window as any).fetch = customFetch;
      } catch (err) {}
    }

    return () => {
      try {
        Object.defineProperty(window, 'fetch', {
          value: originalFetch,
          configurable: true,
          writable: true,
        });
      } catch (e) {
        console.warn("Failed to restore original fetch via Object.defineProperty:", e);
        try {
          (window as any).fetch = originalFetch;
        } catch (err) {}
      }
    };
  }, [gasMode, gasUrl]);

  // Global Search State
  const [globalSearchText, setGlobalSearchText] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<{ customers: any[]; products: any[]; orders: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Print State Overlay
  const [printState, setPrintState] = useState<{ active: boolean; docType: "invoice" | "receipt"; orderId: string } | null>(null);

  // Handle Log Out
  const handleLogOut = () => {
    localStorage.removeItem("maemanit_user");
    setCurrentUser(null);
  };

  // Handle Login Success
  const handleLoginSuccess = (user: { username: string; role: "Admin" | "Sales" | "Viewer" }) => {
    localStorage.setItem("maemanit_user", JSON.stringify(user));
    setCurrentUser(user);
    setCurrentTab("dashboard");
  };

  // Perform Global General Search (calls API /api/search)
  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearchText.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(globalSearchText)}`);
      if (res.ok) {
        const json = await res.json();
        setGlobalSearchResults(json);
      }
    } catch (err) {
      console.error("Global search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // If not logged in, show beautiful login screen
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Trigger document print
  const handlePrintTrigger = (docType: "invoice" | "receipt", orderId: string) => {
    setPrintState({ active: true, docType, orderId });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex relative font-sans text-gray-800">
      
      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-20 md:hidden non-printable"
        />
      )}
      
      {/* SIDEBAR NAVIGATION - Responsive */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-emerald-50/85 backdrop-blur-md border-r border-emerald-100/50 text-slate-800 flex flex-col justify-between transition-transform duration-200 transform md:translate-x-0 md:relative shrink-0 shadow-[4px_0_24px_rgba(16,185,129,0.06)] ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } non-printable`}>
        <div className="flex flex-col space-y-6">
          
          {/* Sidebar Top: Logo */}
          <div className="p-6 pb-2 flex items-center justify-between border-b border-emerald-100/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-emerald-600 rounded-xl text-white font-bold text-lg flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
                ม
              </div>
              <div className="leading-tight">
                <span className="text-sm font-black tracking-tight block text-emerald-950">น้ำพริกแม่มานิต</span>
                <span className="text-[10px] text-emerald-800/80 font-semibold block">ระบบบัญชีและการจัดส่ง</span>
              </div>
            </div>
            
            {/* Mobile close menu btn */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar Tabs Navigation */}
          <nav className="px-4 space-y-1">
            {/* Dashboard */}
            <button
              onClick={() => { setCurrentTab("dashboard"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-all ${
                currentTab === "dashboard" 
                  ? "bg-emerald-600 text-white shadow-md font-bold" 
                  : "text-emerald-900/85 hover:text-emerald-950 hover:bg-emerald-100/60"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              ภาพรวมร้านค้า (Dashboard)
            </button>

            {/* Products */}
            <button
              onClick={() => { setCurrentTab("products"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-all ${
                currentTab === "products" 
                  ? "bg-emerald-600 text-white shadow-md font-bold" 
                  : "text-emerald-900/85 hover:text-emerald-950 hover:bg-emerald-100/60"
              }`}
            >
              <Package className="w-4 h-4" />
              จัดการสินค้า (Products)
            </button>

            {/* Customers */}
            <button
              onClick={() => { setCurrentTab("customers"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-all ${
                currentTab === "customers" 
                  ? "bg-emerald-600 text-white shadow-md font-bold" 
                  : "text-emerald-900/85 hover:text-emerald-950 hover:bg-emerald-100/60"
              }`}
            >
              <Users className="w-4 h-4" />
              จัดการลูกค้า (Customers)
            </button>

            {/* Orders */}
            <button
              onClick={() => { setCurrentTab("orders"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-all ${
                currentTab === "orders" 
                  ? "bg-emerald-600 text-white shadow-md font-bold" 
                  : "text-emerald-900/85 hover:text-emerald-950 hover:bg-emerald-100/60"
              }`}
            >
              <FileText className="w-4 h-4" />
              ใบขาย / ส่งของ (Orders)
            </button>

            {/* Receipts */}
            <button
              onClick={() => { setCurrentTab("receipts"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-all ${
                currentTab === "receipts" 
                  ? "bg-emerald-600 text-white shadow-md font-bold" 
                  : "text-emerald-900/85 hover:text-emerald-950 hover:bg-emerald-100/60"
              }`}
            >
              <Receipt className="w-4 h-4" />
              คลังใบเสร็จรับเงิน (Receipts)
            </button>

            {/* Reports */}
            <button
              onClick={() => { setCurrentTab("reports"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-all ${
                currentTab === "reports" 
                  ? "bg-emerald-600 text-white shadow-md font-bold" 
                  : "text-emerald-900/85 hover:text-emerald-950 hover:bg-emerald-100/60"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              วิเคราะห์รายงาน (Reports)
            </button>

            {/* Google Sheets Integration */}
            <button
              onClick={() => { setCurrentTab("gas"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-all ${
                currentTab === "gas" 
                  ? "bg-emerald-600 text-white shadow-md font-bold" 
                  : "text-emerald-900/85 hover:text-emerald-950 hover:bg-emerald-100/60"
              }`}
            >
              <Database className="w-4 h-4" />
              ต่อ Google Sheets (GAS)
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom: User Session & Log Out */}
        <div className="p-4 border-t border-emerald-100/50 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-700 flex items-center justify-center font-semibold font-sans text-xs">
              {currentUser.username[0].toUpperCase()}
            </div>
            <div className="leading-tight">
              <span className="text-xs font-bold text-emerald-950 block truncate max-w-[130px]">{currentUser.username}</span>
              <span className="text-[10px] text-emerald-800/70 font-semibold block">{currentUser.role} Account</span>
            </div>
          </div>

          <button
            onClick={handleLogOut}
            className="w-full flex items-center justify-center gap-2 py-2 border border-emerald-200/60 text-emerald-800 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* TOP LAYOUT BAR */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0 non-printable">
          {/* Left: Menu toggler & Screen Identifier */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-gray-600 hover:text-slate-900 hover:bg-gray-50 border border-gray-200/60 rounded-xl cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase font-mono">
              <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
              {gasMode ? "GOOGLE SHEETS LIVE DATABASE ACTIVE" : "LOCAL DEMO STORAGE ACTIVE"}
            </div>
          </div>

          {/* Right: Global General Search Bar */}
          <form onSubmit={handleGlobalSearch} className="flex items-center gap-2 max-w-sm w-full relative">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="ค้นหาด่วน (บาร์โค้ด, เลขบิล, ลูกค้า)..."
                value={globalSearchText}
                onChange={(e) => setGlobalSearchText(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/40"
              />
            </div>
            <button 
              type="submit"
              disabled={isSearching}
              className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs shrink-0 cursor-pointer transition-all"
            >
              ค้นหา
            </button>
          </form>
        </header>

        {/* MAIN BODY WORKSPACE */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 overflow-y-auto">
          {currentTab === "dashboard" && <Dashboard userRole={currentUser.role} />}
          {currentTab === "products" && <Products userRole={currentUser.role} />}
          {currentTab === "customers" && <Customers userRole={currentUser.role} />}
          {currentTab === "orders" && <Orders userRole={currentUser.role} onPrint={handlePrintTrigger} />}
          {currentTab === "receipts" && <Receipts userRole={currentUser.role} />}
          {currentTab === "reports" && <Reports userRole={currentUser.role} />}
          {currentTab === "gas" && (
            <GasIntegration 
              gasUrl={gasUrl} 
              setGasUrl={setGasUrl} 
              gasMode={gasMode} 
              setGasMode={setGasMode} 
            />
          )}
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-emerald-50/90 backdrop-blur-md border-t border-emerald-200/50 text-slate-800 md:hidden non-printable shadow-[0_-8px_32px_rgba(16,185,129,0.15)] select-none">
          <div className="flex items-center justify-start overflow-x-auto scrollbar-none snap-x px-3 py-2 gap-2.5">
            {/* Dashboard */}
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`flex flex-col items-center justify-center shrink-0 w-[68px] py-1.5 rounded-xl transition-all cursor-pointer ${
                currentTab === "dashboard"
                  ? "bg-emerald-600 text-white font-bold animate-pulse-once"
                  : "text-emerald-800/75 active:text-emerald-950 hover:text-emerald-900"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-[9px] font-semibold mt-0.5 font-sans whitespace-nowrap">ภาพรวม</span>
            </button>
            
            {/* Products */}
            <button
              onClick={() => setCurrentTab("products")}
              className={`flex flex-col items-center justify-center shrink-0 w-[68px] py-1.5 rounded-xl transition-all cursor-pointer ${
                currentTab === "products"
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-emerald-800/75 active:text-emerald-950 hover:text-emerald-900"
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="text-[9px] font-semibold mt-0.5 font-sans whitespace-nowrap">สินค้า</span>
            </button>
            
            {/* Customers */}
            <button
              onClick={() => setCurrentTab("customers")}
              className={`flex flex-col items-center justify-center shrink-0 w-[68px] py-1.5 rounded-xl transition-all cursor-pointer ${
                currentTab === "customers"
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-emerald-800/75 active:text-emerald-950 hover:text-emerald-900"
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[9px] font-semibold mt-0.5 font-sans whitespace-nowrap">ลูกค้า</span>
            </button>
            
            {/* Orders */}
            <button
              onClick={() => setCurrentTab("orders")}
              className={`flex flex-col items-center justify-center shrink-0 w-[68px] py-1.5 rounded-xl transition-all cursor-pointer ${
                currentTab === "orders"
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-emerald-800/75 active:text-emerald-950 hover:text-emerald-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[9px] font-semibold mt-0.5 font-sans whitespace-nowrap">ใบขาย</span>
            </button>
            
            {/* Receipts */}
            <button
              onClick={() => setCurrentTab("receipts")}
              className={`flex flex-col items-center justify-center shrink-0 w-[68px] py-1.5 rounded-xl transition-all cursor-pointer ${
                currentTab === "receipts"
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-emerald-800/75 active:text-emerald-950 hover:text-emerald-900"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span className="text-[9px] font-semibold mt-0.5 font-sans whitespace-nowrap">ใบเสร็จ</span>
            </button>
            
            {/* Reports */}
            <button
              onClick={() => setCurrentTab("reports")}
              className={`flex flex-col items-center justify-center shrink-0 w-[68px] py-1.5 rounded-xl transition-all cursor-pointer ${
                currentTab === "reports"
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-emerald-800/75 active:text-emerald-950 hover:text-emerald-900"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-[9px] font-semibold mt-0.5 font-sans whitespace-nowrap">รายงาน</span>
            </button>
            
            {/* GAS Integration */}
            <button
              onClick={() => setCurrentTab("gas")}
              className={`flex flex-col items-center justify-center shrink-0 w-[68px] py-1.5 rounded-xl transition-all cursor-pointer ${
                currentTab === "gas"
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-emerald-800/75 active:text-emerald-950 hover:text-emerald-900"
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="text-[9px] font-semibold mt-0.5 font-sans whitespace-nowrap">ต่อ Sheets</span>
            </button>
          </div>
        </div>
      </div>

      {/* GLOBAL SEARCH RESULTS POPUP MODAL */}
      {globalSearchResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm font-sans flex items-center gap-2">
                <Search className="w-4.5 h-4.5 text-emerald-500" />
                ผลการค้นหาทั่วไปสำหรับ "{globalSearchText}"
              </h3>
              <button 
                onClick={() => { setGlobalSearchResults(null); setGlobalSearchText(""); }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Products Section */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 block uppercase font-sans tracking-wider">หมวดสินค้า ({globalSearchResults.products.length})</span>
                {globalSearchResults.products.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">ไม่พบข้อมูลสินค้า</p>
                ) : (
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden text-xs">
                    {globalSearchResults.products.map(p => (
                      <div key={p.barcode} className="p-3 bg-gray-50/50 flex justify-between items-center hover:bg-emerald-50/10 cursor-pointer" onClick={() => { setCurrentTab("products"); setGlobalSearchResults(null); }}>
                        <div>
                          <span className="font-bold text-slate-900">{p.name}</span>
                          <span className="block text-[10px] text-gray-400 font-mono mt-0.5">บาร์โค้ด: {p.barcode} | SKU: {p.sku} | สต็อกคงเหลือ: {p.stock}</span>
                        </div>
                        <span className="font-bold font-mono text-emerald-600">฿{p.priceC}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customers Section */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 block uppercase font-sans tracking-wider">หมวดลูกค้า ({globalSearchResults.customers.length})</span>
                {globalSearchResults.customers.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">ไม่พบข้อมูลลูกค้า</p>
                ) : (
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden text-xs">
                    {globalSearchResults.customers.map(c => (
                      <div key={c.id} className="p-3 bg-gray-50/50 flex justify-between items-center hover:bg-emerald-50/10 cursor-pointer" onClick={() => { setCurrentTab("customers"); setGlobalSearchResults(null); }}>
                        <div>
                          <span className="font-bold text-slate-900">{c.name}</span>
                          <span className="block text-[10px] text-gray-400 mt-0.5">ประเภท: {c.type} | ชำระเครดิต: {c.paymentTerm}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700">{c.priceGroup} Price</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Orders Section */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 block uppercase font-sans tracking-wider">หมวดใบขาย / บิลสินค้า ({globalSearchResults.orders.length})</span>
                {globalSearchResults.orders.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">ไม่พบข้อมูลใบขาย</p>
                ) : (
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden text-xs">
                    {globalSearchResults.orders.map(o => (
                      <div key={o.id} className="p-3 bg-gray-50/50 flex justify-between items-center hover:bg-emerald-50/10 cursor-pointer" onClick={() => { setCurrentTab("orders"); setGlobalSearchResults(null); }}>
                        <div>
                          <span className="font-bold text-slate-900">{o.id}</span>
                          <span className="block text-[10px] text-gray-400 mt-0.5">ลูกค้า: {o.customerName} | วันที่บิล: {o.date}</span>
                        </div>
                        <span className="font-bold font-mono text-slate-900">฿{o.netTotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PRINT LAYOUT OVERLAY */}
      {printState && printState.active && (
        <PrintDocument 
          docType={printState.docType} 
          orderId={printState.orderId} 
          onClose={() => setPrintState(null)} 
        />
      )}

    </div>
  );
}
