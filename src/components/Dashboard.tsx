import React, { useEffect, useState } from "react";
import { 
  TrendingUp, Users, Package, AlertCircle, 
  CreditCard, DollarSign, Award, ChevronRight, RefreshCw 
} from "lucide-react";

interface DashboardProps {
  userRole: string;
}

export default function Dashboard({ userRole }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลแดชบอร์ดได้");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-gray-500 font-sans text-sm">กำลังโหลดข้อมูลแดชบอร์ด...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3">
        <AlertCircle className="w-6 h-6 shrink-0 text-rose-600" />
        <div>
          <h4 className="font-semibold text-sm">เกิดข้อผิดพลาด</h4>
          <p className="text-xs">{error || "ข้อมูลผิดพลาด"}</p>
        </div>
      </div>
    );
  }

  const { kpis, dailyChartData, topProducts, paymentSummary } = data;
  const totalPayment = (paymentSummary.cash || 0) + (paymentSummary.transfer || 0) + (paymentSummary.credit || 0);

  // Simple percentage helpers
  const getPercent = (value: number) => {
    if (!totalPayment) return 0;
    return Math.round((value / totalPayment) * 100);
  };

  // SVG Chart calculation variables
  const maxSales = Math.max(...dailyChartData.map((d: any) => d.sales), 1000);
  const chartHeight = 160;
  const chartWidth = 500;
  const padding = 30;

  // Compute points for SVG line chart
  const points = dailyChartData.map((d: any, index: number) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (dailyChartData.length - 1);
    const y = chartHeight - padding - (d.sales * (chartHeight - padding * 2)) / maxSales;
    return { x, y, label: d.date.substring(5), sales: d.sales };
  });

  const pathD = points.reduce((acc: string, p: any, i: number) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  // Area path for gradient fill
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
    : "";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 id="dashboard-title" className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 font-sans">ภาพรวมร้านค้า (Dashboard)</h1>
          <p className="text-[11px] sm:text-xs text-gray-500 font-sans mt-0.5">สรุปตัวเลขสถิติ, ยอดขาย และสถานะสินค้าคงเหลือประจำวัน</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          อัปเดตข้อมูล
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Sales Today */}
        <div id="kpi-sales-today" className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-sans text-gray-400 font-medium">ยอดขายวันนี้</span>
            <div className="text-xl sm:text-2xl font-bold font-sans text-emerald-600">
              ฿{(kpis.salesToday || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Sales This Month */}
        <div id="kpi-sales-month" className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-sans text-gray-400 font-medium">ยอดขายเดือนนี้</span>
            <div className="text-xl sm:text-2xl font-bold font-sans text-gray-900">
              ฿{(kpis.salesMonth || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Products Count */}
        <div id="kpi-products-count" className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-sans text-gray-400 font-medium">จำนวนสินค้าทั้งหมด</span>
            <div className="text-xl sm:text-2xl font-bold font-sans text-gray-900">
              {kpis.totalProducts || 0} <span className="text-xs font-normal text-gray-500">รายการ</span>
            </div>
            {kpis.lowStockProducts > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                <AlertCircle className="w-2.5 h-2.5" /> ต่ำกว่าระดับสต็อก {kpis.lowStockProducts} ชิ้น
              </span>
            )}
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Customers Count */}
        <div id="kpi-customers-count" className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-sans text-gray-400 font-medium">ลูกค้าในระบบ</span>
            <div className="text-xl sm:text-2xl font-bold font-sans text-gray-900">
              {kpis.totalCustomers || 0} <span className="text-xs font-normal text-gray-500">ราย</span>
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Grid for Chart & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Chart */}
        <div id="sales-chart-card" className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 font-sans flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              ยอดขายรายวัน (10 วันล่าสุด)
            </h3>
            <p className="text-xs text-gray-500 font-sans">แสดงข้อมูลบิลที่ยืนยันแล้วและชำระเงินแล้ว</p>
          </div>

          {/* SVG line chart */}
          <div className="relative w-full overflow-hidden">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-auto text-emerald-500"
            >
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#f3f4f6" strokeWidth={1} />
              <line x1={padding} y1={(chartHeight - padding * 2) / 2 + padding} x2={chartWidth - padding} y2={(chartHeight - padding * 2) / 2 + padding} stroke="#f3f4f6" strokeWidth={1} />
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#e5e7eb" strokeWidth={1} />

              {/* Area */}
              {areaD && <path d={areaD} fill="url(#chartGrad)" />}

              {/* Path line */}
              {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}

              {/* Dots & labels */}
              {points.map((p: any, idx: number) => (
                <g key={idx} className="group cursor-pointer">
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={3.5} 
                    className="fill-white stroke-emerald-600 stroke-[2.5px] hover:r-5 hover:stroke-[3.5px] transition-all"
                  />
                  {/* Tooltip on dot */}
                  <text 
                    x={p.x} 
                    y={p.y - 10} 
                    textAnchor="middle" 
                    className="font-mono text-[9px] font-bold fill-emerald-700 hidden group-hover:block bg-white"
                  >
                    ฿{Math.round(p.sales)}
                  </text>
                  
                  {/* Date labels on X-axis */}
                  {idx % 2 === 0 && (
                    <text 
                      x={p.x} 
                      y={chartHeight - 10} 
                      textAnchor="middle" 
                      className="font-sans text-[10px] fill-gray-400"
                    >
                      {p.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Payment breakdown */}
        <div id="payment-summary-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 font-sans flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              สรุปช่องทางการรับเงิน
            </h3>
            <p className="text-xs text-gray-500 font-sans">แยกแยะสัดส่วนรายรับยอดขายจริง</p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Cash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-sans font-medium text-gray-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  เงินสด
                </span>
                <span className="font-mono text-gray-900 font-bold">
                  ฿{(paymentSummary.cash || 0).toLocaleString()} ({getPercent(paymentSummary.cash)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(paymentSummary.cash)}%` }}></div>
              </div>
            </div>

            {/* Transfer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-sans font-medium text-gray-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  โอนเงินผ่านธนาคาร
                </span>
                <span className="font-mono text-gray-900 font-bold">
                  ฿{(paymentSummary.transfer || 0).toLocaleString()} ({getPercent(paymentSummary.transfer)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(paymentSummary.transfer)}%` }}></div>
              </div>
            </div>

            {/* Credit / Receivables */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-sans font-medium text-gray-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  ค้างจ่าย (เครดิตสินค้า)
                </span>
                <span className="font-mono text-gray-900 font-bold">
                  ฿{(paymentSummary.credit || 0).toLocaleString()} ({getPercent(paymentSummary.credit)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(paymentSummary.credit)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Best Sellers & Shop Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Best Selling Products */}
        <div id="top-products-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 font-sans flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-amber-500" />
              สินค้าขายดี 5 อันดับแรก (ตามจำนวนชิ้น)
            </h3>
          </div>

          <div className="divide-y divide-gray-50">
            {topProducts && topProducts.length > 0 ? (
              topProducts.map((p: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="font-sans text-xs font-bold w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 text-gray-700">
                      {idx + 1}
                    </span>
                    <span className="font-sans text-xs text-gray-800 font-medium">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-gray-900">{p.qty.toLocaleString()} ชิ้น</div>
                    <div className="font-mono text-[10px] text-gray-400">฿{p.total.toLocaleString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-gray-400 font-sans">ไม่มีข้อมูลการขายสินค้า</div>
            )}
          </div>
        </div>

        {/* User Role & System Access Info */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden">
          {/* Decorative ambient background */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl"></div>
          
          <div className="space-y-3 relative z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              สถานะการเข้าใช้งาน
            </span>
            <h3 className="text-lg font-bold font-sans">คุณล็อกอินเป็น: {userRole}</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              สิทธิ์การใช้งานของคุณกำหนดให้สามารถเข้าถึงระบบ จัดการคลังสินค้า ออกใบเสนอราคา/ใบขาย และจัดเตรียมระบบพิมพ์ใบเสร็จได้อย่างสมบูรณ์แบบ
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 mt-6 font-mono relative z-10">
            <span>ฐานข้อมูลคลาวด์: เชื่อมต่อ Sheets สำเร็จ</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ระบบทำงานปกติ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
