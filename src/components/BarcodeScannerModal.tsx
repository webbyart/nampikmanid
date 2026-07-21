import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, RefreshCw, AlertCircle, Sparkles, Keyboard, Search, ArrowLeft, Check } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  products?: any[];
}

export default function BarcodeScannerModal({ isOpen, onClose, onScanSuccess, products }: BarcodeScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [isManualModeActive, setIsManualModeActive] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "html5-qrcode-scanner-region";

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setIsInitializing(true);
    setManualCode("");
    setIsManualModeActive(false);

    // Initialize html5-qrcode
    const startScanner = async () => {
      try {
        // Request camera permissions first and list devices
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera for scanning
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes("back") || 
            device.label.toLowerCase().includes("rear") || 
            device.label.toLowerCase().includes("environment")
          );
          const defaultCameraId = backCamera ? backCamera.id : devices[0].id;
          setActiveCameraId(defaultCameraId);
          await initializeScanner(defaultCameraId);
        } else {
          setError("ไม่พบกล้องในอุปกรณ์นี้ หรือไม่ได้รับอนุญาตให้เข้าถึงกล้อง");
          setIsInitializing(false);
        }
      } catch (err: any) {
        console.error("Error accessing cameras:", err);
        setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตสิทธิ์การเข้าถึงกล้องในเบราว์เซอร์");
        setIsInitializing(false);
      }
    };

    // Small timeout to let DOM render
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const initializeScanner = async (cameraId: string) => {
    setIsInitializing(true);
    setError(null);

    // Stop existing scanner if running
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (e) {
        console.error("Error stopping scanner before restart:", e);
      }
    }

    try {
      const html5Qrcode = new Html5Qrcode(scannerId);
      html5QrcodeRef.current = html5Qrcode;

      const config: any = {
        fps: 15,
        qrbox: (width: number, height: number) => {
          // Standard landscape or portrait barcodes
          return {
            width: Math.floor(width * 0.8),
            height: Math.floor(height * 0.4) // Shorter height for linear barcodes
          };
        }
      };

      const handleSuccess = (decodedText: string) => {
        // Play a nice success beep if possible
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.value = 1000;
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.08);
        } catch (e) {}

        // Call success handler
        onScanSuccess(decodedText);
        onClose();
      };

      const handleFailure = (errorMessage: string) => {
        // Verbose error from frame analyzer, safe to ignore
      };

      const cameraSpecs: any[] = [];
      if (cameraId) {
        cameraSpecs.push(cameraId);
      }
      cameraSpecs.push({ facingMode: "environment" });
      cameraSpecs.push({ facingMode: "user" });
      cameraSpecs.push({}); // Empty constraint to get whatever camera is available

      let started = false;
      let lastError: any = null;

      for (const spec of cameraSpecs) {
        try {
          console.log("Attempting to start scanner with spec:", spec);
          await html5Qrcode.start(
            spec,
            config,
            handleSuccess,
            handleFailure
          );
          started = true;
          break; // Succeeded!
        } catch (err: any) {
          console.warn("Failed to start with spec:", spec, err);
          lastError = err;
        }
      }

      if (!started) {
        throw lastError || new Error("Could not start any camera streams");
      }

      setIsInitializing(false);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setError(`ไม่สามารถเปิดกล้องได้: ${err.message || err}`);
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      if (html5QrcodeRef.current.isScanning) {
        try {
          await html5QrcodeRef.current.stop();
        } catch (e) {
          console.error("Error stopping scanner:", e);
        }
      }
      html5QrcodeRef.current = null;
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetId = e.target.value;
    setActiveCameraId(targetId);
    await initializeScanner(targetId);
  };

  const handleToggleManualMode = async (active: boolean) => {
    setIsManualModeActive(active);
    if (active) {
      setError(null);
      await stopScanner();
    } else {
      await initializeScanner(activeCameraId || "environment");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
      setManualCode("");
      onClose();
    }
  };

  const filteredProducts = products && products.length > 0
    ? products.filter(p => {
        if (!manualCode.trim()) return true;
        const query = manualCode.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.barcode.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
        );
      }).slice(0, 8)
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative text-white animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold font-sans">กล้องสแกนบาร์โค้ด</h3>
              <p className="text-[10px] text-slate-400">สแกนบาร์โค้ดสินค้าได้ทันทีผ่านกล้อง</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Manual Barcode Entry Fallback Panel */}
        {!isManualModeActive && (
          <div className="p-4 bg-slate-950/50 border-b border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">หรือระบุบาร์โค้ด/พิมพ์ค้นหาด้วยตนเอง</span>
              <button
                type="button"
                onClick={() => handleToggleManualMode(true)}
                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5" />
                เปิดแผงค้นหาสินค้า
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input 
                type="text"
                placeholder="ป้อนรหัสบาร์โค้ด หรือยิงเครื่องสแกนเนอร์..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-sans"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-sans shrink-0"
              >
                ตกลง
              </button>
            </form>
          </div>
        )}

        {/* Camera Feed Area or Manual Fallback Screen */}
        <div className="relative bg-black aspect-square w-full flex flex-col items-center justify-center overflow-hidden">
          
          {/* If manual mode is active */}
          {isManualModeActive ? (
            <div className="absolute inset-0 bg-slate-950 flex flex-col p-4 w-full h-full">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-sans">
                  <Keyboard className="w-4 h-4" />
                  โหมดคีย์ข้อมูลด้วยตนเอง (Manual Entry)
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleManualMode(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  กลับไปเปิดกล้อง
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full mb-3 shrink-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อสินค้า, SKU, หรือบาร์โค้ด..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-sans"
                  autoFocus
                />
              </div>

              {/* Results List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 w-full text-left">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1">
                  {manualCode.trim() ? "ผลลัพธ์การค้นหา" : "รายการสินค้าด่วน (Quick Select)"}
                </div>
                
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((prod) => (
                    <button
                      key={prod.barcode}
                      type="button"
                      onClick={() => {
                        onScanSuccess(prod.barcode);
                        setManualCode("");
                        onClose();
                      }}
                      className="w-full p-2.5 bg-slate-900 hover:bg-slate-800/80 border border-slate-800/60 hover:border-emerald-500/50 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="space-y-0.5 pr-2 truncate">
                        <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                          {prod.name}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono truncate">
                          บาร์โค้ด: {prod.barcode} | SKU: {prod.sku}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-emerald-400 font-mono">
                          ฿{prod.price}
                        </div>
                        <div className="text-[9px] text-slate-500 font-sans">
                          สต็อก: {prod.stock || 0} {prod.unit || "ชิ้น"}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    ไม่พบสินค้าที่ตรงตามเงื่อนไขค้นหา
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* html5-qrcode region */}
              <div id={scannerId} className="w-full h-full object-cover" />

              {/* Scanning Overlay Grid and Laser Line */}
              {!isInitializing && !error && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
                  {/* Corner indicators */}
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-sm" />
                    <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-sm" />
                  </div>
                  
                  {/* Laser Line */}
                  <div className="w-full h-0.5 bg-emerald-500/80 shadow-[0_0_8px_#10b981] animate-bounce my-auto" />

                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-sm" />
                    <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-sm" />
                  </div>
                </div>
              )}

              {/* Initializing Spinner */}
              {isInitializing && !error && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <span className="text-xs font-sans text-slate-300">กำลังเปิดใช้งานกล้อง...</span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-3">
                  <AlertCircle className="w-10 h-10 text-rose-500" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">ไม่สามารถเชื่อมต่อกล้องได้</p>
                    <p className="text-[10px] text-slate-400 max-w-[280px] mx-auto truncate">{error}</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs mt-3">
                    <button 
                      type="button"
                      onClick={() => handleToggleManualMode(true)}
                      className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/50"
                    >
                      <Keyboard className="w-4 h-4" />
                      เปิดโหมดคีย์ข้อมูลด้วยตนเอง
                    </button>
                    <button 
                      type="button"
                      onClick={() => initializeScanner(activeCameraId || "environment")}
                      className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700/50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      ลองใหม่อีกครั้ง
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Settings & Selector */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {cameras.length > 1 && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">เลือกกล้องสแกน</label>
              <select
                value={activeCameraId}
                onChange={handleCameraChange}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                {cameras.map((camera, idx) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `กล้องตัวที่ ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/45 p-2 rounded-lg border border-slate-900/70">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>คำแนะนำ: วางแถบบาร์โค้ดของบรรจุภัณฑ์ให้อยู่ตรงกลางกรอบสแกน แสงสว่างพอเหมาะจะช่วยให้สแกนได้เร็วขึ้นค่ะ</span>
          </div>
        </div>

      </div>
    </div>
  );
}
