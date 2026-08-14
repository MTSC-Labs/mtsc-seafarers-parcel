import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import sizeGuideImg from '../../assets/size_guide.jpeg';

const SIZES = [
  { value: 'Small', fee: 'Free', cents: 0 },
  { value: 'Medium', fee: 'Free', cents: 0 },
  { value: 'Large', fee: 'Free', cents: 0 },
  { value: 'Extra Large', fee: 'Free', cents: 0 },
];

export default function NewParcelPage() {
  const navigate = useNavigate();
  const [stations, setStations] = useState([]);
  const [prefs, setPrefs] = useState([]);
  const [stationId, setStationId] = useState('');
  const [size, setSize] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/stations'), api.get('/preferences/stations')])
      .then(([s, p]) => { setStations(s.data); setPrefs(p.data.map(x => x.stationId)); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const togglePref = async (sid) => {
    if (prefs.includes(sid)) {
      await api.delete(`/preferences/stations/${sid}`);
      setPrefs(prev => prev.filter(x => x !== sid));
    } else {
      await api.post('/preferences/stations', { stationId: sid });
      setPrefs(prev => [...prev, sid]);
    }
  };

  const sorted = [...stations].sort((a, b) => (prefs.includes(a.id) ? 0 : 1) - (prefs.includes(b.id) ? 0 : 1));

  const handleSubmit = async () => {
    if (!stationId || !size) { setError('Please select a station and parcel size.'); return; }
    if (!agreedTerms) { setError('Please accept the Terms & Conditions to continue.'); return; }
    setError(''); setSubmitting(true);
    try {
      const { data } = await api.post('/parcels', { stationId, size });
      navigate('/parcels/success', { state: { parcel: data } });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit parcel request.');
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading stations..." />;
  const selectedStation = stations.find(s => s.id === stationId);

  return (
    <div className="container">
      <h1 className="page-title">Send a New Parcel</h1>
      <p className="page-subtitle">Choose a station and parcel size to submit your request</p>
      {error && <div className="error-msg mb-20">{error}</div>}

      {/* Step 1: Station */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ background: 'linear-gradient(135deg, #d05535, #b84a2e)', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>1</span>
          <h2 style={{ fontSize: 19, fontWeight: 700 }}>Choose a Station</h2>
        </div>
        <p className="help-text" style={{ marginBottom: 16 }}>Tap ★ to save a favourite station</p>
        {sorted.map(s => (
          <div key={s.id} onClick={() => setStationId(s.id)} style={{
            padding: '14px 16px', borderRadius: 12, marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s',
            border: stationId === s.id ? '2px solid #d05535' : '2px solid #e2e8f0',
            background: stationId === s.id ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' : '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 16, color: '#0f172a' }}>{s.name}</p>
              <p style={{ color: '#64748b', fontSize: 14 }}>{s.address}</p>
              {(s.phone || s.email) && (
                <p style={{ color: '#0369a1', fontSize: 13, marginTop: 4 }}>
                  {s.phone && <span>{s.phone}</span>}
                  {s.phone && s.email && <span> · </span>}
                  {s.email && <span>{s.email}</span>}
                </p>
              )}
            </div>
            <button onClick={(e) => { e.stopPropagation(); togglePref(s.id); }}
              style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: prefs.includes(s.id) ? '#f59e0b' : '#d1d5db', transition: 'color 0.2s' }}
              aria-label={prefs.includes(s.id) ? 'Remove from favourites' : 'Add to favourites'}>
              {prefs.includes(s.id) ? '★' : '☆'}
            </button>
          </div>
        ))}
      </div>

      {/* Step 2: Size */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ background: 'linear-gradient(135deg, #d05535, #b84a2e)', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>2</span>
          <h2 style={{ fontSize: 19, fontWeight: 700 }}>Choose Parcel Size</h2>
        </div>
        <p style={{ fontSize: 14, color: '#0369a1', cursor: 'pointer', marginBottom: 16, fontWeight: 600 }}
          onClick={() => setShowSizeGuide(true)}>
          📏 Check size guide
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {SIZES.map(s => (
            <div key={s.value} onClick={() => setSize(s.value)} style={{
              flex: '1 1 120px', padding: '18px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
              border: size === s.value ? '2px solid #d05535' : '2px solid #e2e8f0',
              background: size === s.value ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' : '#fff',
            }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      {stationId && size && (
        <div className="card card-gold">
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Order Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, marginBottom: 6 }}>
            <span style={{ color: '#64748b' }}>Station</span><strong>{selectedStation?.name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
            <span style={{ color: '#64748b' }}>Size</span><strong>{size}</strong>
          </div>
        </div>
      )}

      {/* Terms checkbox */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '16px 0 20px', padding: '0 4px' }}>
        <input type="checkbox" id="terms" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)}
          style={{ width: 20, height: 20, marginTop: 2, cursor: 'pointer', accentColor: '#d05535' }} />
        <label htmlFor="terms" style={{ fontSize: 15, color: '#475569', cursor: 'pointer' }}>
          I agree to the{' '}
          <Link to="/terms" target="_blank" style={{ color: '#d05535', fontWeight: 600, textDecoration: 'underline' }}>
            Terms & Conditions
          </Link>
        </label>
      </div>

      <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={submitting || !stationId || !size || !agreedTerms}
        style={{ fontSize: 18, padding: '16px 28px' }}>
        {submitting ? 'Submitting Request...' : 'Submit Parcel Request'}
      </button>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div onClick={() => setShowSizeGuide(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: 20, maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Size Guide</h2>
              <button onClick={() => setShowSizeGuide(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8', padding: 4 }}>✕</button>
            </div>
            <img src={sizeGuideImg} alt="Parcel Size Guide" style={{ width: '100%', borderRadius: 12 }} />
          </div>
        </div>
      )}
    </div>
  );
}
