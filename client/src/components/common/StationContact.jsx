export default function StationContact({ phone, email, style }) {
  if (!phone && !email) return null;
  const emailList = email ? email.split(',').map((item) => item.trim()).filter(Boolean) : [];

  return (
    <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd', fontSize: 14, color: '#0369a1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', wordBreak: 'break-word', overflowWrap: 'anywhere', ...style }}>
      <span style={{ fontWeight: 600 }}>Need help? Contact the station:</span>
      {phone && <span style={{ marginLeft: 8, whiteSpace: 'nowrap' }}><a href={`tel:${phone}`} style={{ color: '#0369a1', textDecoration: 'none', fontWeight: 600 }}>{phone}</a></span>}
      {phone && emailList.length > 0 && <span style={{ margin: '0 6px', color: '#93c5fd' }}>·</span>}
      {emailList.length > 0 && (
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0 6px', alignItems: 'center' }}>
          {emailList.map((address, index) => (
            <span key={address} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <a href={`mailto:${address}`} style={{ color: '#0369a1', textDecoration: 'none', fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{address}</a>
              {index < emailList.length - 1 && ','}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
