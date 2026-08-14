import { useState, useEffect } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StationContact from '../../components/common/StationContact';

export default function PastPickupsPage() {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/parcels/delivered').then(({ data }) => setParcels(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const downloadReceipt = async (id, ref) => {
    try {
      const { data } = await api.get(`/parcels/${id}/receipt`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = `receipt-${ref}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  if (loading) return <LoadingSpinner text="Loading past pickups..." />;

  return (
    <div className="container">
      <h1 className="page-title">Past Pickups</h1>
      <p className="page-subtitle">Your completed deliveries and receipts</p>

      {parcels.length === 0 ? (
        <div className="card text-center" style={{ padding: '48px 28px' }}>
          <div style={{ fontSize: 48, marginBottom: 12, color: '#cbd5e1' }}>—</div>
          <p style={{ fontSize: 18, color: '#64748b' }}>No completed pickups yet</p>
        </div>
      ) : parcels.map(p => (
        <div className="card" key={p.id}>
          <div className="flex-between">
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{p.referenceNumber}</p>
            </div>
            <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 14px', borderRadius: 20, fontSize: 14, fontWeight: 600 }}>Delivered</span>
          </div>
          <div className="divider" />
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 15, color: '#475569', marginBottom: 16 }}>
            <div><span style={{ color: '#94a3b8' }}>Station</span><br /><strong>{p.stationName}</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Size</span><br /><strong>{p.size}</strong></div>
            <div><span style={{ color: '#94a3b8' }}>Delivered</span><br /><strong>{new Date(p.deliveredAt).toLocaleDateString()}</strong></div>
          </div>
          <StationContact phone={p.stationPhone} email={p.stationEmail} />
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => downloadReceipt(p.id, p.referenceNumber)}>Download Receipt (PDF)</button>
        </div>
      ))}
    </div>
  );
}
