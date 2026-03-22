import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { Search, Eye, UserCheck, UserX, Trash2, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';

const TABS = ['Students', 'Staff', 'Admin'];

const TAB_ROLE_MAP = {
  Students: 'student',
  Staff: 'staff',
  Admin: 'admin',
};

const TAB_ICONS = {
  Students: '🎓',
  Staff: '👤',
  Admin: '👑',
};

const STATUS_MAP = {
  Pending:        { bar: 'from-yellow-500 to-orange-500', bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  'Under Review': { bar: 'from-blue-500 to-cyan-500',     bg: 'bg-blue-500/20',   text: 'text-blue-300' },
  Resolved:       { bar: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/20',text: 'text-emerald-300' },
  Rejected:       { bar: 'from-red-500 to-rose-500',      bg: 'bg-red-500/20',    text: 'text-red-300' },
};

const COLUMNS = {
  Students: ['Name', 'Student ID', 'Email', 'Year / Section', 'Status', 'Actions'],
  Staff:    ['Name', 'Staff ID',   'Email', 'Last Login',     'Status', 'Actions'],
  Admin:    ['Name', 'Email',      'Last Login',              'Status', 'Actions'],
};

// ── Pagination config ──
const ITEMS_PER_PAGE = 10;

const formatLastLogin = (dateStr) => {
  if (!dateStr) return { label: 'Never', color: 'text-gray-600', dot: 'bg-gray-600', time: null };

  const date     = new Date(dateStr);
  const now      = new Date();
  const diffMins = Math.floor((now - date) / (1000 * 60));
  const diffHrs  = Math.floor((now - date) / (1000 * 60 * 60));
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  let label, color, dot;

  if (diffMins < 5) {
    label = 'Just now';        color = 'text-emerald-400'; dot = 'bg-emerald-400';
  } else if (diffMins < 60) {
    label = `${diffMins}m ago`; color = 'text-emerald-400'; dot = 'bg-emerald-400';
  } else if (diffHrs < 24) {
    label = `${diffHrs}h ago`;  color = 'text-blue-400';    dot = 'bg-blue-400';
  } else if (diffDays === 1) {
    label = 'Yesterday';        color = 'text-yellow-400';  dot = 'bg-yellow-400';
  } else if (diffDays < 7) {
    label = `${diffDays} days ago`; color = 'text-yellow-400'; dot = 'bg-yellow-400';
  } else {
    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    color = 'text-gray-400'; dot = 'bg-gray-500';
  }

  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return { label, color, dot, time };
};

const Students = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Students');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ── Pagination state ──
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { fetchAllUsers(); }, []);

  // ── Reset to page 1 when tab or search changes ──
  useEffect(() => { setSearchTerm(''); setCurrentPage(1); }, [activeTab]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const fetchAllUsers = async () => {
    try {
      const [studentsRes, staffRes, adminRes] = await Promise.all([
        userAPI.getAll({ role: 'student' }),
        userAPI.getAll({ role: 'staff' }),
        userAPI.getAll({ role: 'admin' }),
      ]);
      const students = (studentsRes.data.users || []).map(u => ({ ...u, role: 'student' }));
      const staff    = (staffRes.data.users   || []).map(u => ({ ...u, role: 'staff' }));
      const admins   = (adminRes.data.users   || []).map(u => ({ ...u, role: 'admin' }));
      setAllUsers([...students, ...staff, ...admins]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (user) => {
    try {
      const response = await userAPI.getById(user._id);
      setSelectedUser(response.data);
      setShowModal(true);
    } catch (error) {
      alert('Failed to load user details');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await userAPI.toggleStatus(id);
      fetchAllUsers();
      alert('User status updated!');
    } catch (error) {
      alert('Failed to update user status');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userAPI.delete(id);
        fetchAllUsers();
        alert('User deleted successfully!');
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const usersForTab   = allUsers.filter(u => u.role === TAB_ROLE_MAP[activeTab]);
  const filteredUsers = usersForTab.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Pagination calculations ──
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const activeCount   = usersForTab.filter(u => u.isActive).length;
  const inactiveCount = usersForTab.length - activeCount;

  const tabCounts = {
    Students: allUsers.filter(u => u.role === 'student').length,
    Staff:    allUsers.filter(u => u.role === 'staff').length,
    Admin:    allUsers.filter(u => u.role === 'admin').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-gray-400 text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <style>{`.users-search-input::placeholder { color: #1e1b4b !important; opacity: 0.5 !important; }`}</style>

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-1">Admin Panel</p>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage all users — students, staff, and admins.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-300 font-semibold">{activeCount}</span>
            <span className="text-gray-500">active</span>
          </div>
          <div className="flex items-center gap-2 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-red-300 font-semibold">{inactiveCount}</span>
            <span className="text-gray-500">inactive</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white border-transparent shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{TAB_ICONS[tab]}</span>
              <span>{tab}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-500'
              }`}>
                {tabCounts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: '#1e1b4b' }} />
        <input
          type="text"
          placeholder={`Search ${activeTab.toLowerCase()} by name, ID, or email...`}
          className="w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all users-search-input"
          style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(196,181,253,0.5)', color: '#1e1b4b' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: '#6b7280' }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Results count ── */}
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-xs">
          Showing{' '}
          <span className="text-white font-semibold">
            {filteredUsers.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredUsers.length)}
          </span>
          {' '}of{' '}
          <span className="text-white font-semibold">{filteredUsers.length}</span> {activeTab.toLowerCase()}
        </p>
        {totalPages > 1 && (
          <p className="text-gray-600 text-xs">Page {safeCurrentPage} of {totalPages}</p>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '2px solid rgba(0,0,0,0.3)' }}>
              {COLUMNS[activeTab].map(h => (
                <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS[activeTab].length} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-medium">No {activeTab.toLowerCase()} found</p>
                    <p className="text-gray-600 text-sm">Try a different search term</p>
                  </div>
                </td>
              </tr>
            ) : paginatedUsers.map((user) => {
              const login = formatLastLogin(user.lastLogin);
              return (
                <tr key={user._id} className="group hover:bg-white/[0.04] transition-all" style={{ borderBottom: '1px solid rgba(0,0,0,0.25)' }}>

                  {/* Name — all tabs, no avatar */}
                  <td className="px-6 py-4">
                    <p className="text-white text-sm font-semibold">{user.name}</p>
                  </td>

                  {/* Student ID / Staff ID — Students & Staff only */}
                  {(activeTab === 'Students' || activeTab === 'Staff') && (
                    <td className="px-6 py-4">
                      <span className="text-gray-300 text-sm font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        {user.studentId || '—'}
                      </span>
                    </td>
                  )}

                  {/* Email — all tabs */}
                  <td className="px-6 py-4">
                    <span className="text-gray-400 text-sm">{user.email}</span>
                  </td>

                  {/* Year / Section — Students only */}
                  {activeTab === 'Students' && (
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm">{user.yearLevel} — {user.section}</span>
                    </td>
                  )}

                  {/* Last Login — Staff & Admin only */}
                  {(activeTab === 'Staff' || activeTab === 'Admin') && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${login.dot}`} />
                        <div>
                          <p className={`text-sm font-semibold ${login.color}`}>{login.label}</p>
                          {login.time && user.lastLogin && (
                            <p className="text-gray-600 text-xs mt-0.5">{login.time}</p>
                          )}
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Status — all tabs */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      user.isActive
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-500/15 text-red-300 border-red-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions — all tabs */}
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      <button onClick={() => handleViewDetails(user)} title="View Details"
                        className="p-2 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500 border border-blue-500/30 hover:border-blue-500 transition-all">
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user._id)}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-lg border transition-all ${
                          user.isActive
                            ? 'text-orange-400 hover:text-white hover:bg-orange-500 border-orange-500/30 hover:border-orange-500'
                            : 'text-emerald-400 hover:text-white hover:bg-emerald-500 border-emerald-500/30 hover:border-emerald-500'
                        }`}
                      >
                        {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      <button onClick={() => handleDelete(user._id)} title="Delete"
                        className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 hover:border-red-500 transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-gray-500 text-xs">
            {filteredUsers.length} total · {ITEMS_PER_PAGE} per page
          </p>
          <div className="flex items-center gap-1.5">
            {/* Prev */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page, idx) =>
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-2 text-gray-600 text-sm select-none">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-all ${
                    safeCurrentPage === page
                      ? 'text-white border-transparent'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                  style={safeCurrentPage === page ? { background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 2px 12px rgba(124,58,237,0.4)' } : {}}
                >
                  {page}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(145deg, #1a1025, #0f0a1a)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(109,40,217,0.2)' }}>

            {/* Modal Header — no avatar */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedUser.user?.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-gray-500 text-xs font-mono">{selectedUser.user?.studentId || selectedUser.user?.email}</p>
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full capitalize">
                    {selectedUser.user?.role}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Full Name', value: selectedUser.user?.name },
                  { label: 'Role',      value: selectedUser.user?.role },
                  { label: 'Email',     value: selectedUser.user?.email },
                  { label: 'Phone',     value: selectedUser.user?.phoneNumber },
                  ...(selectedUser.user?.role === 'student' ? [
                    { label: 'Student ID', value: selectedUser.user?.studentId },
                    { label: 'Year Level', value: selectedUser.user?.yearLevel },
                    { label: 'Section',    value: selectedUser.user?.section },
                  ] : []),
                  ...(selectedUser.user?.role === 'staff' ? [
                    { label: 'Staff ID',   value: selectedUser.user?.studentId },
                    { label: 'Last Login', value: selectedUser.user?.lastLogin
                        ? new Date(selectedUser.user.lastLogin).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Never logged in' },
                  ] : []),
                  ...(selectedUser.user?.role === 'admin' ? [
                    { label: 'Last Login', value: selectedUser.user?.lastLogin
                        ? new Date(selectedUser.user.lastLogin).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Never logged in' },
                  ] : []),
                ].map((f, i) => (
                  <div key={i} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mb-1">{f.label}</p>
                    <p className="text-white text-sm font-medium capitalize">{f.value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Feedback Stats — students only */}
              {selectedUser.feedbackStats && selectedUser.feedbackStats.length > 0 && (
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mb-3">Feedback Statistics</p>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedUser.feedbackStats.map((stat) => {
                      const s = STATUS_MAP[stat._id] || { bar: 'from-gray-500 to-gray-600', bg: 'bg-gray-500/20', text: 'text-gray-300' };
                      return (
                        <div key={stat._id} className="rounded-xl p-3 text-center border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <div className={`h-1 rounded-full bg-gradient-to-r ${s.bar} mb-3 mx-auto w-8`} />
                          <p className="text-2xl font-bold text-white">{stat.count}</p>
                          <p className={`text-xs font-medium mt-1 ${s.text}`}>{stat._id}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Close */}
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-xl text-gray-300 font-medium text-sm hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;