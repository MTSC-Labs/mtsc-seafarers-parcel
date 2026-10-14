const { Hono } = require('hono');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const { getDb, users } = require('../db');
const { sendResetPasswordEmail } = require('../services/emailService');

const authRouter = new Hono();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/register
authRouter.post('/register', async (c) => {
  try {
    const { email, password, firstName, lastName, phone } = await c.req.json();
    if (!email || !password || !firstName || !lastName) {
      return c.json({ error: { code: 'MISSING_FIELDS', message: 'Email, password, first name, and last name are required' } }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } }, 400);
    }

    const db = getDb(c.env);
    const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (existing) {
      return c.json({ error: { code: 'DUPLICATE_EMAIL', message: 'Email is already in use' } }, 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
    }).returning();

    const secret = c.env.JWT_SECRET || 'dev_secret_key_change_in_production_12345';
    const token = jwt.sign(
      { userId: user.id, role: 'seafarer', email: user.email, firstName: user.firstName, lastName: user.lastName },
      secret,
      { expiresIn: '24h' }
    );

    return c.json({ token, userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }, 201);
  } catch (err) {
    console.error('Registration error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Registration failed' } }, 500);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: { code: 'MISSING_FIELDS', message: 'Email and password are required' } }, 400);
    }

    const db = getDb(c.env);
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return c.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } }, 401);
    }

    const secret = c.env.JWT_SECRET || 'dev_secret_key_change_in_production_12345';
    const token = jwt.sign(
      { userId: user.id, role: 'seafarer', email: user.email, firstName: user.firstName, lastName: user.lastName },
      secret,
      { expiresIn: '24h' }
    );

    return c.json({ token, userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
  } catch (err) {
    console.error('Login error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Login failed' } }, 500);
  }
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) {
      return c.json({ error: { code: 'MISSING_FIELDS', message: 'Email is required' } }, 400);
    }

    const db = getDb(c.env);
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (!user) {
      return c.json({ message: 'If the email exists, an OTP has been sent' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.update(users).set({
      resetOtp: otp,
      resetOtpExpiry: otpExpiry,
    }).where(eq(users.id, user.id));

    sendResetPasswordEmail({
      email: user.email,
      firstName: user.firstName,
      otp,
    }).catch(err => console.error('Forgot password email error:', err.message));

    return c.json({ message: 'If the email exists, an OTP has been sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to process request' } }, 500);
  }
});

// POST /api/auth/verify-otp
authRouter.post('/verify-otp', async (c) => {
  try {
    const { email, otp } = await c.req.json();
    if (!email || !otp) {
      return c.json({ error: { code: 'MISSING_FIELDS', message: 'Email and OTP are required' } }, 400);
    }

    const db = getDb(c.env);
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return c.json({ error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' } }, 400);
    }

    if (new Date() > new Date(user.resetOtpExpiry)) {
      await db.update(users).set({ resetOtp: null, resetOtpExpiry: null }).where(eq(users.id, user.id));
      return c.json({ error: { code: 'EXPIRED_OTP', message: 'OTP has expired' } }, 400);
    }

    if (user.resetOtp !== otp) {
      return c.json({ error: { code: 'INVALID_OTP', message: 'Invalid OTP' } }, 400);
    }

    return c.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to verify OTP' } }, 500);
  }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (c) => {
  try {
    const { email, otp, newPassword } = await c.req.json();
    if (!email || !otp || !newPassword) {
      return c.json({ error: { code: 'MISSING_FIELDS', message: 'Email, OTP, and new password are required' } }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } }, 400);
    }

    const db = getDb(c.env);
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return c.json({ error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' } }, 400);
    }

    if (new Date() > new Date(user.resetOtpExpiry)) {
      await db.update(users).set({ resetOtp: null, resetOtpExpiry: null }).where(eq(users.id, user.id));
      return c.json({ error: { code: 'EXPIRED_OTP', message: 'OTP has expired' } }, 400);
    }

    if (user.resetOtp !== otp) {
      return c.json({ error: { code: 'INVALID_OTP', message: 'Invalid OTP' } }, 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({
      passwordHash,
      resetOtp: null,
      resetOtpExpiry: null,
    }).where(eq(users.id, user.id));

    return c.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to reset password' } }, 500);
  }
});

module.exports = authRouter;
