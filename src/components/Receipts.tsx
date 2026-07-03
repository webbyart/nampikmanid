import React, { useEffect, useState } from "react";
import { 
  Receipt as ReceiptIcon, Search, PlusCircle, CheckCircle, 
  RefreshCw, DollarSign, Calendar, Landmark, CreditCard, X 
} from "lucide-react";
import { Receipt, SalesOrder } from "../types";

interface ReceiptsProps {
  userRole: string;
}

export default function Receipts({ userRole }: ReceiptsProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("โอนเงินผ่านธนาคาร");
  const [paymentAccount, setPaymentAccount] = useState("กสิกรไทย (ออมทรัพย์)");

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, ordRes] = await Promise.all([
        fetch("/api/receipts"),
        fetch("/api/orders")
      ]);

      if (!recRes.ok || !ordRes.ok) throw new Error("เกิดข้อผิดพลาดในการโหลดข้อมูลคลังใบเสร็จ");

      const [recData, ordData] = await Promise.all([
        recRes.json(),
        ordRes.json()
      ]);

      setReceipts(recData);
      
      // Unpaid invoices are Draft or Confirmed orders
      const unpaid = ordData.filter((o: SalesOrder) => o.status !== "Paid");
      setUnpaidOrders(unpaid);
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

  const handleOpenCreateModal = () => {
    if (userRole === "Viewer") {
      showToast("error", "คุณไม่มีสิทธิ์ในการออกใบเสร็จ");
      return;
    }
    if (unpaidOrders.length === 0) {
      showToast("error", "ไม่มีใบขายสินค้าค้างชำระในระบบขณะนี้");
      return;
    }
    setSelectedOrderId("");
    setPaymentMethod("โอนเงินผ่านธนาคาร");
    setPaymentAccount("กสิกรไทย (ออมทรัพย์)");
    setIsModalOpen(true);
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === "Viewer") return;
    if (!selectedOrderId) {
      showToast("error", "กรุณาเลือกบิลใบขายสินค้าค้างชำระ");
      return;
    }

    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": "admin"
        },
        body: JSON.stringify({
          orderId: selectedOrderId,
          method: paymentMethod,
          account: paymentAccount
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "การออกใบเสร็จค้างชำระล้มเหลว");

      showToast("success", `รับชำระเงินบิลสำเร็จ! ใบเสร็จเลขที่ ${data.receipt.id}`);
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const filteredReceipts = receipts.filter(r => 
    r.id.toLowerCase().includes(search.toLowerCase()) || 
    r.orderId.toLowerCase().includes(search.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="receipts-title" className="text-2xl font-semibold tracking-tight text-gray-900 font-sans">คลังใบเสร็จรับเงิน (Receipts)</h1>
          <p className="text-xs text-gray-500 font-sans mt-0.5">ตรวจสอบประวัติใบเสร็จ และรับเงินสำหรับบิลใบขายที่มีสถานะรอรับเงิน</p>
        </div>
        {userRole !== "Viewer" && (
          <button 
            id="create-receipt-btn"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            ออกใบเสร็จรับเงินใหม่
          </button>
        )}
      </div>

      {/* Filter and Control */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="ค้นหาตามเลขที่ใบเสร็จ หรือเลขที่บิลอ้างอิง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
          />
        </div>
        <div className="text-xs font-sans text-gray-400 font-medium ml-auto">
          แสดงทั้งหมด {filteredReceipts.length} รายการ
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-gray-400 font-sans">กำลังดาวน์โหลดประวัติใบเสร็จ...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-sans text-xs">{error}</div>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-sans text-xs">ไม่พบข้อมูลประวัติการออกใบเสร็จ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-sans text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">เลขที่ใบเสร็จ</th>
                  <th className="py-3.5 px-4">เลขที่บิลอ้างอิง</th>
                  <th className="py-3.5 px-4">วันที่ได้รับเงิน</th>
                  <th className="py-3.5 px-4 text-right">จำนวนเงินที่ได้รับ</th>
                  <th className="py-3.5 px-4 text-center">ช่องทางรับเงิน</th>
                  <th className="py-3.5 px-4">บัญชีที่ลงบันทึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans text-xs text-gray-700">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs font-bold text-emerald-700">{r.id}</td>
                    <td className="py-4 px-4 font-mono text-gray-500">{r.orderId}</td>
                    <td className="py-4 px-4 font-medium text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {r.date}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-gray-900">฿{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        r.method.includes("เงินสด") 
                          ? "bg-amber-50 text-amber-700 border border-amber-100" 
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {r.method.includes("เงินสด") ? <CreditCard className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                        {r.method}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-600">{r.account}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Receipt Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-semibold text-sm font-sans flex items-center gap-2">
                <ReceiptIcon className="w-4 h-4 text-emerald-500" />
                ออกใบเสร็จรับเงินใหม่
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="p-6 space-y-4 flex-1">
              {/* Select Unpaid Order */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">เลือกบิลค้างชำระ *</label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- กรุณาเลือกเลขที่บิลที่พร้อมชำระ --</option>
                  {unpaidOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.id} - {o.customerName} (ยอดสุทธิ: ฿{o.netTotal.toLocaleString()} | สถานะ: {o.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">ช่องทางการชำระเงิน</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="โอนเงินผ่านธนาคาร">โอนเงินผ่านธนาคาร</option>
                  <option value="เงินสด">เงินสด</option>
                  <option value="บัตรเครดิต">บัตรเครดิต</option>
                  <option value="สแกน QR พร้อมเพย์">สแกน QR พร้อมเพย์</option>
                </select>
              </div>

              {/* Financial Account */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">บันทึกเข้าบัญชี / ลิ้นชักเก็บเงิน</label>
                <select
                  value={paymentAccount}
                  onChange={(e) => setPaymentAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="กสิกรไทย (ออมทรัพย์)">กสิกรไทย (ออมทรัพย์) - บจก.น้ำพริกแม่มานิต</option>
                  <option value="ไทยพาณิชย์ (กระแสรายวัน)">ไทยพาณิชย์ (กระแสรายวัน) - โรงงานเชียงราย</option>
                  <option value="ลิ้นชักเงินสดหน้าร้าน">ลิ้นชักเงินสด ณ จุดขาย (แคชเชียร์ 1)</option>
                </select>
              </div>

              {/* Confirmation disclaimer */}
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex items-start gap-2 text-[10px] text-emerald-800 font-sans">
                <Landmark className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  การกดยืนยันจะปรับปรุงสถานะบิลอ้างอิงเป็น **Paid (ชำระเงินแล้ว)** และออกเลขใบเสร็จพร้อมลงบันทึกใน Audit Trail อัตโนมัติ หากสถานะเดิมคือ Draft คลังสินค้าจะถูกตัดตามจำนวนจริงทันที
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 font-sans cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm font-sans cursor-pointer"
                >
                  บันทึกรับเงิน & ออกใบเสร็จ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
