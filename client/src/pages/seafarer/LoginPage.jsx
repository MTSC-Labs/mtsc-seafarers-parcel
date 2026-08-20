import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your email and password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-split-page">
      {/* Left side: Visual Panel with new_login_img */}
      <div className="login-split-visual">
        <div className="login-split-visual-inner">
          <img
            src="/new_login_img.jpeg"
            alt="Mission to Seafarers Parcel Delivery"
            className="login-split-img"
          />
        </div>
      </div>

      {/* Right side: Login Form Section */}
      <div className="login-split-form-container">
        <div className="login-split-form-wrapper">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Welcome Back</h1>
            <p style={{ color: '#64748b', fontSize: 15 }}>Log in to manage your parcel pickups</p>
          </div>
          <div className="card" style={{ padding: 32, backgroundColor: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            {error && <div className="error-msg" style={{ marginBottom: 20 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email" style={{ textTransform: 'uppercase', fontSize: '13px', fontWeight: 600, color: '#475569' }}>EMAIL ADDRESS</label>
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label htmlFor="password" style={{ textTransform: 'uppercase', fontSize: '13px', fontWeight: 600, color: '#475569' }}>PASSWORD</label>
                <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                  <Link to="/forgot-password" style={{ color: '#d05535', fontSize: '14px', fontWeight: '600' }}>Forgot Password?</Link>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ backgroundColor: '#0f4c81', borderColor: '#0f4c81', padding: '13px', fontSize: '15px', fontWeight: 600, marginTop: '6px' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: '#64748b', fontSize: 15 }}>Don't have an account? <Link to="/register" style={{ color: '#d05535', fontWeight: 600 }}>Create one</Link></p>
            <p style={{ marginTop: 12 }}><Link to="/staff/login" style={{ color: '#0f4c81', fontSize: 15, fontWeight: 600 }}>Station Staff Login →</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
