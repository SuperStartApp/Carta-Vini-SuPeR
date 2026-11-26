export const qrQuietZone = 4;
export const qrPngSize = 2048;

export function qrColorAllowed(hex: string) {
  if (!/^#[a-f\d]{6}$/i.test(hex)) return false;
  const weights = [0.2126, 0.7152, 0.0722];
  const luminance = weights.reduce((total, weight, index) => {
    const start = 1 + index * 2;
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return total + weight * linear;
  }, 0);
  return 1.05 / (luminance + 0.05) >= 7;
}
