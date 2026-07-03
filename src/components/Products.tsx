import React, { useEffect, useState } from "react";
import { 
  Package, Search, PlusCircle, Edit2, Trash2, 
  AlertCircle, ShieldCheck, X, RefreshCw, Layers 
} from "lucide-react";
import { Product } from "../types";

interface ProductsProps {
  userRole: string;
}

export default function Products({ userRole }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal forms states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    barcode: "",
    sku: "",
    name: "",
    unit: "กระปุก",
    priceA: 0,
    priceB: 0,
    priceC: 0,
    cost: 0,
    stock: 0,
    minStock: 10,
    status: "ใช้งาน" as "ใช้งาน" | "ระงับ"
  });

  // Simple Notification/Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลสินค้าได้");
      const data = await res.json();
      setProducts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenForm = (prod: Product | null = null) => {
    if (userRole === "Viewer") {
      showToast("error", "คุณไม่มีสิทธิ์แก้ไขข้อมูล (สิทธิ์ Viewer เท่านั้น)");
      return;
    }
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        barcode: prod.barcode,
        sku: prod.sku,
        name: prod.name,
        unit: prod.unit,
        priceA: prod.priceA,
        priceB: prod.priceB,
        priceC: prod.priceC,
        cost: prod.cost,
        stock: prod.stock,
        minStock: prod.minStock,
        status: prod.status
      });
    } else {
      setEditingProduct(null);
      setFormData({
        barcode: "",
        sku: "",
        name: "",
        unit: "กระปุก",
        priceA: 40,
        priceB: 45,
        priceC: 50,
        cost: 25,
        stock: 100,
        minStock: 20,
        status: "ใช้งาน"
      });
    }
    setIsFormOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === "Viewer") return;

    if (!formData.barcode || !formData.name || !formData.sku) {
      showToast("error", "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.barcode}` 
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user": "admin" // simulate logged in user
        },
        body: JSON.stringify(formData)
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || "เกิดข้อผิดพลาดในการบันทึก");

      showToast("success", editingProduct ? "แก้ไขข้อมูลสินค้าสำเร็จ!" : "เพิ่มสินค้าใหม่สำเร็จ!");
      setIsFormOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleDeleteProduct = async (barcode: string, name: string) => {
    if (userRole === "Viewer") {
      showToast("error", "คุณไม่มีสิทธิ์ลบข้อมูล");
      return;
    }

    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${name}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/products/${barcode}`, {
        method: "DELETE",
        headers: {
          "x-user": "admin"
        }
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "ไม่สามารถลบได้");
      }

      showToast("success", "ลบข้อมูลสินค้าเรียบร้อยแล้ว");
      fetchProducts();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.barcode.includes(search) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
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
          <AlertCircle className={`w-4 h-4 ${toast.type === "success" ? "text-emerald-600" : "text-rose-600"}`} />
          {toast.msg}
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="products-title" className="text-2xl font-semibold tracking-tight text-gray-900 font-sans">จัดการข้อมูลสินค้า (Products)</h1>
          <p className="text-xs text-gray-500 font-sans mt-0.5">ค้นหา เพิ่ม ลบ และปรับปรุงรายการน้ำพริกแต่ละประเภท</p>
        </div>
        {userRole !== "Viewer" && (
          <button 
            id="add-product-btn"
            onClick={() => handleOpenForm(null)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            เพิ่มสินค้าใหม่
          </button>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="ค้นหาตามชื่อสินค้า, บาร์โค้ด หรือ SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-sans focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
          />
        </div>
        <div className="text-xs font-sans text-gray-400 font-medium ml-auto">
          แสดงทั้งหมด {filteredProducts.length} รายการ
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-gray-400 font-sans">กำลังดาวน์โหลดข้อมูลสินค้า...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-sans text-xs">{error}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-sans text-xs">ไม่พบข้อมูลสินค้าที่ค้นหา</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-sans text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">บาร์โค้ด / SKU</th>
                  <th className="py-3.5 px-4">ชื่อสินค้า</th>
                  <th className="py-3.5 px-4 text-center">หน่วย</th>
                  <th className="py-3.5 px-4 text-right">ราคา A / B / C</th>
                  <th className="py-3.5 px-4 text-right">ต้นทุน</th>
                  <th className="py-3.5 px-4 text-center">สต็อกสินค้า</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  {userRole !== "Viewer" && <th className="py-3.5 px-4 text-center">การจัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans text-xs text-gray-700">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock < p.minStock;
                  return (
                    <tr key={p.barcode} className={`hover:bg-gray-50/70 transition-colors ${isLowStock ? "bg-rose-50/30" : ""}`}>
                      <td className="py-4 px-4">
                        <div className="font-mono text-xs font-semibold text-gray-900">{p.barcode}</div>
                        <div className="font-mono text-[10px] text-gray-400 mt-0.5">{p.sku}</div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-800">
                        {p.name}
                        {isLowStock && (
                          <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-[9px] font-medium bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertCircle className="w-2.5 h-2.5" /> สต็อกต่ำกว่าเกณฑ์
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-500 font-medium">{p.unit}</td>
                      <td className="py-4 px-4 text-right">
                        <div className="font-mono text-gray-900">
                          A: <span className="font-bold">฿{p.priceA}</span> | B: <span className="font-bold">฿{p.priceB}</span> | C: <span className="font-bold text-emerald-600">฿{p.priceC}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-gray-500">฿{p.cost}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-full ${
                          isLowStock 
                            ? "bg-rose-100 text-rose-800 animate-pulse border border-rose-200" 
                            : "bg-emerald-50 text-emerald-800"
                        }`}>
                          {p.stock.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-1">Min: {p.minStock}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === "ใช้งาน" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}>
                          <ShieldCheck className="w-3 h-3" />
                          {p.status}
                        </span>
                      </td>
                      {userRole !== "Viewer" && (
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <button 
                              onClick={() => handleOpenForm(p)}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขสินค้า"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(p.barcode, p.name)}
                              className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบสินค้า"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-semibold text-sm font-sans flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                {editingProduct ? "แก้ไขข้อมูลสินค้าน้ำพริก" : "เพิ่มสินค้าใหม่ในระบบ"}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                {/* Barcode */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">บาร์โค้ด (Barcode) *</label>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingProduct} // Cannot change barcode once created
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50 disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder="8850123456..."
                  />
                </div>

                {/* SKU */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">รหัสพัสดุ (SKU) *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                    placeholder="PM-XXX"
                  />
                </div>
              </div>

              {/* Product Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">ชื่อสินค้า *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                  placeholder="เช่น น้ำพริกตาแดงรสเผ็ดจัดจ้าน..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Unit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">หน่วยนับ</label>
                  <select 
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                  >
                    <option value="กระปุก">กระปุก</option>
                    <option value="ถุง">ถุง</option>
                    <option value="กล่อง">กล่อง</option>
                    <option value="ขวด">ขวด</option>
                  </select>
                </div>

                {/* Cost */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">ราคาทุน (Cost)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">สถานะ</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as "ใช้งาน" | "ระงับ" })}
                    className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                  >
                    <option value="ใช้งาน">ใช้งาน</option>
                    <option value="ระงับ">ระงับ</option>
                  </select>
                </div>
              </div>

              {/* Prices A, B, C */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <span className="text-[10px] font-bold text-gray-500 font-sans block uppercase">กลุ่มราคาสินค้าตามประเภทลูกค้า</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 font-sans uppercase">ราคา A (ขายส่ง)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={formData.priceA}
                      onChange={(e) => setFormData({ ...formData, priceA: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 font-sans uppercase">ราคา B (ตัวแทน)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={formData.priceB}
                      onChange={(e) => setFormData({ ...formData, priceB: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 font-sans uppercase">ราคา C (ขายปลีก)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={formData.priceC}
                      onChange={(e) => setFormData({ ...formData, priceC: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Stock */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">จำนวนสต็อก (Stock)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                  />
                </div>

                {/* Min Stock */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">คลังต่ำสุด (Min Stock)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 font-sans cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm font-sans cursor-pointer"
                >
                  {editingProduct ? "บันทึกการแก้ไข" : "บันทึกสินค้าใหม่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
