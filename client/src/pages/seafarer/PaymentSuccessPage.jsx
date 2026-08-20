import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StationContact from '../../components/common/StationContact';

export default function PaymentSuccessPage() {
  const location = useLocation();
  const [parcel, setParcel] = useState(location.state?.parcel || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!location.state?.parcel);

  useEffect(() => {
    if (parcel) return;
    let cancelled = false;
    api.get('/parcels/active')
      .then(({ data }) => {
        if (!cancelled) {
          if (data && data.length > 0) setParcel(data[0]);
          else setError('No active parcel request found.');
        }
      })
      .catch(() => { if (!cancelled) setError('Unable to load parcel details.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [parcel]);

  if (loading) return <LoadingSpinner text="Loading your request details..." />;
  if (error || !parcel) return (
    <div className="container" style={{ maxWidth: 500, margin: '60px auto' }}>
      <div className="card text-center" style={{ padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h1 className="page-title">Request Status</h1>
        <div className="error-msg" style={{ marginTop: 16 }}>{error || 'Parcel information not available.'}</div>
        <Link to="/dashboard" className="btn btn-primary mt-20">Go to Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="card card-success text-center" style={{ padding: 40 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Request Confirmed</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#065f46' }}>Parcel Request Created!</h1>
        <p style={{ color: '#047857', marginTop: 6 }}>Your parcel request has been created successfully</p>
      </div>

      <div className="card" style={{ padding: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>What to Do Next</h2>

        <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
          <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>1</div>
          <div>
            <p style={{ fontWeight: 600, color: '#0f172a' }}>Write this reference number on your package</p>
            <div style={{ marginTop: 10, padding: '14px 20px', background: 'linear-gradient(135deg, #0f2744, #1e3a5f)', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24', letterSpacing: 3, fontFamily: 'monospace' }}>{parcel.referenceNumber}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
          <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>2</div>
          <div>
            <p style={{ fontWeight: 600, color: '#0f172a' }}>Ship your package to</p>
            <div style={{ marginTop: 8, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 700, fontSize: 17 }}>{parcel.stationName}</p>
              <p style={{ color: '#64748b', fontSize: 15 }}>{parcel.stationAddress}</p>
              <StationContact phone={parcel.stationPhone} email={parcel.stationEmail} style={{ marginTop: 8 }} />
            </div>
            <div style={{ marginTop: 12, padding: 12, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
              <p style={{ fontWeight: 700, color: '#92400e', fontSize: 14, marginBottom: 4 }}>📦 Shipping Instructions</p>
              <p style={{ color: '#78350f', fontSize: 14 }}>Address your parcel as <strong>C/O Mission to Seafarers</strong> at the station address above.</p>
              <p style={{ color: '#78350f', fontSize: 14, marginTop: 4 }}>Please request <strong>signature on delivery</strong> when shipping.</p>
              {(parcel.stationName?.toLowerCase().includes('halifax') || parcel.stationId === 'halifax-port') && (
                <p style={{ color: '#78350f', fontSize: 14, marginTop: 8, paddingTop: 8, borderTop: '1px dashed #fde68a' }}>
                  <strong>Important:</strong> Please check the business hours of Canada Post at Fenwick and advise your courier of the delivery time.
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>3</div>
          <p style={{ fontWeight: 600, color: '#0f172a', paddingTop: 6 }}>Once shipped, add your tracking number on the dashboard</p>
        </div>
      </div>

      <Link to="/dashboard" className="btn btn-primary btn-block" style={{ fontSize: 18 }}>Go to My Parcels →</Link>
    </div>
  );
}
