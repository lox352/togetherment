/**
 * Pull an SSID/password out of a manual entry body so guests can scan a QR
 * instead of typing a 20-character password on a phone keyboard.
 * Recognises "network:"/"ssid:" and "password:"/"pass:" lines, case-insensitive.
 */
export function parseWifi(body: string): { ssid: string; password: string } | null {
  let ssid = "";
  let password = "";
  for (const line of body.split("\n")) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!value) continue;
    if (key === "network" || key === "ssid" || key === "wifi") ssid = value;
    if (key === "password" || key === "pass" || key === "pw") password = value;
  }
  return ssid && password ? { ssid, password } : null;
}

/** Escape per the WIFI: URI scheme, then build the payload phones understand. */
export function wifiQrPayload(ssid: string, password: string): string {
  const esc = (s: string) => s.replace(/([\\;,":])/g, "\\$1");
  return `WIFI:T:WPA;S:${esc(ssid)};P:${esc(password)};;`;
}
