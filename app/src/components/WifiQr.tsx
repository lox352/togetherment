import qrcode from "qrcode-generator";
import { useMemo } from "react";
import { wifiQrPayload } from "../lib/wifi";

/** Scannable join-the-network code, drawn as inline SVG rects (theme-friendly). */
export default function WifiQr({ ssid, password }: { ssid: string; password: string }) {
  const modules = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(wifiQrPayload(ssid, password));
    qr.make();
    const count = qr.getModuleCount();
    const dark: Array<[number, number]> = [];
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) dark.push([row, col]);
      }
    }
    return { count, dark };
  }, [ssid, password]);

  const quiet = 2;
  const size = modules.count + quiet * 2;

  return (
    <div className="wifi-qr">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Wifi QR code for ${ssid}`}>
        <rect width={size} height={size} fill="#ffffff" />
        {modules.dark.map(([row, col]) => (
          <rect key={`${row}-${col}`} x={col + quiet} y={row + quiet} width={1} height={1} fill="#000000" />
        ))}
      </svg>
      <p className="muted">Point a camera at this to join {ssid}.</p>
    </div>
  );
}
