import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

const LOGO = 'https://mtsc.ca/wp-content/uploads/2025/09/seafarers-logo.png.webp';

const seafarerLinks = [
  { to: '/dashboard', label: 'My Parcels' },
  { to: '/parcels/new', label: 'New Parcel' },
  { to: '/past-pickups', label: 'History' },
];
const staffLinks = [
  { to: '/staff/dashboard', label: 'Dashboard' },
  { to: '/staff/completed', label: 'Completed' },
  { to: '/staff/reports', label: 'Reports' },
];

export default function Navbar() {
  const { user, logout, isSeafarer, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [stations, setStations] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/stations').then(res => setStations(res.data)).catch(console.error);
    }
  }, [isAdmin]);

  const handleLogout = () => {
    const isStaffOrAdmin = isStaff || isAdmin;
    logout();
    navigate(isStaffOrAdmin ? '/staff/login' : '/login');
    setOpen(false);
  };

  const handleStationChange = (e) => {
    const stationId = e.target.value;
    const station = stations.find(s => s.id === stationId);
    if (station) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      userData.stationId = station.id;
      userData.stationName = station.name;
      localStorage.setItem('user', JSON.stringify(userData));
      window.location.reload(); // Reload to refresh all data for new station
    }
  };

  const links = isSeafarer ? seafarerLinks : (isStaff || isAdmin) ? staffLinks : [];
  const isActive = (to) => location.pathname === to;

  if (!user) return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to="/login" style={styles.brand}>
          <img src={LOGO} alt="MTSC" style={styles.logo} />
          <span style={styles.brandText}>Parcel Pickup</span>
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.inner}>
          <Link to={isStaff ? '/staff/dashboard' : '/dashboard'} style={styles.brand}>
            <img src={LOGO} alt="MTSC" style={styles.logo} />
            <span style={styles.brandText}>Parcel Pickup</span>
          </Link>

          {/* Desktop links */}
          <div className="nav-desktop" style={styles.desktopLinks}>
            {isAdmin && stations.length > 0 && (
              <div style={styles.stationWrapper}>
                <span style={styles.stationLabel}>Station:</span>
                <select
                  onChange={handleStationChange}
                  value={user?.stationId}
                  style={styles.stationSelect}
                >
                  {stations.map(s => (
                    <option key={s.id} value={s.id} style={styles.option}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {links.map(l => (
              <Link key={l.to} to={l.to} style={{ ...styles.link, ...(isActive(l.to) ? styles.linkActive : {}) }}>
                {l.label}
              </Link>
            ))}
            <div style={styles.divider} />
            <button 
              onClick={handleLogout} 
              style={{ 
                ...styles.logoutBtn, 
                ...(isAdmin ? { ...styles.adminLogoutBtn, width: '80px' } : {}) 
              }}
            >
              Log Out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="nav-hamburger" onClick={() => setOpen(!open)} style={styles.hamburger} aria-label="Menu">
            <span style={{ ...styles.bar, transform: open ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <span style={{ ...styles.bar, opacity: open ? 0 : 1 }} />
            <span style={{ ...styles.bar, transform: open ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="nav-mobile-menu" style={styles.mobileMenu}>
          {isAdmin && stations.length > 0 && (
            <div style={styles.mobileStationWrapper}>
              <span style={styles.mobileStationLabel}>Switch Station:</span>
              <select
                onChange={handleStationChange}
                value={user?.stationId}
                style={styles.mobileStationSelect}
              >
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              style={{ ...styles.mobileLink, ...(isActive(l.to) ? styles.mobileLinkActive : {}) }}>
              {l.label}
            </Link>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <button 
            onClick={handleLogout} 
            style={{ 
              ...styles.mobileLogout, 
              ...(isAdmin ? { ...styles.adminLogoutBtn, width: '100%', marginTop: 10 } : {}) 
            }}
          >
            Log Out
          </button>
        </div>
      )}
    </>
  );
}

const styles = {
  nav: {
    background: '#0f2744',
    padding: '0 20px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  inner: {
    maxWidth: 820,
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  brand: {
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logo: { height: 34, borderRadius: 4 },
  brandText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
  },
  desktopLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  link: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 6,
    textDecoration: 'none',
    transition: 'color 0.15s',
  },
  linkActive: {
    color: '#ffffff',
    background: 'rgba(255,255,255,0.1)',
  },
  divider: {
    width: 1,
    height: 20,
    background: 'rgba(255,255,255,0.15)',
    margin: '0 8px',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.7)',
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  hamburger: {
    flexDirection: 'column',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
  },
  bar: {
    display: 'block',
    width: 20,
    height: 2,
    background: '#fff',
    borderRadius: 1,
    transition: 'all 0.2s',
  },
  mobileMenu: {
    position: 'fixed',
    top: 60,
    left: 0,
    right: 0,
    background: '#0f2744',
    padding: '8px 16px 16px',
    zIndex: 99,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  mobileLink: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: 500,
    padding: '12px 12px',
    borderRadius: 8,
    textDecoration: 'none',
    display: 'block',
  },
  mobileLinkActive: {
    color: '#ffffff',
    background: 'rgba(255,255,255,0.1)',
  },
  mobileLogout: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: 500,
    padding: '12px 12px',
    textAlign: 'left',
    borderRadius: 8,
  },
  stationWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
    background: 'rgba(255,255,255,0.05)',
    padding: '4px 10px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  stationLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  stationSelect: {
    background: 'none',
    color: '#fff',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
    padding: '2px 0',
  },
  option: {
    background: '#0f2744',
    color: '#fff',
  },
  mobileStationWrapper: {
    padding: '12px',
    marginBottom: 8,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  mobileStationLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  mobileStationSelect: {
    background: '#1a3a5f',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '10px',
    borderRadius: 8,
    fontSize: 15,
    outline: 'none',
  },
  adminLogoutBtn: {
    color: '#fff',
    fontWeight: 700,
  },
};
