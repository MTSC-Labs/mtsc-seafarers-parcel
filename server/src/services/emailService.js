const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Configure email transporter
let transporter = null;

function getTransporter() {
  if (
    !transporter &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_APP_PASSWORD
  ) {
    // Fallback to Gmail
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

// Send email via Brevo API
async function sendBrevoEmail({ from, to, cc, bcc, replyTo, subject, html }) {
  const brevoApiKey =
    (typeof process !== 'undefined' && process.env?.BREVO_API_KEY) ||
    globalThis.__ENV__?.BREVO_API_KEY;

  if (!brevoApiKey) {
    console.error("BREVO_API_KEY not configured");
    return false;
  }

  try {
    const payload = {
      sender: {
        name: from.name || "Mission to Seafarers Canada",
        email: from.email,
      },
      to: parseEmails(to),
      subject,
      htmlContent: html,
    };

    if (cc) {
      payload.cc = parseEmails(cc);
    }

    if (bcc) {
      payload.bcc = parseEmails(bcc);
    }

    if (replyTo) {
      payload.replyTo = { email: replyTo };
    }

    console.log("Sending email via Brevo:", {
      from: from.email,
      to,
      cc,
      bcc,
      subject,
    });

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Brevo API error:", res.status, errText);
      console.error(
        "Failed payload:",
        JSON.stringify({ from, to, cc, bcc, replyTo, subject }, null, 2),
      );
      return false;
    }

    const data = await res.json();
    console.log("Brevo response:", data);
    return true;
  } catch (error) {
    console.error("Brevo API error:", error.response?.data || error.message);
    console.error(
      "Failed payload:",
      JSON.stringify({ from, to, cc, bcc, replyTo, subject }, null, 2),
    );
    return false;
  }
}

// Get station-based FROM address
function getStationFromAddress(stationName) {
  // Create station email like Toronto@mtsc.ca, Halifax@mtsc.ca
  const stationEmail = `${stationName.replace(/\s+/g, "")}@mtsc.ca`;
  return {
    name: `Mission to Seafarers - ${stationName}`,
    email: stationEmail,
  };
}

// Helper to parse comma-separated emails into Brevo format
function parseEmails(emailString) {
  if (!emailString) return [];
  return emailString
    .split(",")
    .map((e) => ({ email: e.trim() }))
    .filter((e) => e.email);
}

// Pick the first email from comma-separated list
function pickFirstEmail(emailString) {
  if (!emailString) return null;
  const emails = emailString
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return emails[0];
}

function getBackendUrl() {
  return (
    globalThis.__ENV__?.BACKEND_URL ||
    (typeof process !== 'undefined' && process.env?.BACKEND_URL) ||
    ''
  );
}

// Save base64 image to uploads folder or Cloudflare R2
async function saveImage(base64Data, referenceNumber, type) {
  if (!base64Data) return null;
  const backendUrl = getBackendUrl();

  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return base64Data;
  }
  if (base64Data.startsWith('/uploads/')) {
    return backendUrl ? `${backendUrl}${base64Data}` : base64Data;
  }
  try {
    const bucket = globalThis.__ENV__?.BUCKET || globalThis.__ENV__?.mtsc_parcel_uploads;
    const base64Image = base64Data.split(';base64,').pop();
    const isSvg = base64Data.includes('svg');
    const ext = isSvg ? 'svg' : 'png';
    const filename = `${referenceNumber}_${type}.${ext}`;

    if (bucket) {
      const binary = atob(base64Image);
      const buffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
      }
      await bucket.put(filename, buffer, {
        httpMetadata: { contentType: isSvg ? 'image/svg+xml' : 'image/png' },
      });
      return backendUrl ? `${backendUrl}/uploads/${filename}` : `/uploads/${filename}`;
    }

    if (typeof __dirname !== 'undefined' && typeof fs !== 'undefined' && fs.writeFileSync) {
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, base64Image, { encoding: 'base64' });
      return backendUrl ? `${backendUrl}/uploads/${filename}` : `/uploads/${filename}`;
    }

    return null;
  } catch (error) {
    console.error(`Failed to save ${type} image:`, error.message);
    return null;
  }
}

function arrivalEmailHtml({
  stationName,
  stationAddress,
  referenceNumber,
  qrCodeUrl,
}) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1B2A4A;">
<h2>Your Parcel Has Arrived!</h2>
<p>Your parcel <strong>${referenceNumber}</strong> has arrived at <strong>${stationName}</strong>.</p>
<p>Station Address: ${stationAddress}</p>
<p>Please present this QR code at the station for pickup:</p>
<img src="${qrCodeUrl}" alt="QR Code" style="width:200px;height:200px;" />
<p style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px;margin:20px 0;"><strong>Important:</strong> Please pickup your parcel within 30 days.</p>
<p>Thank you,<br/>Mission to Seafarers Canada</p>
</body></html>`;
}

function deliveryEmailHtml({
  stationName,
  referenceNumber,
  size,
  deliveredAt,
  signatureUrl,
}) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1B2A4A;">
<h2>Delivery Confirmation</h2>
<p>Your parcel <strong>${referenceNumber}</strong> has been delivered at <strong>${stationName}</strong>.</p>
<p>Size: ${size} | Date: ${new Date(deliveredAt).toLocaleDateString()}</p>
<p>Signature:</p>
<img src="${signatureUrl}" alt="Signature" style="max-width:300px;" />
<p>Thank you,<br/>Mission to Seafarers Canada</p>
</body></html>`;
}

function resetPasswordEmailHtml({ firstName, otp }) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1B2A4A;">
<h2>Password Reset Request</h2>
<p>Hello ${firstName},</p>
<p>You requested to reset your password. Please use the following OTP code:</p>
<h1 style="background:#f0f0f0;padding:20px;text-align:center;letter-spacing:5px;">${otp}</h1>
<p>This code will expire in 15 minutes.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>Thank you,<br/>Mission to Seafarers Canada</p>
</body></html>`;
}

async function sendArrivalEmail(parcelData) {
  // Save QR code image and get URL
  const qrCodeUrl = await saveImage(
    parcelData.qrCodeDataUrl,
    parcelData.referenceNumber,
    "QR",
  );

  if (!qrCodeUrl) {
    console.error("Failed to save QR code image, using base64 fallback");
  }

  const html = arrivalEmailHtml({
    ...parcelData,
    qrCodeUrl: qrCodeUrl || parcelData.qrCodeDataUrl,
  });

  const to = parcelData.email;
  const subject = `Parcel ${parcelData.referenceNumber} has arrived at ${parcelData.stationName}`;

  // Pick the first station email for reply-to (from actual station emails)
  const stationReplyTo = pickFirstEmail(parcelData.stationEmail);

  const success = await sendBrevoEmail({
    from: getStationFromAddress(parcelData.stationName),
    to,
    cc: pickFirstEmail(parcelData.stationEmail),
    bcc: "marsha.clyne@missiontoseafarers.org",
    replyTo: stationReplyTo || parcelData.stationEmail,
    subject,
    html,
  });

  if (success) {
    console.log(
      `Arrival email sent to ${to} for parcel ${parcelData.referenceNumber}`,
    );
  } else {
    console.log("--- EMAIL (FALLBACK) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("QR Code URL:", qrCodeUrl);
    console.log("--- END EMAIL ---");
  }
}

async function sendDeliveryEmail(parcelData) {
  // Save signature image and get URL
  const signatureUrl = await saveImage(
    parcelData.signatureDataUrl,
    parcelData.referenceNumber,
    "signature",
  );

  if (!signatureUrl) {
    console.error("Failed to save signature image, using base64 fallback");
  }

  const html = deliveryEmailHtml({
    ...parcelData,
    signatureUrl: signatureUrl || parcelData.signatureDataUrl,
  });

  const to = parcelData.email;
  const subject = `Delivery confirmation for ${parcelData.referenceNumber}`;

  // Pick the first station email for reply-to
  const stationReplyTo = pickFirstEmail(parcelData.stationEmail);

  const success = await sendBrevoEmail({
    from: getStationFromAddress(parcelData.stationName),
    to,
    cc: pickFirstEmail(parcelData.stationEmail),
    bcc: "marsha.clyne@missiontoseafarers.org",
    replyTo: stationReplyTo || parcelData.stationEmail,
    subject,
    html,
  });

  if (success) {
    console.log(
      `Delivery email sent to ${to} for parcel ${parcelData.referenceNumber}`,
    );
  } else {
    console.log("--- EMAIL (FALLBACK) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Signature URL:", signatureUrl);
    console.log("--- END EMAIL ---");
  }
}

function requestEmailHtml({
  referenceNumber,
  size,
  stationName,
  stationAddress,
  seafarerName,
}) {
  const isHalifax = stationName && stationName.toLowerCase().includes("halifax");
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1B2A4A;">
<h2>New Parcel Request</h2>
<p>A new parcel request has been created${seafarerName ? ` by <strong>${seafarerName}</strong>` : ""}.</p>
<p><strong>Reference:</strong> ${referenceNumber}</p>
<p><strong>Size:</strong> ${size}</p>
<p><strong>Station:</strong> ${stationName}</p>
<p><strong>Address:</strong> ${stationAddress}</p>
<h3>Shipping Instructions</h3>
<p>Please address your parcel as <strong>C/O Mission to Seafarers</strong> at the station address above.</p>
<p>Please request <strong>signature on delivery</strong> when shipping.</p>
${
  isHalifax
    ? `<p style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px;margin:20px 0;"><strong>Important:</strong> Please check the business hours of Canada Post at Fenwick and advise your courier of the delivery time.</p>`
    : ""
}
<p>Thank you,<br/>Mission to Seafarers Canada</p>
</body></html>`;
}

async function sendRequestEmail({
  email,
  stationEmail,
  referenceNumber,
  size,
  stationName,
  stationAddress,
  seafarerName,
}) {
  const html = requestEmailHtml({
    referenceNumber,
    size,
    stationName,
    stationAddress,
    seafarerName,
  });
  const subject = `New parcel request ${referenceNumber} – ${stationName}`;

  // Pick the first station email for reply-to
  const stationReplyTo = pickFirstEmail(stationEmail);

  const success = await sendBrevoEmail({
    from: getStationFromAddress(stationName),
    to: email,
    cc: pickFirstEmail(stationEmail),
    bcc: "marsha.clyne@missiontoseafarers.org",
    replyTo: stationReplyTo || stationEmail,
    subject,
    html,
  });

  if (success) {
    console.log(`Request email sent to ${email} for parcel ${referenceNumber}`);
  } else {
    console.log("--- EMAIL (FALLBACK) ---");
    console.log("To:", email);
    console.log("Subject:", subject);
    console.log("--- END EMAIL ---");
  }
}

async function sendResetPasswordEmail(userData) {
  const html = resetPasswordEmailHtml(userData);
  const to = userData.email;
  const subject = "Password Reset OTP";

  const success = await sendBrevoEmail({
    from: { name: "Mission to Seafarers Canada", email: "noreply@mtsc.ca" },
    to,
    subject,
    html,
  });

  if (success) {
    console.log(`Reset password OTP sent to ${to}`);
  } else {
    console.log("--- EMAIL (FALLBACK) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("OTP:", userData.otp);
    console.log("--- END EMAIL ---");
  }
}

module.exports = {
  sendArrivalEmail,
  sendDeliveryEmail,
  sendRequestEmail,
  sendResetPasswordEmail,
  arrivalEmailHtml,
  deliveryEmailHtml,
  requestEmailHtml,
};
