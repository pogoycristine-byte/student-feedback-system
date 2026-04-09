import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI, feedbackAPI } from '../services/api';
import { BarChart2 } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';

/* ── Animated Icons (same as Dashboard) ── */
const IconFeedback = () => (
  <div style={{ width: 46, height: 46, position: 'relative' }}>
    <style>{`
      @keyframes fb-rise { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      @keyframes fb-d1 { 0%,100%{opacity:0.25;transform:scale(0.8)} 25%{opacity:1;transform:scale(1)} }
      @keyframes fb-d2 { 0%,100%{opacity:0.25;transform:scale(0.8)} 45%{opacity:1;transform:scale(1)} }
      @keyframes fb-d3 { 0%,100%{opacity:0.25;transform:scale(0.8)} 65%{opacity:1;transform:scale(1)} }
      .fb-float { animation: fb-rise 2.8s ease-in-out infinite; }
      .fb-d1 { animation: fb-d1 1.6s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
      .fb-d2 { animation: fb-d2 1.6s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
      .fb-d3 { animation: fb-d3 1.6s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
    `}</style>
    <div className="fb-float" style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <path d="M4 10 C4 6.7 6.7 4 10 4 H34 C37.3 4 40 6.7 40 10 V26 C40 29.3 37.3 32 34 32 H16 L8 40 V32 H10 C6.7 32 4 29.3 4 26 Z"
          fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <circle className="fb-d1" cx="15" cy="18" r="3" fill="white"/>
        <circle className="fb-d2" cx="22" cy="18" r="3" fill="white"/>
        <circle className="fb-d3" cx="29" cy="18" r="3" fill="white"/>
      </svg>
    </div>
  </div>
);

const IconPending = () => {
  const cx = 22, cy = 22;
  return (
    <div style={{ width: 46, height: 46, position: 'relative' }}>
      <style>{`
        @keyframes cw-minute { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes cw-hour   { from{transform:rotate(60deg)} to{transform:rotate(420deg)} }
        .clk-min { animation: cw-minute 6s linear infinite; transform-origin: 22px 22px; }
        .clk-hr  { animation: cw-hour 72s linear infinite; transform-origin: 22px 22px; }
        @keyframes clk-glow { 0%,100%{opacity:1} 50%{opacity:0.7} }
        .clk-ring { animation: clk-glow 2s ease-in-out infinite; }
      `}</style>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ position:'absolute', inset:0 }}>
        <circle className="clk-ring" cx={cx} cy={cy} r="18" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2.5"/>
        <circle cx={cx} cy={cy} r="13" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        {[0, 90, 180, 270].map((deg, i) => {
          const rad = (deg - 90) * Math.PI / 180;
          return (
            <line key={i}
              x1={cx + 14 * Math.cos(rad)} y1={cy + 14 * Math.sin(rad)}
              x2={cx + 18 * Math.cos(rad)} y2={cy + 18 * Math.sin(rad)}
              stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"/>
          );
        })}
        <line className="clk-hr" x1={cx} y1={cy} x2={cx} y2={cy - 9} stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeLinecap="round"/>
        <line className="clk-min" x1={cx} y1={cy} x2={cx} y2={cy - 14} stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="3" fill="white"/>
        <circle cx={cx} cy={cy} r="1.2" fill="rgba(255,200,100,0.9)"/>
      </svg>
    </div>
  );
};

const IconResolved = () => (
  <div style={{ width: 46, height: 46, position: 'relative' }}>
    <style>{`
      @keyframes chk-draw { from{stroke-dashoffset:36} to{stroke-dashoffset:0} }
      @keyframes chk-ring { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:0.85} }
      .chk-outer { animation: chk-ring 2.4s ease-in-out infinite; transform-origin:22px 22px; }
      .chk-line { stroke-dasharray:36; animation: chk-draw 0.6s cubic-bezier(0.4,0,0.2,1) 0.1s forwards; }
    `}</style>
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ position:'absolute', inset:0 }}>
      <circle className="chk-outer" cx="22" cy="22" r="18" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2.5"/>
      <circle cx="22" cy="22" r="12" fill="rgba(255,255,255,0.12)"/>
      <polyline className="chk-line" points="12,22 19,30 33,13" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  </div>
);

const IconRate = () => (
  <div style={{ width: 46, height: 46, position: 'relative' }}>
    <style>{`
      @keyframes rate-rise { 0%{transform:translateY(4px);opacity:0} 100%{transform:translateY(0);opacity:1} }
      @keyframes rate-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      .rate-arrow { animation: rate-pulse 2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
    `}</style>
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ position:'absolute', inset:0 }}>
      <circle cx="22" cy="22" r="18" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2.5"/>
      <polyline className="rate-arrow" points="10,30 18,20 24,25 34,13" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polyline points="28,13 34,13 34,19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  </div>
);

/* ── Animated counter ── */
const AnimatedNumber = ({ value, suffix = '' }) => {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let start = 0;
    const end = Number(value);
    if (end === 0) { setDisplay(0); return; }
    const step = end / (1000 / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}{suffix}</>;
};

/* ── Custom colorful radar dot ── */
const CustomRadarDot = (props) => {
  const { cx, cy, index } = props;
  const DOT_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
  const color = DOT_COLORS[index % DOT_COLORS.length];
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={color} stroke="#0f0a1a" strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      <circle cx={cx} cy={cy} r={3} fill="white" />
    </g>
  );
};

/* ── Radar tooltip ── */
const RadarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(15,10,26,0.95)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 10, padding: '8px 14px' }}>
        <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>{payload[0]?.payload?.category}</p>
        <p style={{ color: '#a78bfa', fontSize: 12 }}>{payload[0]?.value} submissions</p>
      </div>
    );
  }
  return null;
};

/* ── Stepped Timeline ── */
const SteppedTimeline = ({ data }) => {
  const [widths, setWidths] = React.useState(data.map(() => 0));
  React.useEffect(() => {
    const t = setTimeout(() => setWidths(data.map(d => d.pct)), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      <div className="timeline-vline" style={{
        position: 'absolute', left: 16, top: 20, bottom: 20,
        width: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2
      }} />
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: i < data.length - 1 ? 24 : 0, position: 'relative' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0, zIndex: 1,
            background: `${d.color}22`, border: `2px solid ${d.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 12px ${d.color}55`
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
              <span className="timeline-status-label" style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{d.label}</span>
              <span className="timeline-status-value" style={{ color: 'white', fontSize: 16, fontWeight: 800, marginLeft: 8 }}>{d.value}</span>
            </div>
            <div className="timeline-track" style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${widths[i]}%`,
                background: `linear-gradient(90deg, ${d.color}, ${d.color}88)`,
                boxShadow: `0 0 10px ${d.color}66`,
                transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                transitionDelay: `${i * 0.15}s`
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3, gap: 4, alignItems: 'center' }}>
              <span className="timeline-pct-label" style={{ color: d.color, fontSize: 11, fontWeight: 600 }}>{d.pct.toFixed(0)}%</span>
              <span className="timeline-pct-label" style={{ color: '#6b7280', fontSize: 10 }}>of total</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
const STATUS_COLORS = { Pending: '#F59E0B', 'Under Review': '#3B82F6', Resolved: '#10B981', Rejected: '#EF4444' };

const ReportsAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Rating stats state ──
  const [ratingStats, setRatingStats] = useState({
    averageRating: 0,
    totalRated: 0,
    totalResolved: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    ratedList: [],
  });

  useEffect(() => {
    fetchAnalytics();
    fetchRatingStats();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch all resolved feedback and compute rating stats client-side ──
  const fetchRatingStats = async () => {
    try {
      const response = await feedbackAPI.getAll({ status: 'Resolved' });
      const resolved = response.data.feedback || [];
      const rated = resolved.filter(f => f.satisfactionRating);
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      rated.forEach(f => { distribution[f.satisfactionRating] = (distribution[f.satisfactionRating] || 0) + 1; });
      const avg = rated.length > 0
        ? (rated.reduce((sum, f) => sum + f.satisfactionRating, 0) / rated.length)
        : 0;
      setRatingStats({
        averageRating: avg,
        totalRated: rated.length,
        totalResolved: resolved.length,
        distribution,
        ratedList: rated, // full list for detailed breakdown
      });
    } catch (error) {
      console.error('Error fetching rating stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-gray-400 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const { totalFeedback, statusCounts, feedbackByCategory, resolutionRate, averageResolutionTime } = analytics || {};

  const metrics = [
    { label: 'Total Feedback',      value: totalFeedback || 0,         suffix: '',   Icon: IconFeedback, cardGradient: 'linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%)', cardShadow: '0 8px 24px rgba(109,40,217,0.45)', desc: 'All submissions to date',   navigateTo: '/feedback' },
    { label: 'Pending Feedback',    value: statusCounts?.Pending || 0, suffix: '',   Icon: IconPending,  cardGradient: 'linear-gradient(135deg,#f59e0b 0%,#b45309 100%)', cardShadow: '0 8px 24px rgba(245,158,11,0.45)',  desc: 'Awaiting admin review',     navigateTo: '/feedback?status=Pending' },
    { label: 'Resolved',            value: statusCounts?.Resolved || 0,suffix: '',   Icon: IconResolved, cardGradient: 'linear-gradient(135deg,#059669 0%,#065f46 100%)', cardShadow: '0 8px 24px rgba(16,185,129,0.45)',  desc: 'Successfully closed',       navigateTo: '/feedback?status=Resolved' },
    { label: 'Resolution Rate',     value: resolutionRate || 0,        suffix: '%',  Icon: IconRate,     cardGradient: 'linear-gradient(135deg,#db2777 0%,#9d174d 100%)', cardShadow: '0 8px 24px rgba(236,72,153,0.45)',  desc: 'Of all feedback resolved',  navigateTo: null },
  ];

  const radarData = (feedbackByCategory || []).map(cat => ({
    category: cat.categoryName,
    count: cat.count,
  }));

  const statusRaw = [
    { label: 'Pending',      value: statusCounts?.Pending || 0,          color: STATUS_COLORS['Pending'] },
    { label: 'Under Review', value: statusCounts?.['Under Review'] || 0, color: STATUS_COLORS['Under Review'] },
    { label: 'Resolved',     value: statusCounts?.Resolved || 0,         color: STATUS_COLORS['Resolved'] },
    { label: 'Rejected',     value: statusCounts?.Rejected || 0,         color: STATUS_COLORS['Rejected'] },
  ];
  const totalStatus = statusRaw.reduce((s, d) => s + d.value, 0) || 1;
  const timelineData = statusRaw.map(d => ({ ...d, pct: (d.value / totalStatus) * 100 }));

  const ratingLabels = { 1: 'Very Unsatisfied', 2: 'Unsatisfied', 3: 'Neutral', 4: 'Satisfied', 5: 'Very Satisfied' };
  const ratingColors = { 1: '#EF4444', 2: '#F97316', 3: '#F59E0B', 4: '#10B981', 5: '#059669' };
  const ratingPct = (n) => ratingStats.totalRated > 0 ? ((ratingStats.distribution[n] || 0) / ratingStats.totalRated) * 100 : 0;

  return (
    <div className="p-6 space-y-6 reports-page">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
         
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Key metrics and feedback breakdown at a glance.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <BarChart2 className="w-4 h-4 text-violet-400" />
          Live data
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((stat, index) => {
          const { Icon } = stat;
          return (
            <div
              key={index}
              onClick={() => stat.navigateTo && navigate(stat.navigateTo)}
              className="rounded-xl px-5 py-5 transition-all duration-200 hover:-translate-y-1 relative overflow-hidden"
              style={{
                background: stat.cardGradient,
                boxShadow: stat.cardShadow,
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: stat.navigateTo ? 'pointer' : 'default',
              }}
            >
              <div className="absolute top-4 right-4">
                <Icon />
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.72rem', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {stat.label}
                </p>
                <p style={{ color: '#ffffff', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', marginTop: '4px' }}>{stat.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Radar / Spider Chart ── */}
        <div className="reports-chart-card rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-white font-bold text-base mb-1">Feedback by Category</h2>
          <p className="text-gray-500 text-xs mb-4">Radar coverage across all categories</p>
          {radarData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} tickLine={false} />
                  <PolarRadiusAxis angle={90} tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                  <Radar name="Submissions" dataKey="count" stroke="#8B5CF6" strokeWidth={3.5} fill="rgba(139,92,246,0.18)" fillOpacity={1} dot={<CustomRadarDot />} activeDot={{ r: 9, fill: '#EC4899', stroke: '#0f0a1a', strokeWidth: 2 }} />
                  <Tooltip content={<RadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {radarData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length], boxShadow: `0 0 5px ${COLORS[i % COLORS.length]}` }} />
                    <span className="legend-dot-label text-gray-400 text-xs">{d.category}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-600 text-sm">No category data available</div>
          )}
        </div>

        {/* ── Stepped Timeline ── */}
        <div className="reports-chart-card rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-white font-bold text-base mb-1">Status Distribution</h2>
          <p className="text-gray-500 text-xs mb-6">Feedback breakdown by current status</p>
          {timelineData.some(d => d.value > 0) ? (
            <>
              <SteppedTimeline data={timelineData} />
              <div className="timeline-total mt-6 flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-gray-400 text-sm">Total submissions</span>
                <span className="text-white text-xl font-black">{statusRaw.reduce((s, d) => s + d.value, 0)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm">No status data available</div>
          )}
        </div>
      </div>

      {/* ── SATISFACTION RATING SECTION ── */}
      <div className="reports-chart-card rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div>
            <h2 className="text-white font-bold">Student Satisfaction Ratings</h2>
            <p className="text-gray-500 text-xs mt-0.5">Based on resolved feedback rated by students</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-yellow-400 font-bold text-sm">{ratingStats.totalRated}</span> of
            <span className="text-white font-bold text-sm">{ratingStats.totalResolved}</span> resolved rated
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Average score */}
          <div className="flex flex-col items-center justify-center rounded-xl p-6"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Average Rating</p>
            <p className="text-white font-black mb-1" style={{ fontSize: '3.5rem', lineHeight: 1 }}>
              {ratingStats.averageRating > 0 ? ratingStats.averageRating.toFixed(1) : '—'}
            </p>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill={i <= Math.round(ratingStats.averageRating) ? '#FBBF24' : 'none'} stroke="#FBBF24" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <p className="text-gray-500 text-xs text-center">
              {ratingStats.totalRated > 0
                ? `${ratingLabels[Math.round(ratingStats.averageRating)] || ''}`
                : 'No ratings yet'}
            </p>
          </div>

          {/* Rating distribution bars */}
          <div className="lg:col-span-2 flex flex-col justify-center gap-3">
            {[5, 4, 3, 2, 1].map(n => {
              const count = ratingStats.distribution[n] || 0;
              const pct = ratingPct(n);
              return (
                <div key={n} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-24 shrink-0">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i <= n ? ratingColors[n] : 'none'} stroke={ratingColors[n]} strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs font-medium shrink-0 w-28" style={{ color: ratingColors[n] }}>
                    {ratingLabels[n]}
                  </span>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: ratingColors[n], boxShadow: `0 0 8px ${ratingColors[n]}66` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-16 shrink-0">
                    <span className="text-white font-bold text-sm tabular-nums">{count}</span>
                    <span className="text-gray-600 text-xs tabular-nums">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Detailed student breakdown ── */}
        {ratingStats.ratedList && ratingStats.ratedList.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3 px-1">Individual Ratings</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[...ratingStats.ratedList]
                .sort((a, b) => b.satisfactionRating - a.satisfactionRating)
                .map((f, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="13" height="13" viewBox="0 0 24 24"
                          fill={s <= f.satisfactionRating ? ratingColors[f.satisfactionRating] : 'none'}
                          stroke={ratingColors[f.satisfactionRating]} strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    {/* Rating label */}
                    <span className="text-xs font-semibold shrink-0 w-28" style={{ color: ratingColors[f.satisfactionRating] }}>
                      {ratingLabels[f.satisfactionRating]}
                    </span>
                    {/* Student name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{f.student?.name || 'Unknown'}</p>
                      <p className="text-gray-500 text-xs truncate">{f.subject}</p>
                    </div>
                    {/* Comment if any */}
                    {f.satisfactionComment && (
                      <p className="text-gray-400 text-xs italic truncate max-w-[200px] shrink-0">
                        "{f.satisfactionComment}"
                      </p>
                    )}
                    {/* Date */}
                    {f.ratedAt && (
                      <span className="text-gray-600 text-xs shrink-0 tabular-nums">
                        {new Date(f.ratedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* ── END SATISFACTION RATING SECTION ── */}

      {/* Category Breakdown Table */}
      <div className="reports-chart-card rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div>
            <h2 className="text-white font-bold">Category Breakdown</h2>
            <p className="text-gray-500 text-xs mt-0.5">Detailed count per feedback category</p>
          </div>
          <span className="text-xs text-gray-500 tabular-nums">{totalFeedback} total</span>
        </div>
        {feedbackByCategory && feedbackByCategory.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Category', 'Submissions', 'Share'].map(h => (
                  <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {feedbackByCategory.map((cat, i) => {
                const share = totalFeedback ? ((cat.count / totalFeedback) * 100).toFixed(1) : 0;
                const color = COLORS[i % COLORS.length];
                return (
                  <tr key={i} className="hover:bg-white/[0.03] transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="cat-icon-box w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                        </div>
                        <span className="text-white font-medium text-sm">{cat.categoryName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-bold text-lg">{cat.count}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="share-bar-track flex-1 max-w-[140px] h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${share}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                        </div>
                        <span className="text-gray-400 text-sm font-semibold tabular-nums w-10">{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-14 text-center text-gray-600 text-sm">No category data available</div>
        )}
      </div>

    </div>
  );
};

export default ReportsAnalytics;