import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/station/reports?month=${month}&year=${year}`)
      .then(({ data }) => setReport(data)).catch(() => {}).finally(() => setLoading(false));
  }, [month, year]);

  const downloadPDF = async () => {
    try {
      const { data } = await api.get(`/station/reports/pdf?month=${month}&year=${year}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = `report-${MONTHS[month-1]}-${year}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const chartData = report ? {
    labels: ['Small', 'Medium', 'Large', 'Extra Large'],
    datasets: [{
      label: 'Parcels',
      data: [report.breakdown.Small.count, report.breakdown.Medium.count, report.breakdown.Large.count, report.breakdown['Extra Large'].count],
      backgroundColor: ['#d05535', '#f59e0b', '#1e3a5f', '#2A7B88'],
      borderRadius: 8, barPercentage: 0.6,
    }],
  } : null;

  return (
    <div className="container">
      <h1 className="page-title">Parcel Reports</h1>
      <p className="page-subtitle">Monthly parcel volume breakdown</p>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <select value={month} onChange={e => setMonth(+e.target.value)}
            style={{ padding: '12px 14px', fontSize: 16, border: '2px solid #e2e8f0', borderRadius: 10, flex: 1, minWidth: 160, background: '#f8fafc' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)}
            style={{ padding: '12px 14px', fontSize: 16, border: '2px solid #e2e8f0', borderRadius: 10, minWidth: 100, background: '#f8fafc' }}>
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {loading ? <LoadingSpinner text="Loading report..." /> : report && (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #bae6fd', borderRadius: 14 }}>
                <p className="stat-value">{report.totalCount}</p>
                <p className="stat-label">Total Parcels</p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', marginBottom: 28, fontSize: 16 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Size</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parcels</th>
                </tr>
              </thead>
              <tbody>
                {['Small', 'Medium', 'Large', 'Extra Large'].map(s => (
                  <tr key={s} style={{ background: '#f8fafc', borderRadius: 8 }}>
                    <td style={{ padding: '12px', fontWeight: 600, borderRadius: '8px 0 0 8px' }}>{s}</td>
                    <td style={{ textAlign: 'right', padding: '12px', borderRadius: '0 8px 8px 0' }}>{report.breakdown[s].count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {chartData && (
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 14 }}>
                <Bar data={chartData} options={{
                  responsive: true,
                  plugins: { legend: { display: false }, title: { display: true, text: `${MONTHS[month - 1]} ${year}`, font: { size: 16, weight: '600' }, color: '#0f172a' } },
                  scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' } }, x: { grid: { display: false }, ticks: { font: { weight: '600' } } } },
                }} />
              </div>
            )}

            <button className="btn btn-primary mt-20" onClick={downloadPDF} style={{ width: '100%' }}>
              Download Report as PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
}
