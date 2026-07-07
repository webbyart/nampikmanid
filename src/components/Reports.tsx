import React, { useEffect, useState } from "react";
import { 
  FileSpreadsheet, Calendar, Search, Download, Printer, 
  RefreshCw, TrendingUp, Users, Package, FileText, Landmark, Wallet, CheckCircle
} from "lucide-react";

interface ReportsProps {
  userRole: string;
}

interface PaymentAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: "Cash" | "Bank";
  bank_name?: string;
  account_number?: string;
  status: "active" | "inactive";
}

interface ReportSummary {
  cashTotal: number;
  cashVat: number;
  cashBeforeVat: number;
  companyBankTotal: number;
  companyBankVat: number;
  companyBankBeforeVat: number;
  enterpriseBankTotal: number;
  enterpriseBankVat: number;
  enterpriseBankBeforeVat: number;
  grandTotal: number;
  grandVat: number;
  grandBeforeVat: number;
}

export default function Reports({ userRole }: ReportsProps) {
  const [reportType, setReportType] = useState<"daily" | "monthly" | "vat" | "tax" | "sales" | "cash_closing" | "customer" | "products">("daily");
  
  // Default to past 30 days
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({
    cashTotal: 0,
    cashVat: 0,
    cashBeforeVat: 0,
    companyBankTotal: 0,
    companyBankVat: 0,
    companyBankBeforeVat: 0,
    enterpriseBankTotal: 0,
    enterpriseBankVat: 0,
    enterpriseBankBeforeVat: 0,
    grandTotal: 0,
    grandVat: 0,
    grandBeforeVat: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Payment Accounts for Filter Dropdown
  const fetchPaymentAccounts = async () => {
    try {
      const res = await fetch("/api/payment-accounts");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPaymentAccounts(data);
        }
      }
    } catch (err) {
      console.error("Error loading payment accounts for filter", err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?type=${reportType}&from=${dateFrom}&to=${dateTo}&payment_account_id=${selectedAccountId}`);
      if (!res.ok) throw new Error("ไม่สามารถโหลดสรุปรายงานยอดขายได้");
      const json = await res.json();
      setReportData(json.data || []);
      setSummary(json.summary || { 
        cashTotal: 0, 
        cashVat: 0,
        cashBeforeVat: 0,
        companyBankTotal: 0, 
        companyBankVat: 0,
        companyBankBeforeVat: 0,
        enterpriseBankTotal: 0, 
        enterpriseBankVat: 0,
        enterpriseBankBeforeVat: 0,
        grandTotal: 0,
        grandVat: 0,
        grandBeforeVat: 0
      });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentAccounts();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, dateFrom, dateTo, selectedAccountId]);

  // Real Export to Excel (CSV format with full Thai compatibility UTF-8 BOM)
  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `รายงานน้ำพริกแม่มานิต-${reportType}-${dateFrom}-to-${dateTo}.csv`;

    if (reportType === "daily" || reportType === "monthly") {
      headers = [
        "วันที่/รอบเดือน", 
        "จำนวนบิลที่ปิด", 
        "ยอดสินค้าดิบ (ก่อนแวต)", 
        "ยอดแวต (7%)", 
        "ยอดสดหน้าร้าน (Cash)", 
        "ยอดโอน บจก. (Company Bank)", 
        "ยอดโอน กิจการ (Enterprise Bank)", 
        "ยอดขายสุทธิรวมทั้งหมด"
      ];
      rows = reportData.map(r => [
        r.date,
        String(r.count),
        String(r.total),
        String(r.vat),
        String(r.cash || 0),
        String(r.compBank || 0),
        String(r.entBank || 0),
        String(r.netTotal)
      ]);
    } else if (reportType === "vat") {
      headers = [
        "เลขที่บิลขาย/ใบกำกับภาษี", 
        "วันที่เอกสาร", 
        "ชื่อผู้ซื้อสินค้า/ลูกค้า", 
        "รหัสบัญชีรับเงินชำระ", 
        "ชื่อบัญชีรับเงินชำระ", 
        "มูลค่าสินค้าทึ่จัดเก็บเงิน (ก่อนแวต)", 
        "ภาษีมูลค่าเพิ่ม (VAT 7%)", 
        "จำนวนเงินรวมรับสุทธิ", 
        "สถานะบิล"
      ];
      rows = reportData.map(r => [
        r.id,
        r.date,
        r.customerName,
        r.account_code,
        r.account_name,
        String(r.total),
        String(r.vat),
        String(r.netTotal),
        r.status
      ]);
    } else if (reportType === "tax") {
      headers = [
        "รหัสบัญชี (Account Code)", 
        "ชื่อประเภทบัญชีชำระเงิน (Classification)", 
        "จำนวนรายการรับเงิน", 
        "มูลค่ายอดขายรวม (ก่อนแวต)", 
        "ยอดภาษีมูลค่าเพิ่มรวม (VAT 7%)", 
        "ยอดเงินสุทธิรวมสะสมในบัญชี"
      ];
      rows = reportData.map(r => [
        r.account_code,
        r.account_name,
        String(r.count),
        String(r.total),
        String(r.vat),
        String(r.netTotal)
      ]);
    } else if (reportType === "sales") {
      headers = [
        "เลขที่ใบขาย (Sales ID)", 
        "วันที่ทำรายการ", 
        "ชื่อลูกค้า", 
        "บัญชีบันทึกรับเงินชำระ", 
        "จำนวนเงินไม่รวมภาษี", 
        "ภาษีมูลค่าเพิ่ม VAT", 
        "สุทธิรวมทั้งสิ้น", 
        "สถานะรายการ", 
        "สถานะการจ่ายชำระ"
      ];
      rows = reportData.map(r => [
        r.id,
        r.date,
        r.customerName,
        r.account_name,
        String(r.total),
        String(r.vat),
        String(r.netTotal),
        r.status,
        r.paymentStatus
      ]);
    } else if (reportType === "cash_closing") {
      headers = [
        "เลขที่ใบขายชำระสด", 
        "วันที่ทำรายการ", 
        "ชื่อลูกค้า", 
        "ยอดรับชำระเงินสด (Cash Closing)", 
        "สถานะบิล"
      ];
      rows = reportData.map(r => [
        r.id,
        r.date,
        r.customerName,
        String(r.cashReceived),
        r.status
      ]);
    } else if (reportType === "customer") {
      headers = ["รหัสลูกค้า", "ชื่อลูกค้า/บริษัท", "จำนวนบิล", "ยอดซื้อไม่รวมแวต", "ยอดซื้อสุทธิสะสม"];
      rows = reportData.map(r => [
        r.customerId,
        r.customerName,
        String(r.count),
        String(r.total),
        String(r.netTotal)
      ]);
    } else if (reportType === "products") {
      headers = ["รหัสบาร์โค้ด", "รหัส SKU", "ชื่อสินค้าพริกแกง", "จำนวนที่ขายได้ (ชิ้น)", "ยอดขายรวมสะสม"];
      rows = reportData.map(r => [
        r.barcode,
        r.sku,
        r.name,
        String(r.qty),
        String(r.total)
      ]);
    }

    // Include summaries at the bottom of the CSV
    rows.push([]);
    rows.push(["--- สรุปยอดแยกตามบัญชีเงินเข้า ---"]);
    rows.push(["1. เงินสดสดหน้าร้าน (Cash Account)", String(summary.cashTotal)]);
    rows.push(["2. บัญชีธนาคาร บจก. (Company Bank Account)", String(summary.companyBankTotal)]);
    rows.push(["3. บัญชีธนาคาร กิจการ (Enterprise Bank Account)", String(summary.enterpriseBankTotal)]);
    rows.push(["รวมยอดรับชำระสุทธิสุทธิทั้งสิ้น (Grand Total)", String(summary.grandTotal)]);

    // Combine headers and rows with UTF-8 BOM for Excel Thai compatibility
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Printable Native PDF Trigger
  const handlePrintReport = () => {
    window.print();
  };

  // Calculable aggregates from table
  const sumBills = reportData.reduce((acc, curr) => acc + (curr.count || curr.qty || (reportType === "vat" || reportType === "sales" || reportType === "cash_closing" ? 1 : 0)), 0);
  const sumNetRevenue = reportData.reduce((acc, curr) => acc + (curr.netTotal || curr.total || curr.cashReceived || 0), 0);

  return (
    <div className="space-y-6 printable-area">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 non-printable">
        <div>
          <h1 id="reports-title" className="text-2xl font-semibold tracking-tight text-gray-900 font-sans">
            รายงานและสถิติดิจิทัล (Sales & Audit Reports)
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-0.5">
            ระบบจัดทำสมุดวิเคราะห์บัญชีและแยกข้อมูลภาษีแยกตามประเภทเงินสด บัญชีธนาคาร บจก. และบัญชีผู้บริหาร
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            ส่งออก Excel (.CSV)
          </button>
          <button 
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงาน / PDF
          </button>
        </div>
      </div>

      {/* Printable page header overlay (only shown when printing) */}
      <div className="hidden printable-only border-b-2 border-slate-900 pb-4 mb-6">
        <h2 className="text-xl font-bold font-sans">รายงานระบบการเงินและบัญชีแยกแยะภาษี - น้ำพริกแม่มานิต</h2>
        <p className="text-xs text-gray-500 font-sans mt-1">
          ประเภทรายงาน: {
            reportType === "daily" ? "รายงานสรุปยอดขายรายวัน" : 
            reportType === "monthly" ? "รายงานสรุปยอดขายรายเดือน" : 
            reportType === "vat" ? "รายงานภาษีมูลค่าเพิ่ม / สมุดภาษีขาย" : 
            reportType === "tax" ? "รายงานสรุปภาษีแยกตามประเภทบัญชีเงินเข้า" : 
            reportType === "sales" ? "รายงานวิเคราะห์รายละเอียดใบสำคัญรับเงิน" : 
            reportType === "cash_closing" ? "รายงานปิดยอดบัญชีเงินสดหน้าร้านประจำวัน" :
            reportType === "customer" ? "ทำเนียบลำดับลูกค้าชั้นดี" : "สถิติสินค้าขายดี"
          }
        </p>
        <p className="text-xs text-gray-500 font-sans">
          ช่วงระยะเวลา: {dateFrom} ถึง {dateTo} | บัญชีรับเงินคัดกรอง: {selectedAccountId === "all" ? "ทั้งหมด" : paymentAccounts.find(a => a.id === selectedAccountId)?.account_name}
        </p>
        <p className="text-xs text-gray-500 font-sans">
          ออกเอกสาร ณ วันที่: {new Date().toLocaleDateString("th-TH")} | สิทธิ์การเข้าถึง: {userRole}
        </p>
      </div>

      {/* Query Filters */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-end non-printable">
        {/* Report Category */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 font-sans uppercase">รูปแบบรายงานวิเคราะห์</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50 font-medium text-slate-800"
          >
            <option value="daily">1. รายงานสรุปยอดขายรายวัน (Daily Report)</option>
            <option value="monthly">2. รายงานสรุปยอดขายรายเดือน (Monthly Report)</option>
            <option value="vat">3. รายงานภาษีมูลค่าเพิ่ม / สมุดภาษีขาย (VAT Report)</option>
            <option value="tax">4. รายงานสรุปภาษีแยกตามบัญชีเงินเข้า (Tax Classification)</option>
            <option value="sales">5. รายงานวิเคราะห์รายละเอียดใบสำคัญรับเงิน (Sales Journal)</option>
            <option value="cash_closing">6. รายงานปิดยอดเงินสดหน้าร้านประจำวัน (Cash Closing)</option>
            <option value="customer">7. รายงานจัดลำดับลูกค้าชั้นดี (Customer Metrics)</option>
            <option value="products">8. รายงานจัดลำดับสินค้าขายดีที่สุด (Product Stats)</option>
          </select>
        </div>

        {/* Date From */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 font-sans uppercase flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" /> จากวันที่
          </label>
          <input 
            type="date" 
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50 text-slate-800 font-medium"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 font-sans uppercase flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" /> ถึงวันที่
          </label>
          <input 
            type="date" 
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50 text-slate-800 font-medium"
          />
        </div>

        {/* Filter by Payment Account */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 font-sans uppercase flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5 text-gray-400" /> บัญชีเงินชำระ (Accounting Classification)
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50 font-medium text-slate-800"
          >
            <option value="all">ทั้งหมด (แสดงผลทุกประเภทเงินเข้า)</option>
            {paymentAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                [{acc.account_code}] {acc.account_name} ({acc.account_type === "Cash" ? "เงินสด" : "โอนผ่านธนาคาร"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AUDIT COMPLIANCE: 3-Account Real-Time Summary Widget Box */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans flex items-center gap-2">
            <Landmark className="w-4 h-4 text-amber-500" />
            สรุปการปิดยอดรับเงินแยกช่องทางจัดหมวดหมู่ภาษี (Accounting Classification Summaries)
          </h3>
          <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">
            ระบบคำนวณภาษีแยกหมวดหมู่อัตโนมัติ (Real-time Automatic Tax Breakdown)
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Cash */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase font-sans">1. บัญชีเงินสดหน้าร้าน (Cash)</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ฿{summary.cashTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card 2: Company Bank Account */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase font-sans">2. บัญชีธนาคาร บจก. (Company Bank)</span>
              <span className="text-base font-bold font-mono text-blue-400">
                ฿{summary.companyBankTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card 3: Enterprise Bank Account */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase font-sans">3. บัญชีธนาคาร กิจการ (Enterprise Bank)</span>
              <span className="text-base font-bold font-mono text-indigo-400">
                ฿{summary.enterpriseBankTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card 4: Grand Total */}
          <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-900/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 font-bold block uppercase font-sans">รวมยอดเก็บรับชำระทั้งหมด (Grand Total)</span>
              <span className="text-lg font-extrabold font-mono text-emerald-300">
                ฿{summary.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Tax Categorization Table (Classified Tax Report) */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">
              ตารางสรุปภาษีแยกหมวดหมู่ช่องทางชำระเงิน (Tax & Revenue Classification Table)
            </h4>
            <span className="text-[10px] text-slate-500 font-sans">
              เฉพาะบิลที่รับชำระแล้ว (Paid Status Only) สำหรับยื่นรายงานภาษีมูลค่าเพิ่ม
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">ประเภทบัญชีรับเงิน</th>
                  <th className="py-2.5 px-3">รหัสผังบัญชี</th>
                  <th className="py-2.5 px-3 text-right">ยอดก่อนภาษี (Tax Base)</th>
                  <th className="py-2.5 px-3 text-right text-amber-400">ภาษีมูลค่าเพิ่ม (VAT 7%)</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400">ยอดเงินรวมรับสุทธิ (Net Total)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50 text-slate-300">
                {/* 1. Cash */}
                <tr className="hover:bg-slate-900/30">
                  <td className="py-3 px-3 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    เงินสดหน้าร้าน (Cash Account)
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">acc-cash</td>
                  <td className="py-3 px-3 text-right font-mono">
                    ฿{summary.cashBeforeVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-400">
                    ฿{summary.cashVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold">
                    ฿{summary.cashTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* 2. Company Bank */}
                <tr className="hover:bg-slate-900/30">
                  <td className="py-3 px-3 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    บัญชีธนาคาร บจก. (Company Bank Account)
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">acc-comp-bank</td>
                  <td className="py-3 px-3 text-right font-mono">
                    ฿{summary.companyBankBeforeVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-400">
                    ฿{summary.companyBankVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-400 font-bold">
                    ฿{summary.companyBankTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* 3. Enterprise Bank */}
                <tr className="hover:bg-slate-900/30">
                  <td className="py-3 px-3 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    บัญชีธนาคาร วิสาหกิจชุมชน (Enterprise Bank Account)
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">acc-ent-bank</td>
                  <td className="py-3 px-3 text-right font-mono">
                    ฿{summary.enterpriseBankBeforeVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-400">
                    ฿{summary.enterpriseBankVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-indigo-400 font-bold">
                    ฿{summary.enterpriseBankTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* 4. Grand Total */}
                <tr className="bg-slate-900/40 font-bold border-t border-slate-800 text-white">
                  <td className="py-3.5 px-3 flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ยอดรับชำระรวมสุทธิทั้งสิ้น (Grand Total)
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-400">-</td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-100">
                    ฿{summary.grandBeforeVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                    ฿{summary.grandVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-400 text-sm font-extrabold">
                    ฿{summary.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main Report Table display */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-gray-400 font-sans">กำลังจัดทำรายงานสถิติและประมวลภาษี...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-sans text-xs">ไม่พบข้อมูลประวัติบันทึกตามช่วงเวลาหรือเงื่อนไขบัญชีดังกล่าว</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  {reportType === "daily" || reportType === "monthly" ? (
                    <>
                      <th className="py-3 px-4">วันที่ / รอบช่วงเดือน</th>
                      <th className="py-3 px-4 text-center">จำนวนบิลธุรกรรม</th>
                      <th className="py-3 px-4 text-right">ยอดสินค้าดิบ (ก่อนแวต)</th>
                      <th className="py-3 px-4 text-right">ภาษีมูลค่าเพิ่ม VAT (7%)</th>
                      <th className="py-3 px-4 text-right">ยอดสดหน้าร้าน (Cash)</th>
                      <th className="py-3 px-4 text-right">โอน บจก. (Company Bank)</th>
                      <th className="py-3 px-4 text-right">โอน กิจการ (Enterprise Bank)</th>
                      <th className="py-3 px-4 text-right text-emerald-700">ยอดรับเงินสุทธิ</th>
                    </>
                  ) : reportType === "vat" ? (
                    <>
                      <th className="py-3 px-4">เลขที่ใบเสร็จ/ใบกำกับ</th>
                      <th className="py-3 px-4">วันที่บิล</th>
                      <th className="py-3 px-4">ชื่อลูกค้าผู้ประกอบการ</th>
                      <th className="py-3 px-4">รหัสบัญชีรับเงิน</th>
                      <th className="py-3 px-4">บัญชีรับชำระ</th>
                      <th className="py-3 px-4 text-right">ยอดสินค้าดิบก่อนแวต</th>
                      <th className="py-3 px-4 text-right">ภาษีแวต VAT 7%</th>
                      <th className="py-3 px-4 text-right font-bold text-slate-800">ยอดเงินรวมสุทธิ</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                    </>
                  ) : reportType === "tax" ? (
                    <>
                      <th className="py-3 px-4">รหัสผังบัญชี (Code)</th>
                      <th className="py-3 px-4">ประเภทบัญชีรับเงิน (Accounting Classification)</th>
                      <th className="py-3 px-4 text-center">จำนวนเอกสารปิดยอด</th>
                      <th className="py-3 px-4 text-right">ยอดขายรวมก่อนแวต</th>
                      <th className="py-3 px-4 text-right text-amber-700">ยอดภาษีมูลค่าเพิ่มสะสม (VAT 7%)</th>
                      <th className="py-3 px-4 text-right text-emerald-700 font-bold">ยอดรับเงินโอนสุทธิสะสม</th>
                    </>
                  ) : reportType === "sales" ? (
                    <>
                      <th className="py-3 px-4">เลขที่ใบสำคัญรับเงิน</th>
                      <th className="py-3 px-4">วันที่เอกสาร</th>
                      <th className="py-3 px-4">ลูกค้า</th>
                      <th className="py-3 px-4">บัญชีชำระเงินหลัก</th>
                      <th className="py-3 px-4 text-right">ยอดสินค้าก่อนแวต</th>
                      <th className="py-3 px-4 text-right">ภาษีมูลค่าเพิ่ม (7%)</th>
                      <th className="py-3 px-4 text-right text-emerald-700 font-bold">จำนวนเงินรวม</th>
                      <th className="py-3 px-4 text-center">สถานะบิล</th>
                      <th className="py-3 px-4 text-center">ชำระเงิน</th>
                    </>
                  ) : reportType === "cash_closing" ? (
                    <>
                      <th className="py-3 px-4">เลขที่ใบขาย</th>
                      <th className="py-3 px-4">วันที่ทำรายการ</th>
                      <th className="py-3 px-4">ลูกค้าผู้มาเยือน</th>
                      <th className="py-3 px-4 text-right text-emerald-600 font-bold">จำนวนเงินสดปิดวัน (Cash In)</th>
                      <th className="py-3 px-4 text-center">สถานะธุรกรรม</th>
                    </>
                  ) : reportType === "customer" ? (
                    <>
                      <th className="py-3 px-4">รหัสลูกค้า</th>
                      <th className="py-3 px-4">ชื่อผู้ประกอบการลูกค้า</th>
                      <th className="py-3 px-4 text-center">จำนวนครั้งที่อุดหนุน (บิล)</th>
                      <th className="py-3 px-4 text-right">มูลค่ารวมก่อนหัก VAT</th>
                      <th className="py-3 px-4 text-right font-bold">ยอดซื้อสะสมสุทธิทั้งหมด</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">รหัสสินค้า / บาร์โค้ด</th>
                      <th className="py-3 px-4">รหัส SKU</th>
                      <th className="py-3 px-4">ชื่อสินค้าพริกแกง</th>
                      <th className="py-3 px-4 text-center">ยอดจัดจำหน่ายได้ (จำนวนชิ้น)</th>
                      <th className="py-3 px-4 text-right">ยอดขายสะสมสุทธิ (บาท)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    {reportType === "daily" || reportType === "monthly" ? (
                      <>
                        <td className="py-4 px-4 font-mono font-bold text-slate-800">{row.date}</td>
                        <td className="py-4 px-4 text-center font-semibold text-gray-600">{row.count} บิล</td>
                        <td className="py-4 px-4 text-right font-mono text-gray-500">฿{row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono text-gray-500">฿{row.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono text-emerald-600">฿{(row.cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono text-blue-600">฿{(row.compBank || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono text-indigo-600">฿{(row.entBank || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/30">฿{row.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </>
                    ) : reportType === "vat" ? (
                      <>
                        <td className="py-4 px-4 font-mono font-bold text-slate-700">{row.id}</td>
                        <td className="py-4 px-4 font-mono text-gray-500">{row.date}</td>
                        <td className="py-4 px-4 font-semibold text-slate-800">{row.customerName}</td>
                        <td className="py-4 px-4 font-mono text-gray-400">{row.account_code}</td>
                        <td className="py-4 px-4 text-gray-600 font-medium">{row.account_name}</td>
                        <td className="py-4 px-4 text-right font-mono text-gray-500">฿{row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono text-amber-600">฿{row.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/30">฿{row.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-150">
                            {row.status}
                          </span>
                        </td>
                      </>
                    ) : reportType === "tax" ? (
                      <>
                        <td className="py-4 px-4 font-mono font-bold text-slate-800">{row.account_code}</td>
                        <td className="py-4 px-4 text-slate-800 font-bold">{row.account_name}</td>
                        <td className="py-4 px-4 text-center font-mono font-semibold text-slate-600">{row.count} ฉบับ</td>
                        <td className="py-4 px-4 text-right font-mono text-gray-500">฿{row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono text-amber-600">฿{row.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600 bg-emerald-50/10">฿{row.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </>
                    ) : reportType === "sales" ? (
                      <>
                        <td className="py-4 px-4 font-mono font-bold text-slate-800">{row.id}</td>
                        <td className="py-4 px-4 font-mono text-gray-500">{row.date}</td>
                        <td className="py-4 px-4 font-semibold text-slate-800">{row.customerName}</td>
                        <td className="py-4 px-4 text-gray-600 font-medium">{row.account_name}</td>
                        <td className="py-4 px-4 text-right font-mono text-gray-400">฿{row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono text-gray-400">฿{row.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">฿{row.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === "Paid" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.paymentStatus === "Paid" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {row.paymentStatus}
                          </span>
                        </td>
                      </>
                    ) : reportType === "cash_closing" ? (
                      <>
                        <td className="py-4 px-4 font-mono font-bold text-slate-800">{row.id}</td>
                        <td className="py-4 px-4 font-mono text-gray-500">{row.date}</td>
                        <td className="py-4 px-4 font-semibold text-slate-800">{row.customerName}</td>
                        <td className="py-4 px-4 text-right font-mono font-extrabold text-emerald-600 bg-emerald-50/20">฿{row.cashReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                            ปิดยอดแล้ว
                          </span>
                        </td>
                      </>
                    ) : reportType === "customer" ? (
                      <>
                        <td className="py-4 px-4 font-mono text-gray-500 font-bold">{row.customerId}</td>
                        <td className="py-4 px-4 font-semibold text-slate-800">{row.customerName}</td>
                        <td className="py-4 px-4 text-center font-semibold text-gray-500">{row.count} ครั้ง</td>
                        <td className="py-4 px-4 text-right font-mono text-gray-500">฿{row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/20">฿{row.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-4 font-mono text-gray-500 font-bold">{row.barcode}</td>
                        <td className="py-4 px-4 font-mono text-gray-400">{row.sku}</td>
                        <td className="py-4 px-4 font-semibold text-slate-800">{row.name}</td>
                        <td className="py-4 px-4 text-center font-bold text-blue-600 font-mono">{row.qty.toLocaleString()} ชิ้น</td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">฿{row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print footer layout for official PDF signatures (hidden in web browser viewport) */}
      <div className="hidden printable-only pt-12 mt-16 border-t border-slate-200 grid grid-cols-2 gap-12 font-sans text-xs">
        <div className="text-center space-y-12">
          <p>ผู้ประมวลและปิดสรุปยอดบัญชี: ___________________________</p>
          <p className="text-gray-400">(เจ้าหน้าที่ตรวจสอบสมุดบัญชีแยกประเภท)</p>
        </div>
        <div className="text-center space-y-12">
          <p>หัวหน้าสำนักงานผู้ตรวจสอบรับรองภาษี: ___________________________</p>
          <p className="text-gray-400">(น้ำพริกแม่มานิต - หัวหน้าส่วนงานการเงิน)</p>
        </div>
      </div>
    </div>
  );
}
