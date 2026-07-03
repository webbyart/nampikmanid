import React, { useEffect, useState } from "react";
import { X, Printer, Landmark, Sparkles, RefreshCw } from "lucide-react";
import { SalesOrder, SalesDetail } from "../types";

interface PrintDocumentProps {
  docType: "invoice" | "receipt";
  orderId: string;
  onClose: () => void;
}

export default function PrintDocument({ docType, orderId, onClose }: PrintDocumentProps) {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [details, setDetails] = useState<SalesDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBillDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/detail`);
        if (!res.ok) throw new Error("ไม่สามารถเรียกดูรายละเอียดบิลได้");
        const json = await res.json();
        setOrder(json.order);
        setDetails(json.details);
      } catch (err) {
        console.error("Error reading bill details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBillDetail();
  }, [orderId]);

  if (loading || !order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
        <div className="bg-white p-6 rounded-2xl flex items-center gap-3 border border-gray-100 shadow-xl font-sans text-xs font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          กำลังจัดเตรียมเอกสาร...
        </div>
      </div>
    );
  }

  const vatRate = 7;
  const subtotalBeforeVat = order.total - order.discount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 md:p-8 font-sans non-printable-container">
      {/* Outer Floating Card hosting the page layout */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Navigation Action Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 non-printable">
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/25 text-emerald-400 border border-emerald-500/30">
              โหมดแสดงภาพเอกสารพิมพ์
            </span>
            <h3 className="font-bold text-xs">
              {docType === "invoice" ? `ใบกำกับภาษีเต็มรูป (Invoice A4) - เลขที่บิล ${order.id}` : `ใบเสร็จรับเงิน (Receipt A5) - เลขที่ใบเสร็จ`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์เอกสาร / เซฟ PDF
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Core printable content pane */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-gray-50/50 print:bg-white print:p-0">
          
          {docType === "invoice" ? (
            /* A4 INVOICE SHEET TEMPLATE */
            <div className="bg-white border border-gray-200/60 p-10 max-w-[210mm] mx-auto min-h-[297mm] shadow-xs print:shadow-none print:border-none print:p-4 text-gray-800 space-y-8 font-sans">
              
              {/* Logo and Shop Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 bg-emerald-700 rounded-lg text-white font-bold text-lg flex items-center justify-center">ม</span>
                    <span className="text-lg font-black text-gray-900 tracking-tight">น้ำพริกแม่มานิต (เชียงราย)</span>
                  </div>
                  <p className="text-[10px] text-gray-500 max-w-sm leading-relaxed font-semibold">
                    บจก. น้ำพริกแม่มานิต | 123/4 หมู่ 5 ต.รอบเวียง อ.เมือง จ.เชียงราย 57000<br />
                    โทร: 081-234-5678 | เลขผู้เสียภาษี: 0575564001234 (สำนักงานใหญ่)
                  </p>
                </div>
                <div className="text-right space-y-1.5">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">ใบกำกับภาษี / ใบส่งสินค้า</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Original Invoice / Delivery Bill</p>
                  
                  <div className="font-mono text-xs space-y-0.5 text-gray-600">
                    <div>เลขที่บิล: <span className="font-bold text-slate-950">{order.id}</span></div>
                    <div>วันที่เอกสาร: {order.date}</div>
                  </div>
                </div>
              </div>

              {/* Customer and Shipping Details */}
              <div className="grid grid-cols-2 gap-8 border-t border-b border-gray-100 py-5">
                <div className="space-y-1 text-xs">
                  <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">ข้อมูลลูกค้า / ผู้รับจัดส่ง</span>
                  <div className="font-bold text-slate-900 text-xs">{order.customerName}</div>
                  <p className="text-gray-500 font-semibold leading-relaxed text-[11px]">
                    รหัสลูกค้า: {order.customerId}<br />
                    ที่อยู่จัดส่งสินค้าตามที่แจ้งในชีตฐานข้อมูล<br />
                    โทรติดต่อ: ดึงข้อมูลอัตโนมัติ
                  </p>
                </div>
                <div className="space-y-1 text-xs text-right">
                  <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">รายละเอียดจัดส่งและชำระเงิน</span>
                  <p className="text-gray-500 font-semibold leading-relaxed text-[11px]">
                    เงื่อนไขเครดิต: ชำระเงินสด / เครดิตตามกลุ่มราคา<br />
                    สถานะการรับเงิน: <span className="font-bold text-emerald-600">{order.status === "Paid" ? "ชำระเงินเรียบร้อยแล้ว" : "อยู่ระหว่างค้างรับชำระ"}</span><br />
                    พนักงานรับข้อมูลบิล: แอดมินร้านค้าแม่มานิต
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 font-sans text-[10px] font-bold uppercase">
                      <th className="py-2 px-3 text-center" style={{ width: '40px' }}>#</th>
                      <th className="py-2 px-3">บาร์โค้ด</th>
                      <th className="py-2">รายการน้ำพริก / พริกแกงสูตรดั้งเดิม</th>
                      <th className="py-2 text-right" style={{ width: '100px' }}>ราคา/หน่วย</th>
                      <th className="py-2 text-center" style={{ width: '60px' }}>จำนวน</th>
                      <th className="py-2 text-right px-3" style={{ width: '120px' }}>รวมมูลค่า (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                    {details.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/20">
                        <td className="py-2 px-3 text-center text-gray-400 font-bold">{index + 1}</td>
                        <td className="py-2 px-3 font-mono text-[10px] text-gray-400">{item.barcode}</td>
                        <td className="py-2 font-bold text-slate-800">{item.productName}</td>
                        <td className="py-2 text-right font-mono">฿{item.price.toLocaleString()}</td>
                        <td className="py-2 text-center font-mono font-semibold">{item.quantity}</td>
                        <td className="py-2 text-right font-mono font-bold text-slate-900 px-3">฿{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Bottom Panel */}
              <div className="grid grid-cols-12 gap-6 pt-5 border-t border-gray-100">
                {/* Left: QR Code payment guidelines */}
                <div className="col-span-6 space-y-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 flex gap-3.5 items-center">
                    {/* PromptPay Mock QR Code using elegant SVG */}
                    <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg p-1.5 shrink-0 flex items-center justify-center relative">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                        {/* Decorative micro QR blocks */}
                        <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                        <rect x="5" y="5" width="20" height="20" fill="white" />
                        <rect x="10" y="10" width="10" height="10" fill="currentColor" />

                        <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                        <rect x="75" y="5" width="20" height="20" fill="white" />
                        <rect x="80" y="10" width="10" height="10" fill="currentColor" />

                        <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                        <rect x="5" y="75" width="20" height="20" fill="white" />
                        <rect x="10" y="80" width="10" height="10" fill="currentColor" />

                        <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                        <rect x="45" y="45" width="10" height="10" fill="white" />

                        {/* Random tiny filler dots */}
                        <rect x="40" y="10" width="10" height="10" fill="currentColor" />
                        <rect x="55" y="20" width="10" height="10" fill="currentColor" />
                        <rect x="80" y="45" width="10" height="10" fill="currentColor" />
                        <rect x="15" y="45" width="10" height="10" fill="currentColor" />
                        <rect x="45" y="80" width="10" height="10" fill="currentColor" />
                        <rect x="80" y="80" width="10" height="10" fill="currentColor" />
                      </svg>
                    </div>

                    <div className="space-y-0.5 text-[10px]">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Landmark className="w-3.5 h-3.5 text-blue-600" />
                        สแกนชำระผ่าน PromptPay QR
                      </span>
                      <p className="text-gray-500 font-semibold">
                        บัญชี: บจก.น้ำพริกแม่มานิต<br />
                        เบอร์พร้อมเพย์: 081-234-5678<br />
                        *กรุณาตรวจสอบยอดรวม {order.netTotal.toLocaleString()} บาท ก่อนโอน
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Calculations table */}
                <div className="col-span-6 text-xs space-y-2">
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>ยอดรวมมูลค่าสินค้า:</span>
                    <span className="font-mono">฿{order.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 font-medium">
                    <span>หัก ยอดส่วนลดท้ายบิล:</span>
                    <span className="font-mono">- ฿{order.discount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>มูลค่าก่อนคิดภาษี:</span>
                    <span className="font-mono">฿{subtotalBeforeVat.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>ภาษีมูลค่าเพิ่ม ({vatRate}% VAT):</span>
                    <span className="font-mono">฿{order.vat.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-gray-900 pt-2 border-t border-dashed border-gray-200">
                    <span>ยอดรวมสุทธิที่ต้องชำระ:</span>
                    <span className="font-mono text-emerald-700">฿{order.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Signatures Panel */}
              <div className="pt-12 grid grid-cols-2 gap-10 text-xs text-center font-sans">
                <div className="space-y-10">
                  <div className="border-b border-gray-300 mx-6 pb-2"></div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">ผู้รับสินค้า / บันทึกส่งมอบ</p>
                </div>
                <div className="space-y-10">
                  <div className="border-b border-gray-300 mx-6 pb-2 text-center text-emerald-600 font-serif italic text-sm font-semibold">
                    Manit S.
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">ผู้ส่งมอบ / ผู้รับเงินปลายทาง (น้ำพริกแม่มานิต)</p>
                </div>
              </div>

            </div>
          ) : (
            /* A5 RECEIPT SHEET TEMPLATE */
            <div className="bg-white border border-gray-200/60 p-8 max-w-[148mm] mx-auto min-h-[210mm] shadow-xs print:shadow-none print:border-none print:p-2 text-gray-800 space-y-6 font-sans">
              
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-4 border-b border-gray-100">
                <div className="w-8 h-8 bg-emerald-700 rounded-lg text-white font-bold text-base flex items-center justify-center mx-auto mb-1">ม</div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight uppercase">ใบเสร็จรับเงิน (Official Receipt)</h1>
                <p className="text-[10px] text-gray-500">
                  น้ำพริกแม่มานิต | 123/4 หมู่ 5 ต.รอบเวียง อ.เมือง จ.เชียงราย 57000<br />
                  โทร: 081-234-5678
                </p>
              </div>

              {/* Receipt Metadata details */}
              <div className="text-xs space-y-1.5 font-medium text-gray-600">
                <div className="flex justify-between">
                  <span>เลขที่ใบเสร็จ: <span className="font-bold text-slate-900">RCP-{order.id.replace("INV-", "")}</span></span>
                  <span>วันที่รับชำระ: {order.date}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span>อ้างอิงเลขที่บิล: <span className="font-mono text-gray-400">{order.id}</span></span>
                  <span>ชื่อผู้จ่ายเงิน: <span className="font-bold text-slate-900">{order.customerName}</span></span>
                </div>
              </div>

              {/* Simple Receipt item list */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 block uppercase">รายละเอียดรับชำระยอด</span>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>ยอดรวมค่าสินค้าและพริกแกงสะสม:</span>
                    <span className="font-mono">฿{order.total.toLocaleString()}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>หัก ยอดส่วนลดพิเศษ:</span>
                      <span className="font-mono">- ฿{order.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500 border-b border-gray-200/50 pb-2">
                    <span>ภาษีมูลค่าเพิ่ม (7% VAT):</span>
                    <span className="font-mono">฿{order.vat.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between font-bold text-slate-950 text-sm pt-1">
                    <span>ยอดรวมรับเงินสุทธิ (Net Total):</span>
                    <span className="font-mono text-emerald-700">฿{order.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Verified Stamp and Signature */}
              <div className="pt-6 text-center space-y-4">
                <div className="inline-flex flex-col items-center justify-center p-2 rounded-full border border-emerald-200/80 bg-emerald-50/50 text-[9px] font-bold text-emerald-700 uppercase tracking-widest font-mono">
                  <Sparkles className="w-4 h-4 text-emerald-600 mb-0.5" />
                  ชำระเงินแล้ว / PAID
                </div>
                
                <div className="text-[10px] space-y-1 text-gray-400 font-bold uppercase tracking-wider">
                  <div className="text-emerald-700 font-serif italic text-xs font-semibold">Manit S.</div>
                  <p>พนักงานรับชำระ (น้ำพริกแม่มานิต เชียงราย)</p>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
