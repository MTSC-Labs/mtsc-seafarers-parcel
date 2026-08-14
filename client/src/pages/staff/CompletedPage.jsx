import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function CompletedPage() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedSig, setExpandedSig] = useState({});

  const fetchCompleted = async (q) => {
    try {
      const params = q ? { search: q } : {};
      const { data } = await api.get('/station/parcels/completed', { params });
      setParcels(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCompleted(''); }, []);

  const handleSearch = () => { setLoading(true); fetchCompleted(search); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };
  const clearSearch = () => { setSearch(''); setLoading(true); fetchCompleted(''); };

  if (loading) return <LoadingSpinner text="Loading completed pickups..." />;

  return (
    <div className="container">
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#d05535', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {user?.stationName || 'Station'}
        </p>
        <h1 className="page-title">Completed Pickups</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Showing recent deliveries. Use search to find a specific parcel.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input placeholder="Search by name, email, reference, or store..."
          value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleKeyDown}
          style={{ flex: 1, padding: '12px 16px', fontSize: 16, border: '2px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
        <button className="btn btn-secondary" onClick={handleSearch}>Search</button>
        {search && <button className="btn btn-outline" onClick={clearSearch}>Clear</button>}
      </div>

      {parcels.length === 0 ? (
        <div className="card text-center" style={{ padding: '48px 28px' }}>
          <div style={{ fontSize: 48, marginBottom: 12, color: '#cbd5e1' }}>—</div>
          <p style={{ fontSize: 18, color: '#64748b' }}>
            {search ? 'No completed pickups match your search' : 'No completed pickups yet'}
          </p>
        </div>
      ) : parcels.map(p => (
        <div className="card" key={p.id}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{p.referenceNumber}</p>
            <StatusBadge status={p.status} />
          </div>
          <div className="divider" />
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 15, color: '#475569' }}>
            <div><span style={{ color: '#94a3b8' }}>Seafarer</span><br /><strong>{p.seafarerName || p.seafarerEmail}</strong></div>
            {p.seafarerPhone && <div><span style={{ color: '#94a3b8' }}>Phone</span><br /><strong>{p.seafarerPhone}</strong></div>}
            <div><span style={{ color: '#94a3b8' }}>Size</span><br /><strong>{p.size}</strong></div>
            {p.deliveredAt && <div><span style={{ color: '#94a3b8' }}>Delivered</span><br /><strong>{new Date(p.deliveredAt).toLocaleDateString()}</strong></div>}
          </div>
          {p.signatureDataUrl && (
            <div style={{ marginTop: 14 }}>
              <button className="btn btn-outline" style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => setExpandedSig(prev => ({ ...prev, [p.id]: !prev[p.id] }))}>
                {expandedSig[p.id] ? 'Hide Signature' : 'View Signature Proof'}
              </button>
              {expandedSig[p.id] && (
                <div style={{ marginTop: 10, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', display: 'inline-block' }}>
                  <img src={p.signatureDataUrl} alt="Signature" style={{ maxWidth: 260, height: 90, borderRadius: 6 }} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
