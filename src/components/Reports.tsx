import React, { useEffect, useState } from "react";
import { 
  FileSpreadsheet, Calendar, Search, Download, Printer, 
  RefreshCw, TrendingUp, Users, Package, FileText 
} from "lucide-react";

interface ReportsProps {
  userRole: string;
}

export default function Reports({ userRole }: ReportsProps) {
  const [reportType, setReportType] = useState<"daily" | "monthly" | "customer" | "products">("daily");
  
  // Default to past 30 days
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?type=${reportType}&from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error("ไม่สามารถโหลดสรุปรายงานยอดขายได้");
      const data = await res.json();
      setReportData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, dateFrom, dateTo]);

  // Real Export to Excel (CSV format)
  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `รายงานน้ำพริกแม่มานิต-${reportType}-${dateFrom}-to-${dateTo}.csv`;

    if (reportType === "daily" || reportType === "monthly") {
      headers = ["วันที่/รอบเดือน", "จำนวนบิลที่ปิด", "ยอดมูลค่าดิบ", "ยอดแวต (7%)", "ยอดขายสุทธิทั้งหมด"];
      rows = reportData.map(r => [
        r.date,
        String(r.count),
        String(r.total),
        String(r.vat),
        String(r.netTotal)
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

    // Combine headers and rows with UTF-8 BOM for Excel Thai compatibility
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
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

  // Calculable aggregates
  const sumBills = reportData.reduce((acc, curr) => acc + (curr.count || curr.qty || 0), 0);
  const sumNetRevenue = reportData.reduce((acc, curr) => acc + (curr.netTotal || curr.total || 0), 0);

  return (
    <div className="space-y-6 printable-area">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 non-printable">
        <div>
          <h1 id="reports-title" className="text-2xl font-semibold tracking-tight text-gray-900 font-sans">รายงานและสถิติดิจิทัล (Sales Reports)</h1>
          <p className="text-xs text-gray-500 font-sans mt-0.5">วิเคราะห์เจาะลึกเทรนด์ยอดขาย จัดกลุ่มลูกค้าชั้นนำ และติดตามอัตราการไหลเวียนคลังพริกแกง</p>
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
        <h2 className="text-xl font-bold font-sans">รายงานยอดขายระบบพริกแกง แม่มานิต</h2>
        <p className="text-xs text-gray-500 font-sans mt-1">
          ประเภทรายงาน: {reportType === "daily" ? "รายวัน" : reportType === "monthly" ? "รายเดือน" : reportType === "customer" ? "จำแนกรายลูกค้า" : "สินค้าขายดีอันดับต้น"}
        </p>
        <p className="text-xs text-gray-500 font-sans">
          ช่วงระหว่างวันที่: {dateFrom} ถึง {dateTo} | ออกข้อมูล ณ วันที่: {new Date().toLocaleDateString("th-TH")}
        </p>
      </div>

      {/* Query Filters */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-end non-printable">
        {/* Report Category */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 font-sans uppercase">รูปแบบวิเคราะห์รายงาน</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
          >
            <option value="daily">รายงานสรุปยอดขายรายวัน</option>
            <option value="monthly">รายงานสรุปยอดขายรายเดือน</option>
            <option value="customer">รายงานจัดลำดับลูกค้าชั้นดี</option>
            <option value="products">รายงานจัดลำดับสินค้าขายดีที่สุด</option>
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
            className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
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
            className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
          />
        </div>

        {/* Trigger/Indicator */}
        <button 
          onClick={fetchReport}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer font-sans"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          คำนวณรายงาน
        </button>
      </div>

      {/* Simple totals display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">รวมยอดขายสุทธิของช่วงที่เลือก</span>
            <span className="text-xl font-bold font-sans text-emerald-600">฿{sumNetRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            {reportType === "products" ? <Package className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">
              {reportType === "products" ? "รวมปริมาณจัดจำหน่ายสุทธิ" : "รวมจำนวนเอกสาร / รายบิลที่เกิด"}
            </span>
            <span className="text-xl font-bold font-sans text-slate-800">
              {sumBills.toLocaleString()} {reportType === "products" ? "กระปุก/ถุง" : "ฉบับ"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Report Table display */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-gray-400 font-sans">กำลังสรุปผลข้อมูลสถิติรายงาน...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-sans text-xs">ไม่มีข้อมูลประวัติการค้าสะสมในช่วงวันดังกล่าว</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans min-w-[650px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                {reportType === "daily" || reportType === "monthly" ? (
                  <>
                    <th className="py-3 px-4">วันที่ / รอบช่วงเดือน</th>
                    <th className="py-3 px-4 text-center">จำนวนบิลธุรกรรม</th>
                    <th className="py-3 px-4 text-right">ยอดรวมสินค้าดิบ</th>
                    <th className="py-3 px-4 text-right">ยอดหักภาษีมูลค่าเพิ่ม VAT</th>
                    <th className="py-3 px-4 text-right">ยอดรับเงินสุทธิ</th>
                  </>
                ) : reportType === "customer" ? (
                  <>
                    <th className="py-3 px-4">รหัสลูกค้า</th>
                    <th className="py-3 px-4">ชื่อผู้ประกอบการลูกค้า</th>
                    <th className="py-3 px-4 text-center">จำนวนครั้งที่อุดหนุน (บิล)</th>
                    <th className="py-3 px-4 text-right">มูลค่ารวมก่อนหัก VAT</th>
                    <th className="py-3 px-4 text-right">ยอดซื้อสะสมสุทธิทั้งหมด</th>
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
                      <td className="py-4 px-4 text-right font-mono text-gray-500">฿{row.total.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-mono text-gray-500">฿{row.vat.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">฿{row.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </>
                  ) : reportType === "customer" ? (
                    <>
                      <td className="py-4 px-4 font-mono text-gray-500 font-bold">{row.customerId}</td>
                      <td className="py-4 px-4 font-semibold text-slate-800">{row.customerName}</td>
                      <td className="py-4 px-4 text-center font-semibold text-gray-500">{row.count} ครั้ง</td>
                      <td className="py-4 px-4 text-right font-mono text-gray-500">฿{row.total.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">฿{row.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-4 px-4 font-mono text-gray-500 font-bold">{row.barcode}</td>
                      <td className="py-4 px-4 font-mono text-gray-400">{row.sku}</td>
                      <td className="py-4 px-4 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-4 px-4 text-center font-bold text-blue-600 font-mono">{row.qty.toLocaleString()} ชิ้น</td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">฿{row.total.toLocaleString()}</td>
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
          <p>ผู้จัดทำรายงาน: ___________________________</p>
          <p className="text-gray-400">(เจ้าหน้าที่บัญชี/ผู้ดูแลระบบ)</p>
        </div>
        <div className="text-center space-y-12">
          <p>ผู้มีอำนาจลงนามยืนยัน: ___________________________</p>
          <p className="text-gray-400">(น้ำพริกแม่มานิต - ผู้จัดการทั่วไป)</p>
        </div>
      </div>
    </div>
  );
}
