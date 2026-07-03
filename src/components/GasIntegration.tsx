import React, { useEffect, useState } from "react";
import { 
  Database, Copy, Check, Terminal, ExternalLink, 
  HelpCircle, Settings, ShieldAlert, CheckCircle, RefreshCw,
  FileSpreadsheet, LayoutDashboard, BookOpen, TableProperties, ArrowRight
} from "lucide-react";

interface GasIntegrationProps {
  gasUrl: string;
  setGasUrl: (url: string) => void;
  gasMode: boolean;
  setGasMode: (mode: boolean) => void;
}

export default function GasIntegration({ gasUrl, setGasUrl, gasMode, setGasMode }: GasIntegrationProps) {
  const [gasCode, setGasCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"script" | "blueprints">("script");
  const [activeSheetTab, setActiveSheetTab] = useState<"customer" | "product" | "order" | "detail" | "dashboard">("customer");
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  useEffect(() => {
    const fetchGasCode = async () => {
      try {
        const res = await fetch("/api/gas-code");
        const json = await res.json();
        setGasCode(json.code);
      } catch (err) {
        console.error("Error loading GAS script code:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGasCode();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(gasCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFormula = (formula: string, key: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedFormula(key);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  // Blueprints Data Definitions
  const sheetBlueprints = {
    customer: {
      title: "02_CUSTOMER (ชีตลูกค้าน้ำพริกแม่มานิต)",
      desc: "รวบรวมพจนานุกรมประวัติลูกค้าพริกแกง จัดเกรดระดับราคาและวงเงินชำระสินค้า",
      columns: [
        { name: "id", desc: "รหัสลูกค้า (เช่น CUST-001)" },
        { name: "name", desc: "ชื่อลูกค้าร้านค้า/บริษัทส่งพริกแกง" },
        { name: "type", desc: "ประเภทลูกค้า (เช่น ค้าส่ง, ค้าปลีก, ตัวแทน)" },
        { name: "priceGroup", desc: "เกรดราคาขาย (PriceA / PriceB / PriceC)" },
        { name: "paymentTerm", desc: "เงื่อนไขเครดิตชำระ (เช่น รับสดหน้าร้าน, เครดิต 30 วัน)" },
        { name: "address", desc: "ที่อยู่ออกบิลและจัดส่งพริกแกง" },
        { name: "phone", desc: "เบอร์โทรติดต่อหลัก" },
        { name: "email", desc: "ที่อยู่อีเมลอิเล็กทรอนิกส์" },
        { name: "status", desc: "สถานะการติดต่อ (ใช้งาน / ระงับ)" },
        { name: "createdAt", desc: "วันที่เริ่มบันทึกประวัติ" },
        { name: "updatedAt", desc: "วันที่ปรับปรุงประวัติล่าสุด" }
      ],
      formulas: [
        {
          target: "ยอดซื้อสะสมทั้งหมด (Lifetime Purchases)",
          formula: `=SUMIFS('04_SALES_ORDER'!H:H, '04_SALES_ORDER'!C:C, A2, '04_SALES_ORDER'!I:I, "<>Draft")`,
          desc: "คำนวณหาปริมาณเม็ดเงินรวมสุทธิที่ลูกค้าซื้อน้ำพริก โดยข้ามบิลที่เป็นสถานะ Draft เสมอเพื่อให้ข้อมูลการเงินแม่นยำ"
        },
        {
          target: "จำนวนบิลที่เปิดสะสม (Total Invoice Count)",
          formula: `=COUNTIFS('04_SALES_ORDER'!C:C, A2, '04_SALES_ORDER'!I:I, "<>Draft")`,
          desc: "คำนวณความถี่ในการสั่งซื้อนับเป็นจำนวนบิล"
        }
      ]
    },
    product: {
      title: "03_PRODUCT (ชีตคลังสินค้าพริกแกงและน้ำพริก)",
      desc: "ระบบบริหารระดับสต็อกวัตถุดิบและราคาส่งน้ำพริกแต่ละขนาดบรรจุ",
      columns: [
        { name: "barcode", desc: "รหัสแท่งบาร์โค้ดสากลประจำขนาดสินค้า" },
        { name: "sku", desc: "รหัสจำแนกตระกูลพริกแกง (Stock Keeping Unit)" },
        { name: "name", desc: "ชื่อสูตรพริกแกงและน้ำพริก (เช่น พริกแกงเผ็ดแม่มานิต 500g)" },
        { name: "unit", desc: "หน่วยนับสินค้า (เช่น ถุง, กระปุก, กิโลกรัม)" },
        { name: "priceA", desc: "ราคากลุ่ม A (เกรดดีลเลอร์ใหญ่)" },
        { name: "priceB", desc: "ราคากลุ่ม B (เกรดร้านค้าย่อย)" },
        { name: "priceC", desc: "ราคากลุ่ม C (ราคาปลีกหน้าร้านทั่วไป)" },
        { name: "cost", desc: "ต้นทุนวัตถุดิบและค่าแรงผลิตรวมบรรจุภัณฑ์" },
        { name: "stock", desc: "จำนวนหน่วยสต็อกคงเหลือพร้อมตักส่ง" },
        { name: "minStock", desc: "จุดปลอดภัยขั้นต่ำในคลัง (Safety Stock Threshold)" },
        { name: "status", desc: "สถานะการขาย (ใช้งาน / ระงับการจำหน่าย)" }
      ],
      formulas: [
        {
          target: "สถานะเตือนเติมสต็อก (Inventory Status Alert)",
          formula: `=IF(I2 <= J2, "⚠️ สต็อกต่ำกว่าเกณฑ์! (สั่งผลิตด่วน)", "✅ สต็อกปลอดภัย")`,
          desc: "สูตรตรวจสอบอัตโนมัติเมื่อปริมาณสต็อก (คอลัมน์ I) ต่ำกว่าเกณฑ์ความปลอดภัยสต็อกขั้นต่ำ (คอลัมน์ J) จะแสดงสัญญาณแจ้งเตือนฝ่ายผลิตทันที"
        },
        {
          target: "มูลค่าคลังพริกแกงรวมตามทุน (Total Stock Inventory Asset)",
          formula: `=H2 * I2`,
          desc: "รวมมูลค่าสินทรัพย์คลังสินค้าทั้งหมดของตัวผลิตภัณฑ์นี้ตามมูลค่าต้นทุนการผลิตจริง"
        }
      ]
    },
    order: {
      title: "04_SALES_ORDER (ชีตหัวบิลประวัติใบสั่งขาย)",
      desc: "รวมประวัติและสรุปทางการเงินของทุกบิลใบส่งของ/ใบกำกับภาษี",
      columns: [
        { name: "id", desc: "เลขที่บิลใบขายระบบดิจิทัล (เช่น INV-YYMMDD-XXX)" },
        { name: "date", desc: "วันที่สั่งบิล" },
        { name: "customerId", desc: "รหัสลูกค้าผู้สั่งซื้อ" },
        { name: "customerName", desc: "ชื่อลูกค้าผู้สั่งซื้อ (ใช้สูตรดึงอัตโนมัติ)" },
        { name: "total", desc: "ยอดรวมยอดหักตามกลุ่มราคา (ใช้สูตรรวมอัตโนมัติ)" },
        { name: "discount", desc: "ส่วนลดพิเศษท้ายบิล" },
        { name: "vat", desc: "ภาษีมูลค่าเพิ่ม (ใช้สูตรคำนวณอัตโนมัติ)" },
        { name: "netTotal", desc: "ยอดสุทธิท้ายบิล (ใช้สูตรคำนวณสุทธิ)" },
        { name: "status", desc: "สถานะการยืนยันบิล (Draft / Confirmed / Paid)" },
        { name: "paymentStatus", desc: "สถานะการเงินบิลนี้ (Paid / Unpaid)" }
      ],
      formulas: [
        {
          target: "ดึงชื่อลูกค้าจากรหัสอัตโนมัติ (Customer VLOOKUP)",
          formula: `=IFERROR(VLOOKUP(C2, '02_CUSTOMER'!A:B, 2, FALSE), "ไม่พบชื่อลูกค้า")`,
          desc: "ป้องกันข้อผิดพลาดในการป้อนชื่อลูกค้าซ้ำซ้อน โดยการดึงชื่อลูกค้าจากชีตลูกค้าด้วยรหัสอัตโนมัติ"
        },
        {
          target: "สูตรรวมยอดรวมสินค้ารายบิล (Auto Gross Total)",
          formula: `=SUMIFS('05_SALES_DETAIL'!F:F, '05_SALES_DETAIL'!A:A, A2)`,
          desc: "เชื่อมโยงกับชีตรายละเอียดรายการ โดยสรุปยอดรวมมูลค่าสินค้ารวมทั้งหมดที่มีเลขที่บิลเดียวกันให้แบบเรียลไทม์"
        },
        {
          target: "สูตรคำนวณแวตภาษี 7% (Auto VAT 7%)",
          formula: `=ROUND((E2 - F2) * 0.07, 2)`,
          desc: "นำยอดรวมสุทธิหลังหักส่วนลด (คอลัมน์ E ลบ คอลัมน์ F) มาคำนวณเป็นยอดภาษีมูลค่าเพิ่ม 7%"
        },
        {
          target: "สูตรคำนวณยอดเงินสุทธิสุดท้าย (Net Total Formula)",
          formula: `=E2 - F2 + G2`,
          desc: "สมการคำนวณรวม: ยอดก่อนแวต - ส่วนลดท้ายบิล + ยอดแวต 7% ออกมาเป็นยอดชำระจริง"
        }
      ]
    },
    detail: {
      title: "05_SALES_DETAIL (ชีตรายละเอียดไอเทมในใบสั่งขาย)",
      desc: "รายการสินค้าแยกย่อยแต่ละบรรทัดที่แนบกับหัวบิลหลัก",
      columns: [
        { name: "orderId", desc: "เลขที่บิลอ้างอิงเชื่อมกับหัวบิลหลัก" },
        { name: "barcode", desc: "รหัสบาร์โค้ดตัวพริกแกงที่ซื้อ" },
        { name: "productName", desc: "ชื่อพริกแกง (ใช้สูตรดึงอัตโนมัติ)" },
        { name: "price", desc: "ราคาขายจริง ณ เกรดลูกค้านั้นๆ" },
        { name: "quantity", desc: "ปริมาณที่สั่งซื้อ (ชิ้น/ถุง)" },
        { name: "total", desc: "ยอดรวมบรรทัดนั้น (ใช้สูตรคำนวณ)" }
      ],
      formulas: [
        {
          target: "ดึงชื่อสินค้าอัตโนมัติจาก บาร์โค้ด (Product Name VLOOKUP)",
          formula: `=IFERROR(VLOOKUP(B2, '03_PRODUCT'!A:C, 3, FALSE), "ไม่พบข้อมูลสินค้า")`,
          desc: "ดึงชื่อสูตรพริกแกงและน้ำพริกจากคลังสินค้าอัตโนมัติทันทีที่มีการหยิบสินค้าหรือสแกนบาร์โค้ด"
        },
        {
          target: "คำนวณราคาสินค้าแยกตามกลุ่มเกรดลูกค้า (Dynamic Customer Grade Pricing)",
          formula: `=IFERROR(VLOOKUP(B2, '03_PRODUCT'!A:H, MATCH(VLOOKUP(IFERROR(VLOOKUP(A2, '04_SALES_ORDER'!A:C, 3, FALSE), ""), '02_CUSTOMER'!A:D, 4, FALSE), '03_PRODUCT'!$A$1:$H$1, 0), FALSE), 0)`,
          desc: "สูตรประมวลผลขั้นสูง! ทำการเช็คว่าบิลหลักของรายการนี้สั่งโดยใคร มีเกรดลูกค้าระดับไหน (PriceA / PriceB / PriceC) และดึงช่องราคาที่ถูกต้องของสินค้านั้นมาใส่ให้ทันทีเพื่อป้องกันพนักงานขายป้อนราคาผิดพลาด"
        },
        {
          target: "คำนวณยอดรวมของแต่ละบรรทัดสินค้า (Line Item Total)",
          formula: `=D2 * E2`,
          desc: "สูตรคูณราคาขาย (D) ด้วยจำนวนที่สั่งซื้อ (E)"
        }
      ]
    },
    dashboard: {
      title: "SUMMARY DASHBOARD (ตารางแสดงแดชบอร์ดสรุปยอดขายอัตโนมัติ)",
      desc: "ตารางสรุปผลบริหารงานน้ำพริกแม่มานิตเพื่อเป็นเข็มทิศผู้บริหาร",
      columns: [
        { name: "ตัววัดประสิทธิภาพ (KPIs)", desc: "คำจำกัดความเป้าหมาย" },
        { name: "สูตร Google Sheets แนะนำ", desc: "ตัวคำนวณลอจิกสรุปยอด" },
        { name: "ประโยชน์การใช้งาน", desc: "ผลวิเคราะห์ความปลอดภัย" }
      ],
      formulas: [
        {
          target: "ยอดขายสะสมรวมตระกูลพริกแกงทั้งหมด (Total Revenue Sheet Sum)",
          formula: `=SUMIFS('04_SALES_ORDER'!H:H, '04_SALES_ORDER'!I:I, "<>Draft")`,
          desc: "รวมรายรับจริงจากบิลที่คอนเฟิร์มและบิลที่ชำระแล้วทั้งหมดบนสเปรดชีต"
        },
        {
          target: "ยอดขายสดใหม่วันนี้ (Today's Sales Gross)",
          formula: `=SUMIFS('04_SALES_ORDER'!H:H, '04_SALES_ORDER'!B:B, TODAY(), '04_SALES_ORDER'!I:I, "<>Draft")`,
          desc: "ประเมินสภาพคล่องการขายพริกแกงประจำวันเทียบเกณฑ์รายวันอัตโนมัติ"
        },
        {
          target: "จำนวนลูกค้าประจำที่แอคทีฟ (Active Customers Count)",
          formula: `=COUNTIFS('02_CUSTOMER'!I:I, "ใช้งาน")`,
          desc: "นับจำนวนลูกค้าร้านค้าส่งน้ำพริกที่เปิดรหัสการสั่งซื้อสม่ำเสมอ"
        },
        {
          target: "จำนวนสินค้ากลุ่มพริกแกงที่เหลือน้อยมาก (Critically Low Stock Count)",
          formula: `=COUNTIF('03_PRODUCT'!I:I, "<"&'03_PRODUCT'!J:J)`,
          desc: "สูตรคำนวณนับจำจำนวรายการสินค้าทั้งหมดที่มีปริมาณเหลือต่ำกว่าปริมาณขั้นต่ำ เพื่อสรุปยอดผลิตเร่งด่วน"
        }
      ]
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header with brand palette */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 id="gas-title" className="text-2xl font-semibold tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Database className="w-6 h-6" />
            </span>
            ฐานข้อมูลสารสนเทศ Google Sheets (น้ำพริกแม่มานิต)
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-1">
            เชื่อมต่อหน้ากากผู้ใช้ (React Web App) เข้ากับตู้เก็บข้อมูลเมฆของท่านอย่างไร้รอยต่อ และจัดการสูตรชีตให้อัปเดตอัตโนมัติ
          </p>
        </div>

        {/* Global Nav Tabs */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start md:self-center font-sans">
          <button
            onClick={() => setActiveTab("script")}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === "script" 
                ? "bg-white text-emerald-800 shadow-xs font-bold" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            1. สคริปต์เชื่อมต่อ (Apps Script)
          </button>
          <button
            onClick={() => setActiveTab("blueprints")}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === "blueprints" 
                ? "bg-white text-emerald-800 shadow-xs font-bold" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            2. โครงสร้างและสูตรอัตโนมัติ
          </button>
        </div>
      </div>

      {/* Mode Selector Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-sans">
            การปรับตั้งค่าระบบฐานข้อมูล (Database Mode)
          </span>
          <h3 className="text-sm font-bold text-gray-900 font-sans">เลือกเซิร์ฟเวอร์ฐานข้อมูลในการประมวลผล</h3>
          <p className="text-xs text-gray-500 font-sans leading-relaxed">
            ท่านสามารถทำงานในโหมด **"สาธิตจำลอง (Local Emulation)"** ซึ่งเหมาะสำหรับการใช้งานทันทีโดยไม่ต้องตั้งค่าใดๆ หรือเปลี่ยนเป็นโหมด **"Google Sheets ตัวจริง"** เพื่อเชื่อมต่อโครงสร้างสเปรดชีตของท่านแบบเรียลไทม์สมบูรณ์แบบ
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-gray-200/60 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 font-sans">สถานะโหมดปัจจุบัน:</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
              gasMode ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}>
              {gasMode ? "Google Sheets LIVE" : "สาธิต (Local Mode)"}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setGasMode(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer transition-all ${
                !gasMode 
                  ? "bg-slate-800 text-white shadow-xs" 
                  : "bg-white text-slate-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              โหมดสาธิต
            </button>
            <button
              onClick={() => {
                if (!gasUrl) {
                  alert("กรุณาป้อนที่อยู่ Web App URL ที่สร้างจาก Google Apps Script ด้านล่างก่อนปรับเปลี่ยนโหมด");
                  return;
                }
                setGasMode(true);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer transition-all ${
                gasMode 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "bg-white text-slate-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              ต่อ Sheets จริง
            </button>
          </div>
        </div>
      </div>

      {/* Target Setting Input */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 font-sans flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-emerald-600" />
            ระบุทางเชื่อมต่อ Google Apps Script Web App (GAS Endpoint URL)
          </h3>
          <p className="text-xs text-slate-500 font-sans">เมื่อนำชุดสคริปต์ไป Deploy บน Google Sheets แล้ว ให้นำ URL ที่ขึ้นต้นด้วย script.google.com มาแปะระบุไว้ที่นี่</p>
        </div>

        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="https://script.google.com/macros/s/XXXXXX/exec"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            className="w-full px-4 py-2.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-gray-50/30"
          />

          {gasUrl && (
            <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-start gap-2 text-xs text-emerald-800 font-sans">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">ทางเชื่อมโยงเปิดใช้งานสำเร็จ</span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">ระบบจะเริ่มเหนี่ยวนำคำสั่งแก้ไขและเก็บบันทึกประวัติต่างๆ ส่งตรงไปบันทึกลงในสเปรดชีตจริงบนคลาวด์โดยทันที</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "script" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step List */}
          <div className="lg:col-span-1 bg-slate-900 text-white p-6 rounded-2xl shadow-xs space-y-5">
            <h3 className="text-sm font-bold font-sans flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <Terminal className="w-4 h-4 text-emerald-500" />
              ขั้นตอนการติดตั้งใน 5 นาที
            </h3>

            <div className="space-y-4 font-sans text-xs">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-400 font-mono text-[10px]">1</span>
                <div>
                  <span className="font-bold block">สร้าง Google Spreadsheet เปล่า</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">เปิดเบราว์เซอร์แล้วเข้าเว็บ sheets.new เพื่อเปิดสมุดบัญชีใหม่บนบัญชีของท่าน</span>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-400 font-mono text-[10px]">2</span>
                <div>
                  <span className="font-bold block">ระบบจะสร้างแผ่นงาน 10 ชีตให้เอง!</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">ไม่ต้องพึ่งการป้อนชีตเปล่า สคริปต์อัจฉริยะจะสแกนและติดตั้งตารางพร้อมหัวสีแดงพริกสุกสไตล์แม่มานิตให้แบบอัตโนมัติในการรันครั้งแรก</span>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-400 font-mono text-[10px]">3</span>
                <div>
                  <span className="font-bold block">เปิด Apps Script Editor</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">คลิกเมนูหลัก "ส่วนขยาย" (Extensions) ด้านบน -&gt; เลือก "Apps Script" เพื่อเปิดส่วนจัดการเขียนคำสั่งของ Google</span>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-400 font-mono text-[10px]">4</span>
                <div>
                  <span className="font-bold block">ก๊อปปี้และบันทึกสคริปต์</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">คลิกปุ่มสีแดงคัดลอกด้านขวาวางลงในไฟล์ Code.gs ทั้งหมดแทนที่ของเดิมแล้วกดรูปบันทึกแผ่นดิสก์</span>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-400 font-mono text-[10px]">5</span>
                <div>
                  <span className="font-bold block">Deploy เป็น Web App</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">คลิก "การทำให้ใช้งานได้" (Deploy) มุมขวาบน -&gt; "การทำให้ใช้งานได้ใหม่" -&gt; เลือกประเภท "เว็บแอป" และกำหนด "ผู้มีสิทธิ์เข้าถึง" เป็น "ทุกคน (Everyone)" จากนั้นนำ URL ที่ได้รับมาป้อนลงระบบที่ช่องด้านบน</span>
                </div>
              </div>
            </div>
          </div>

          {/* Script Code Viewer */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 font-sans flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  ซอร์สโค้ด Google Apps Script สมบูรณ์ (.GS)
                </h3>
                <p className="text-xs text-slate-500 font-sans">คัดลอกชุดสคริปต์นี้เพื่อไปวางที่หน้าต่างแก้ไขคำสั่งเชื่อมระบบหลังบ้าน</p>
              </div>
              
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    คัดลอกสำเร็จแล้ว!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    คัดลอกชุดสคริปต์
                  </>
                )}
              </button>
            </div>

            <div className="relative border border-slate-100 rounded-xl overflow-hidden bg-slate-950 font-mono text-[10px] leading-relaxed p-4 h-[350px] overflow-y-auto text-slate-300 shadow-inner">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : (
                <pre className="whitespace-pre">{gasCode}</pre>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* BLUEPRINTS TAB */
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
              <TableProperties className="w-4 h-4 text-emerald-600" />
              โครงสร้างตารางข้อมูลและพิมพ์เขียวสูตรอัตโนมัติ (Automated Formula Blueprints)
            </h3>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              สเปรดชีตของคุณควรมีสูตรคำนวณสะสมเหล่านี้เพื่อช่วยรวมยอดขายและสถิติต่างๆ ให้เป็นไปอย่างถูกต้องโดยสอดรับกับกฎคณิตศาสตร์บัญชีน้ำพริกแม่มานิต
            </p>
          </div>

          {/* Sheet Selector Sub-tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-3">
            {[
              { id: "customer", label: "02_CUSTOMER (ตารางลูกค้า)" },
              { id: "product", label: "03_PRODUCT (คลังพริกแกง)" },
              { id: "order", label: "04_SALES_ORDER (ใบสั่งขาย)" },
              { id: "detail", label: "05_SALES_DETAIL (รายละเอียดสินค้า)" },
              { id: "dashboard", label: "DASHBOARD SUM (แดชบอร์ดสรุป)" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSheetTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans cursor-pointer transition-all ${
                  activeSheetTab === tab.id
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ACTIVE SHEET BLUEPRINT CONTENTS */}
          {Object.entries(sheetBlueprints).map(([key, bp]) => {
            if (activeSheetTab !== key) return null;

            return (
              <div key={key} className="space-y-5 animate-in fade-in duration-150">
                {/* Intro Title */}
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 space-y-1">
                  <h4 className="text-xs font-bold text-emerald-800 font-sans">{bp.title}</h4>
                  <p className="text-[11px] text-slate-600 font-sans">{bp.desc}</p>
                </div>

                {/* Columns Grid */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider block">รายชื่อคอลัมน์มาตรฐาน (Headers)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-[11px]">
                    {bp.columns.map((col, idx) => (
                      <div key={idx} className="p-2.5 bg-white border border-gray-100 rounded-lg hover:border-emerald-200 transition-colors">
                        <span className="font-mono font-bold text-slate-800 block">{col.name}</span>
                        <span className="text-[10px] text-slate-400 font-sans block mt-0.5">{col.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulas List with Copy Button */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider block">สูตรคำนวณอัตโนมัติที่ต้องป้อนลงแผ่นงานเพื่อสรุปข้อมูล (Copyable Formulas)</span>
                  <div className="space-y-3">
                    {bp.formulas.map((item, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-xs">
                        <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-gray-100">
                          <span className="text-xs font-bold text-slate-700 font-sans flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {item.target}
                          </span>
                          <button
                            onClick={() => handleCopyFormula(item.formula, `${key}_f_${idx}`)}
                            className="inline-flex items-center gap-1 text-[10px] bg-white border border-gray-200 hover:border-emerald-500 text-slate-600 hover:text-emerald-700 px-2.5 py-1 rounded-md font-sans font-bold cursor-pointer shadow-2xs transition-all"
                          >
                            {copiedFormula === `${key}_f_${idx}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                คัดลอกสูตรแล้ว!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                คัดลอกสูตรไปแปะ
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-3 rounded-lg overflow-x-auto shadow-inner border border-slate-900 leading-relaxed">
                            {item.formula}
                          </div>
                          <p className="text-[11px] text-slate-500 font-sans leading-relaxed mt-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
