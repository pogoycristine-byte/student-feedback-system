import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, feedbackAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Clock, ChevronRight, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';

/* ─────────────────────────────────────────
   SHARP ANIMATED STAT ICONS
───────────────────────────────────────── */

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
        .clk-min { 
          animation: cw-minute 6s linear infinite;
          transform-origin: 22px 22px;
        }
        .clk-hr {
          animation: cw-hour 72s linear infinite;
          transform-origin: 22px 22px;
        }
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
        <line className="clk-hr"
          x1={cx} y1={cy}
          x2={cx} y2={cy - 9}
          stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeLinecap="round"/>
        <line className="clk-min"
          x1={cx} y1={cy}
          x2={cx} y2={cy - 14}
          stroke="white" strokeWidth="2" strokeLinecap="round"/>
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
      <polyline className="chk-line"
        points="12,22 19,30 33,13"
        stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  </div>
);

const IconStudents = () => (
  <div style={{ width: 46, height: 46, position: 'relative' }}>
    <style>{`
      @keyframes stu-back { 0%,100%{transform:translate(0,0)} 50%{transform:translate(3px,-1px)} }
      @keyframes stu-front { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-2px,0)} }
      @keyframes stu-plus { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
      .stu-back { animation: stu-back 3s ease-in-out infinite; }
      .stu-front { animation: stu-front 3s ease-in-out infinite; }
      .stu-plus { animation: stu-plus 2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
    `}</style>
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ position:'absolute', inset:0 }}>
      <g className="stu-back" style={{ opacity: 0.5 }}>
        <circle cx="30" cy="13" r="6.5" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
        <path d="M18 38 C18 30 42 30 42 38" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </g>
      <g className="stu-front">
        <circle cx="16" cy="14" r="7.5" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="2.5"/>
        <path d="M2 38 C2 28 30 28 30 38" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </g>
      <g className="stu-plus">
        <circle cx="36" cy="9" r="6" fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth="1.5"/>
        <line x1="36" y1="6" x2="36" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="33" y1="9" x2="39" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  </div>
);

/* ─────────────────────────────────────────
   DASHBOARD COMPONENT
───────────────────────────────────────── */

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [analytics, setAnalytics] = useState(null);
  const [allFeedback, setAllFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchFeedback();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({
        totalFeedback: 0,
        statusCounts: { Pending: 0, 'Under Review': 0, Resolved: 0, Rejected: 0 },
        resolutionRate: 0,
        averageResolutionTime: 0,
        totalStudents: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      const response = await feedbackAPI.getAll({});
      setAllFeedback(response.data.feedback || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  const { totalFeedback, statusCounts, resolutionRate, averageResolutionTime, totalStudents } = analytics || {};

  const statCards = [
    {
      label: 'Total Feedback',
      value: totalFeedback || 0,
      Icon: IconFeedback,
      cardGradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
      cardShadow: '0 8px 24px rgba(109,40,217,0.45)',
      navigateTo: '/feedback',
    },
    {
      label: 'Pending',
      value: statusCounts?.Pending || 0,
      Icon: IconPending,
      cardGradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
      cardShadow: '0 8px 24px rgba(245,158,11,0.45)',
      navigateTo: '/feedback?status=Pending',
    },
    {
      label: 'Resolved',
      value: statusCounts?.Resolved || 0,
      Icon: IconResolved,
      cardGradient: 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
      cardShadow: '0 8px 24px rgba(16,185,129,0.45)',
      navigateTo: '/feedback?status=Resolved',
    },
    {
      label: 'Total Students',
      value: totalStudents || 0,
      Icon: IconStudents,
      cardGradient: 'linear-gradient(135deg, #db2777 0%, #9d174d 100%)',
      cardShadow: '0 8px 24px rgba(236,72,153,0.45)',
      navigateTo: isAdmin ? '/students' : null,
    },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      Pending:        { bg: '#ea580c', text: '#ffffff' },
      'Under Review': { bg: '#3b82f6', text: '#ffffff' },
      Resolved:       { bg: '#10b981', text: '#ffffff' },
      Rejected:       { bg: '#ef4444', text: '#ffffff' },
    };
    const s = styles[status] || { bg: '#6b7280', text: '#ffffff' };
    return (
      <span className="inline-flex items-center justify-center w-28 py-1 rounded-full text-xs font-semibold"
        style={{ backgroundColor: s.bg, color: s.text }}>
        {status}
      </span>
    );
  };

  const displayedFeedback = viewAll ? allFeedback : allFeedback.slice(0, 5);
  const underReviewCount = statusCounts?.['Under Review'] || 0;
  const rejectedCount    = statusCounts?.Rejected || 0;
  const pendingCount     = statusCounts?.Pending || 0;
  const resolvedCount    = statusCounts?.Resolved || 0;
  const total            = totalFeedback || 1;

  const breakdown = [
    { label: 'Resolved',     count: resolvedCount,    color: 'bg-emerald-500', dot: '#10b981', pct: (resolvedCount / total) * 100 },
    { label: 'Under Review', count: underReviewCount, color: 'bg-blue-500',    dot: '#3b82f6', pct: (underReviewCount / total) * 100 },
    { label: 'Pending',      count: pendingCount,     color: 'bg-yellow-500',  dot: '#f59e0b', pct: (pendingCount / total) * 100 },
    { label: 'Rejected',     count: rejectedCount,    color: 'bg-red-500',     dot: '#ef4444', pct: (rejectedCount / total) * 100 },
  ];

  const categoryCounts = allFeedback.reduce((acc, item) => {
    const name = item.category?.name || 'Unknown';
    const icon = item.category?.icon || '📁';
    if (!acc[name]) acc[name] = { icon, count: 0 };
    acc[name].count += 1;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const urgentFeedback = allFeedback.filter(f => f.status === 'Pending').slice(0, 3);

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard Overview</h1>
          <p className="text-gray-400 text-sm">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2.5 border border-white/20 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-xs leading-tight">Resolution Rate</p>
              <p className="text-white font-bold text-sm">{resolutionRate}%</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2.5 border border-white/20 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-xs leading-tight">Avg Resolution</p>
              <p className="text-white font-bold text-sm">{averageResolutionTime} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, index) => {
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
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Feedback Status Breakdown Bar ── */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl px-5 py-4 border border-white/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">Feedback Status Breakdown</h3>
          <p className="text-gray-400 text-xs">Distribution of all {totalFeedback} submissions</p>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
          {breakdown.map((seg, i) =>
            seg.pct > 0 ? (
              <div key={i} className={`${seg.color} transition-all duration-500`} style={{ width: `${seg.pct}%` }} title={`${seg.label}: ${seg.count}`} />
            ) : null
          )}
        </div>
        <div className="flex gap-3">
          {breakdown.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-1.5 flex-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.dot }} />
              <div>
                <p className="text-xs font-semibold text-white">{seg.count}</p>
                <p className="text-[10px] leading-tight text-gray-400">{seg.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Categories + Needs Attention ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-white font-semibold text-base mb-1">Top Feedback Categories</h3>
          <p className="text-gray-400 text-sm mb-4">Most reported areas</p>
          {topCategories.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map(([name, { icon, count }], i) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{icon}</span>
                        <span className="text-sm font-medium text-gray-200">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{count} feedback</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff' }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded-md" style={{ background: 'linear-gradient(135deg,#f59e0b,#b45309)' }}>
              <AlertCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-white font-semibold text-base">Needs Attention</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">Oldest unresolved pending feedback</p>
          {urgentFeedback.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <p className="text-emerald-400 text-sm font-medium">All caught up!</p>
              <p className="text-gray-500 text-xs">No pending feedback right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentFeedback.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 rounded-lg p-3" style={{ border: '1px solid rgba(234,88,12,0.2)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{item.subject}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.student?.name} · {item.category?.icon} {item.category?.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{new Date(item.createdAt).toLocaleDateString('en-US')}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0" style={{ background: '#ea580c', color: '#fff' }}>
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent / All Feedback Table ── */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">{viewAll ? 'All Feedback' : 'Recent Feedback'}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {viewAll ? `Showing all ${allFeedback.length} submissions` : `Showing latest ${Math.min(5, allFeedback.length)} submissions`}
            </p>
          </div>
          <button onClick={() => setViewAll(!viewAll)}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
            {viewAll ? 'Show Less' : 'View All'}
            {!viewAll && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {allFeedback.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">No feedback yet</p>
            <p className="text-gray-500 text-sm mt-1">Submissions will appear here</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {displayedFeedback.map((item) => (
                <tr key={item._id} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg,#6D28D9,#BE185D)' }}>
                        {item.student?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium">{item.student?.name}</div>
                        <div className="text-gray-400 text-xs">{item.student?.studentId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white max-w-[180px] truncate">{item.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{item.category?.icon} {item.category?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(item.createdAt).toLocaleDateString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default Dashboard;