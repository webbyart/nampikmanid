import React, { useEffect, useState } from "react";
import { 
  FileText, Search, PlusCircle, Eye, RefreshCw, X, 
  Trash2, ShoppingBag, DollarSign, Calendar, ChevronRight, 
  CheckCircle, ArrowRight, Printer, AlertTriangle, ListFilter
} from "lucide-react";
import { SalesOrder, Customer, Product, SalesDetail } from "../types";

interface OrdersProps {
  userRole: string;
  onPrint: (docType: "invoice" | "receipt", orderId: string) => void;
}

export default function Orders({ userRole, onPrint }: OrdersProps) {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  // View details modal state
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SalesDetail[]>([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Create order wizard state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newOrderCustId, setNewOrderCustId] = useState("");
  const [newOrderDiscount, setNewOrderDiscount] = useState(0);
  const [newOrderStatus, setNewOrderStatus] = useState<"Draft" | "Confirmed" | "Paid">("Draft");
  
  // Active draft cart items
  const [cart, setCart] = useState<Array<{
    barcode: string;
    productName: string;
    price: number;
    quantity: number;
    unit: string;
    maxStock: number;
  }>>([]);

  // Live item searching
  const [itemSearchText, setItemSearchText] = useState("");
  const [searchProductResults, setSearchProductResults] = useState<Product[]>([]);

  // Simple Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, custRes, prodRes] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/customers"),
        fetch("/api/products")
      ]);

      if (!ordRes.ok || !custRes.ok || !prodRes.ok) {
        throw new Error("ดาวน์โหลดข้อมูลล้มเหลว");
      }

      const [ordData, custData, prodData] = await Promise.all([
        ordRes.json(),
        custRes.json(),
        prodRes.json()
      ]);

      setOrders(ordData);
      setCustomers(custData.filter((c: Customer) => c.status === "ใช้งาน"));
      setProducts(prodData.filter((p: Product) => p.status === "ใช้งาน"));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Detailed Modal Loader
  const handleViewOrder = async (order: SalesOrder) => {
    setSelectedOrder(order);
    setViewModalOpen(true);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/detail`);
      if (!res.ok) throw new Error("ไม่สามารถเรียกดูข้อมูลรายละเอียดสินค้าได้");
      const json = await res.json();
      setSelectedOrderDetails(json.details);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Status adjustment
  const handleStatusChange = async (orderId: string, newStatus: "Draft" | "Confirmed" | "Paid") => {
    if (userRole === "Viewer") {
      showToast("error", "คุณไม่มีสิทธิ์ในการแก้ไขสถานะเอกสาร");
      return;
    }

    try {
      const res = await fetch(`/api/order/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user": userRole
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "การปรับปรุงสถานะขัดข้อง");

      showToast("success", `อัปเดตสถานะบิล ${orderId} เป็น [${newStatus}] สำเร็จ!`);
      
      // Update local states
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus, paymentStatus: newStatus === "Paid" ? "Paid" : selectedOrder.paymentStatus });
      }
      fetchData();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  // Live query for products in cart creation
  useEffect(() => {
    if (!itemSearchText.trim()) {
      setSearchProductResults([]);
      return;
    }
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(itemSearchText.toLowerCase()) || 
      p.barcode.includes(itemSearchText)
    );
    setSearchProductResults(filtered.slice(0, 5));
  }, [itemSearchText, products]);

  // Determine pricing based on selected customer's priceGroup (A, B, C)
  const getProductPriceForSelectedCustomer = (product: Product): number => {
    const cust = customers.find(c => c.id === newOrderCustId);
    if (!cust) return product.priceC; // fallback to retail price
    
    switch (cust.priceGroup) {
      case "A": return product.priceA;
      case "B": return product.priceB;
      case "C": return product.priceC;
      default: return product.priceC;
    }
  };

  const handleAddCartItem = (product: Product) => {
    if (!newOrderCustId) {
      showToast("error", "กรุณาเลือกลูกค้าของบิลก่อนเพื่อคำนวณราคาอัตโนมัติ");
      return;
    }

    // Check if product already exists in cart
    const existingIndex = cart.findIndex(item => item.barcode === product.barcode);
    const unitPrice = getProductPriceForSelectedCustomer(product);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].quantity + 1 > product.stock) {
        showToast("error", `สินค้าคงเหลือไม่เพียงพอบนคลัง (สต็อก: ${product.stock} ${product.unit})`);
        return;
      }
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      if (product.stock < 1) {
        showToast("error", "สินค้าหมดคลังชั่วคราว");
        return;
      }
      setCart([...cart, {
        barcode: product.barcode,
        productName: product.name,
        price: unitPrice,
        quantity: 1,
        unit: product.unit,
        maxStock: product.stock
      }]);
    }
    setItemSearchText("");
    setSearchProductResults([]);
  };

  const handleRemoveCartItem = (barcode: string) => {
    setCart(cart.filter(item => item.barcode !== barcode));
  };

  const handleCartQtyChange = (barcode: string, qty: number) => {
    const updated = cart.map(item => {
      if (item.barcode === barcode) {
        const targetQty = Math.max(1, qty);
        if (targetQty > item.maxStock) {
          showToast("error", `สินค้าคงเหลือไม่เพียงพอบนคลัง (สต็อก: ${item.maxStock})`);
          return item;
        }
        return { ...item, quantity: targetQty };
      }
      return item;
    });
    setCart(updated);
  };

  // Calc order values
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartVat = Math.round(((cartSubtotal - newOrderDiscount) * 0.07) * 100) / 100;
  const cartNetTotal = cartSubtotal - newOrderDiscount + cartVat;

  const handleOpenCreateModal = () => {
    if (userRole === "Viewer") {
      showToast("error", "คุณไม่มีสิทธิ์สร้างบิลใหม่");
      return;
    }
    setNewOrderCustId("");
    setCart([]);
    setNewOrderDiscount(0);
    setNewOrderStatus("Draft");
    setCreateModalOpen(true);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCustId) {
      showToast("error", "กรุณาเลือกข้อมูลลูกค้า");
      return;
    }
    if (cart.length === 0) {
      showToast("error", "กรุณาเลือกรายการสินค้าอย่างน้อย 1 ชิ้น");
      return;
    }

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": userRole
        },
        body: JSON.stringify({
          customerId: newOrderCustId,
          discount: newOrderDiscount,
          status: newOrderStatus,
          items: cart.map(item => ({
            barcode: item.barcode,
            quantity: item.quantity,
            price: item.price
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูลใบขาย");

      showToast("success", `บันทึกใบขายสำเร็จ! เลขที่บิล ${data.order.id}`);
      setCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                          o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-sans font-semibold flex items-center gap-2 transition-all animate-bounce ${
          toast.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          <CheckCircle className={`w-4 h-4 ${toast.type === "success" ? "text-emerald-600" : "text-rose-600"}`} />
          {toast.msg}
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 id="orders-title" className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 font-sans">จัดการใบขายสินค้า (Orders / Invoices)</h1>
          <p className="text-[11px] sm:text-xs text-gray-500 font-sans mt-0.5">ออกใบขาย ยืนยันคำสั่งซื้อ ตัดสต็อกสินค้าคงเหลือแบบเรียลไทม์ และเตรียมเอกสารพิมพ์</p>
        </div>
        {userRole !== "Viewer" && (
          <button 
            id="create-order-btn"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold rounded-lg shadow-sm cursor-pointer transition-colors self-start sm:self-auto shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            สร้างใบขายบิลใหม่
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="ค้นหาเลขที่บิล หรือชื่อร้านค้าลูกค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
          />
        </div>

        {/* Status Tab buttons */}
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-lg overflow-x-auto max-w-full whitespace-nowrap scrollbar-none justify-start md:justify-center">
          {["ALL", "Draft", "Confirmed", "Paid"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold font-sans cursor-pointer transition-all shrink-0 ${
                statusFilter === st 
                  ? "bg-white text-slate-900 shadow-xs" 
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {st === "ALL" ? "ทั้งหมด" : st === "Draft" ? "ร่าง (Draft)" : st === "Confirmed" ? "ยืนยัน (Confirmed)" : "ชำระแล้ว (Paid)"}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-gray-400 font-sans">กำลังดาวน์โหลดข้อมูลใบขาย...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-sans text-xs">{error}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-sans text-xs">ไม่พบรายการใบขายที่ตรงตามเงื่อนไข</div>
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-sans text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 sm:py-3.5 sm:px-4">เลขที่บิล</th>
                  <th className="py-2.5 px-3 sm:py-3.5 sm:px-4">วันที่ออกเอกสาร</th>
                  <th className="py-2.5 px-3 sm:py-3.5 sm:px-4">ลูกค้า</th>
                  <th className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-right">ยอดรวมสินค้า</th>
                  <th className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-right">ยอดส่วนลด</th>
                  <th className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-right">ยอดรวมสุทธิ (+7% VAT)</th>
                  <th className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-center">สถานะบิล</th>
                  <th className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans text-[11px] sm:text-xs text-gray-700">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => handleViewOrder(o)}>
                    <td className="py-3 px-3 sm:py-4 sm:px-4 font-mono text-[11px] sm:text-xs font-bold text-slate-900">{o.id}</td>
                    <td className="py-3 px-3 sm:py-4 sm:px-4 text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {o.date}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:py-4 sm:px-4">
                      <span className="font-semibold text-gray-800">{o.customerName}</span>
                      <span className="block font-mono text-[9px] text-gray-400 mt-0.5">ID: {o.customerId}</span>
                    </td>
                    <td className="py-3 px-3 sm:py-4 sm:px-4 text-right font-mono text-gray-500">฿{o.total.toLocaleString()}</td>
                    <td className="py-3 px-3 sm:py-4 sm:px-4 text-right font-mono text-amber-600">- ฿{o.discount.toLocaleString()}</td>
                    <td className="py-3 px-3 sm:py-4 sm:px-4 text-right font-mono font-bold text-gray-900">฿{o.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-3 sm:py-4 sm:px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        o.status === "Paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        o.status === "Confirmed" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${o.status === "Paid" ? "bg-emerald-500" : o.status === "Confirmed" ? "bg-blue-500" : "bg-amber-500"}`}></span>
                        {o.status === "Paid" ? "ชำระเงินแล้ว" : o.status === "Confirmed" ? "ยืนยันแล้ว" : "ร่างบิล (Draft)"}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:py-4 sm:px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button 
                           onClick={() => handleViewOrder(o)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="ดูรายละเอียดบิล"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onPrint("invoice", o.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="พิมพ์ใบกำกับภาษี"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Detailed Bill Modal */}
      {viewModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 font-sans">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-semibold text-sm font-sans flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                รายละเอียดบิล {selectedOrder.id}
              </h3>
              <button 
                onClick={() => setViewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Summary Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">ลูกค้า</span>
                  <span className="text-xs font-semibold text-gray-800">{selectedOrder.customerName}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">วันที่บิล</span>
                  <span className="text-xs font-mono text-gray-600">{selectedOrder.date}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">สถานะใบขาย</span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    selectedOrder.status === "Paid" ? "bg-emerald-100 text-emerald-800" :
                    selectedOrder.status === "Confirmed" ? "bg-blue-100 text-blue-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>{selectedOrder.status}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">ยอดชำระสุทธิ</span>
                  <span className="text-xs font-mono font-bold text-gray-900">฿{selectedOrder.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 font-sans uppercase">รายการสินค้าน้ำพริกในบิล</h4>
                <div className="border border-gray-100 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {loadingDetails ? (
                    <div className="flex justify-center items-center py-6">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead className="bg-gray-50 text-gray-400 font-bold text-[10px]">
                        <tr className="border-b border-gray-100">
                          <th className="p-2 px-3">บาร์โค้ด</th>
                          <th className="p-2">สินค้า</th>
                          <th className="p-2 text-right">ราคาต่อหน่วย</th>
                          <th className="p-2 text-center">จำนวน</th>
                          <th className="p-2 text-right px-3">รวมยอด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                        {selectedOrderDetails.map((det, index) => (
                          <tr key={index} className="hover:bg-gray-50/50">
                            <td className="p-2 px-3 font-mono text-[10px] text-gray-500">{det.barcode}</td>
                            <td className="p-2 text-slate-800 font-semibold">{det.productName}</td>
                            <td className="p-2 text-right font-mono">฿{det.price}</td>
                            <td className="p-2 text-center font-mono font-semibold">{det.quantity}</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900 px-3">฿{det.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Total Summary Breakdown */}
              <div className="w-64 ml-auto font-sans text-xs space-y-2 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-gray-500">
                  <span>ยอดรวมสินค้า:</span>
                  <span className="font-mono">฿{selectedOrder.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>ส่วนลดบิล:</span>
                  <span className="font-mono">- ฿{selectedOrder.discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>ภาษีมูลค่าเพิ่ม (7% VAT):</span>
                  <span className="font-mono">฿{selectedOrder.vat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-gray-900 pt-1.5 border-t border-dashed border-gray-200">
                  <span>ยอดสุทธิทั้งหมด:</span>
                  <span className="font-mono text-emerald-600">฿{selectedOrder.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Management Controls / Transitions */}
              {userRole !== "Viewer" && (
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 font-sans uppercase">เปลี่ยนสถานะบิล:</span>
                  <div className="flex gap-2">
                    {selectedOrder.status !== "Draft" && (
                      <button 
                        onClick={() => handleStatusChange(selectedOrder.id, "Draft")}
                        className="px-3 py-1.5 text-[10px] font-bold font-sans bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors"
                      >
                        ย้อนกลับไปร่าง (Draft)
                      </button>
                    )}
                    {selectedOrder.status !== "Confirmed" && (
                      <button 
                        onClick={() => handleStatusChange(selectedOrder.id, "Confirmed")}
                        className="px-3 py-1.5 text-[10px] font-bold font-sans bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                      >
                        ยืนยันบิล (Confirm & ตัดสต็อก)
                      </button>
                    )}
                    {selectedOrder.status !== "Paid" && (
                      <button 
                        onClick={() => handleStatusChange(selectedOrder.id, "Paid")}
                        className="px-3 py-1.5 text-[10px] font-bold font-sans bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        ชำระแล้ว (Paid & ออกใบเสร็จ)
                      </button>
                    )}
                  </div>
                  
                  <div className="ml-auto flex gap-2">
                    <button 
                      onClick={() => { setViewModalOpen(false); onPrint("invoice", selectedOrder.id); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold font-sans border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> พิมพ์ใบกำกับ A4
                    </button>
                    {selectedOrder.status === "Paid" && (
                      <button 
                        onClick={() => { setViewModalOpen(false); onPrint("receipt", selectedOrder.id); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold font-sans border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" /> พิมพ์ใบเสร็จ A5
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Order Wizard Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-semibold text-sm font-sans flex items-center gap-2">
                <ShoppingBag className="w-4.5 h-4.5 text-emerald-500" />
                สร้างใบขายสินค้าบิลใหม่
              </h3>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
              {/* Left Column: Customer & Item Selection */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Customer Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 font-sans uppercase block">เลือกลูกค้าจัดส่ง *</label>
                  <select
                    required
                    value={newOrderCustId}
                    onChange={(e) => {
                      setNewOrderCustId(e.target.value);
                      setCart([]); // Clear cart to re-calc prices matching new group
                    }}
                    className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- กรุณาเลือกข้อมูลลูกค้า (เพื่อดึงราคาที่กำหนด) --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (กลุ่มราคา: ราคา {c.priceGroup} | {c.paymentTerm})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Item Searching */}
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-bold text-gray-500 font-sans uppercase block">ค้นหาและเพิ่มรายการน้ำพริก *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      disabled={!newOrderCustId}
                      placeholder={newOrderCustId ? "ป้อนชื่อสินค้าน้ำพริก หรือ สแกนบาร์โค้ดสินค้า..." : "กรุณาเลือกลูกค้าก่อนจึงจะเพิ่มสินค้าได้"}
                      value={itemSearchText}
                      onChange={(e) => setItemSearchText(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>

                  {/* Suggestion Results */}
                  {searchProductResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-lg mt-1 shadow-lg z-50 divide-y divide-gray-50">
                      {searchProductResults.map(p => {
                        const ratePrice = getProductPriceForSelectedCustomer(p);
                        return (
                          <div 
                            key={p.barcode}
                            onClick={() => handleAddCartItem(p)}
                            className="p-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between text-xs font-sans"
                          >
                            <div>
                              <span className="font-semibold text-gray-800">{p.name}</span>
                              <span className="block text-[9px] text-gray-400 mt-0.5">บาร์โค้ด: {p.barcode} | คลังเหลือ: <span className="font-bold text-emerald-600">{p.stock} {p.unit}</span></span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold font-mono text-emerald-600">฿{ratePrice}</span>
                              <span className="text-[9px] text-gray-400 block font-normal">ราคาตามกลุ่มลูกค้า</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Added Items cart table */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 font-sans block uppercase">รายการสินค้าในบิล</span>
                  <div className="border border-gray-100 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400 font-sans">
                        ยังไม่มีสินค้าในตะกร้าบิลนี้ กรุณาใช้ช่องค้นหาด้านบน
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead className="bg-gray-50 text-gray-400 font-bold text-[10px]">
                          <tr className="border-b border-gray-100">
                            <th className="p-2 px-3">สินค้า</th>
                            <th className="p-2 text-right">ราคาบิล</th>
                            <th className="p-2 text-center" style={{ width: '80px' }}>จำนวน</th>
                            <th className="p-2 text-right">รวม</th>
                            <th className="p-2 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                          {cart.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50/50">
                              <td className="p-2 px-3">
                                <span className="font-semibold text-slate-800">{item.productName}</span>
                                <span className="block text-[9px] text-gray-400 font-mono mt-0.5">บาร์โค้ด: {item.barcode} ({item.unit})</span>
                              </td>
                              <td className="p-2 text-right font-mono">฿{item.price}</td>
                              <td className="p-2 text-center">
                                <input 
                                  type="number"
                                  min="1"
                                  max={item.maxStock}
                                  value={item.quantity}
                                  onChange={(e) => handleCartQtyChange(item.barcode, parseInt(e.target.value) || 1)}
                                  className="w-14 px-1.5 py-0.5 text-center font-mono border border-gray-200 rounded-md"
                                />
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">฿{(item.price * item.quantity).toLocaleString()}</td>
                              <td className="p-2 text-center">
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveCartItem(item.barcode)}
                                  className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Calculations & Bill Options */}
              <div className="lg:col-span-5 bg-slate-50 p-5 rounded-xl border border-gray-100 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-800 font-sans block uppercase border-b border-slate-200 pb-2">สรุปรายการคำนวณและชำระเงิน</span>

                  {/* Discount field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">ส่วนลดท้ายบิล (บาท)</label>
                    <input 
                      type="number" 
                      min="0"
                      max={cartSubtotal}
                      value={newOrderDiscount}
                      onChange={(e) => setNewOrderDiscount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Target State */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">สถานะใบขายเมื่อบันทึก</label>
                    <select 
                      value={newOrderStatus}
                      onChange={(e) => setNewOrderStatus(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Draft">ร่างใบจอง (Draft - ยังไม่ตัดสต็อก)</option>
                      <option value="Confirmed">ยืนยันบิลค้างรับเงิน (Confirmed - ตัดสต็อกทันที)</option>
                      <option value="Paid">ชำระเงินเรียบร้อยแล้ว (Paid - ตัดสต็อก & ออกใบเสร็จ)</option>
                    </select>
                  </div>

                  {/* Cost breakdown */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-200 text-xs font-sans text-gray-600">
                    <div className="flex justify-between">
                      <span>ยอดรวมสินค้า:</span>
                      <span className="font-mono font-medium">฿{cartSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>หัก ส่วนลดบิล:</span>
                      <span className="font-mono font-medium">- ฿{newOrderDiscount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ภาษีมูลค่าเพิ่ม (7% VAT):</span>
                      <span className="font-mono font-medium">฿{cartVat.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-slate-900 pt-3 border-t border-dashed border-slate-300">
                      <span>ยอดสุทธิที่ต้องชำระ:</span>
                      <span className="font-mono text-emerald-600 text-base">฿{cartNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                  <button 
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="w-1/2 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg cursor-pointer font-sans"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit"
                    className="w-1/2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer font-sans"
                  >
                    บันทึกสร้างใบขาย
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
