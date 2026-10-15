const QRCode = require('qrcode');

let serverQR = null;
try {
  serverQR = require('qrcode/lib/server');
} catch (e) {
  // If server renderer is unavailable in worker bundle, SVG fallback is used
}

async function generateQRCode(referenceNumber) {
  // 1. Try server PNG renderer (pure JS via pngjs, no canvas required)
  if (serverQR && typeof serverQR.toDataURL === 'function') {
    try {
      return await serverQR.toDataURL(referenceNumber, { width: 300, margin: 2 });
    } catch (err) {
      console.warn('PNG QR generation failed, falling back to SVG:', err.message);
    }
  }

  // 2. Universal SVG data URL fallback (never requires canvas, works in any runtime)
  const svg = await new Promise((resolve, reject) => {
    QRCode.toString(referenceNumber, { type: 'svg', width: 300, margin: 2 }, (err, str) => {
      if (err) reject(err);
      else resolve(str);
    });
  });

  const base64Svg = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}

module.exports = { generateQRCode };
