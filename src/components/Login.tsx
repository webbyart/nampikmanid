import React, { useState } from "react";
import { 
  KeyRound, ShieldCheck, UserCheck, Eye, EyeOff, 
  AlertCircle, ShieldAlert, Sparkles, RefreshCw 
} from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: { username: string; role: "Admin" | "Sales" | "Viewer" }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "การเข้าสู่ระบบขัดข้อง");

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (user: string) => {
    setUsername(user);
    setPassword(`${user}123`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Visual background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-amber-600/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Side: Brand Visual */}
        <div className="md:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Ambient red flare matching chili/spicy theme */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
          
          <div className="space-y-2.5 relative z-10">
            <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-xl font-bold font-sans">
              ม
            </div>
            <h2 className="text-xl font-bold tracking-tight">น้ำพริกแม่มานิต</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              สืบทอดสูตรโบราณจากเหนือ ส่งมอบพริกแกง น้ำพริกตาแดง น้ำพริกหนุ่ม รสชาติเข้มข้นจัดจ้านถูกปากคนไทย พร้อมระบบจัดการคลังและยอดขายอัจฉริยะ
            </p>
          </div>

          <div className="space-y-4 pt-8 border-t border-slate-800/80 relative z-10 mt-12">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">บัญชีสำหรับทดลองทดสอบ (คลิกเพื่อเลือกอัตโนมัติ)</span>
            
            <div className="space-y-2">
              {/* Admin */}
              <button 
                type="button"
                onClick={() => fillCredentials("admin")}
                className="w-full p-2.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div>
                  <span className="text-[11px] font-bold block text-white group-hover:text-emerald-400 transition-colors">ผู้ดูแลระบบ (Admin)</span>
                  <span className="text-[9px] text-slate-400 font-mono block mt-0.5">User: admin | Pass: admin123</span>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              </button>

              {/* Sales */}
              <button 
                type="button"
                onClick={() => fillCredentials("sales")}
                className="w-full p-2.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div>
                  <span className="text-[11px] font-bold block text-white group-hover:text-blue-400 transition-colors">ฝ่ายขาย / แคชเชียร์ (Sales)</span>
                  <span className="text-[9px] text-slate-400 font-mono block mt-0.5">User: sales | Pass: sales123</span>
                </div>
                <UserCheck className="w-4 h-4 text-blue-500 shrink-0" />
              </button>

              {/* Viewer */}
              <button 
                type="button"
                onClick={() => fillCredentials("viewer")}
                className="w-full p-2.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div>
                  <span className="text-[11px] font-bold block text-white group-hover:text-slate-300 transition-colors">ผู้เข้าชมภายนอก (Viewer)</span>
                  <span className="text-[9px] text-slate-400 font-mono block mt-0.5">User: viewer | Pass: viewer123</span>
                </div>
                <Sparkles className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <form onSubmit={handleSubmit} className="md:col-span-7 p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold font-sans text-gray-900 tracking-tight">ลงชื่อเข้าใช้งานระบบ</h1>
            <p className="text-xs text-gray-400 font-sans">กรอกข้อมูลผู้ใช้งานหรือเลือกจากบัญชีจำลองด้านซ้าย</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-150 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-sans">
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">ข้อมูลผิดพลาด</span>
                <span className="text-[11px] leading-relaxed block mt-0.5">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">ชื่อผู้ใช้งาน (Username)</label>
              <input 
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-sans border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                placeholder="ระบุชื่อผู้ใช้ของคุณ..."
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 font-sans uppercase">รหัสผ่าน (Password)</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-gray-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/70 text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer font-sans text-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                ยืนยันการเข้าระบบ
              </>
            )}
          </button>

          <div className="pt-4 border-t border-gray-100 flex items-center gap-1.5 text-[10px] text-gray-400 font-sans">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>ความลับและความปลอดภัย: ทุกธุรกรรมที่แก้ไขในระบบนี้จะลงบันทึก LOG ประวัติประธานเสมอ</span>
          </div>
        </form>
      </div>
    </div>
  );
}
