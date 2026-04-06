import React, { useState, useEffect } from 'react';
import { categoryAPI, feedbackAPI } from '../services/api';
import { Search, Trash2, MessageSquare, X, Tag, ChevronRight, LayoutGrid, Filter, ChevronDown, Plus, Edit2, Star, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  Pending:        { pill: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40', dot: 'bg-yellow-400' },
  'Under Review': { pill: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',       dot: 'bg-blue-400' },
  Resolved:       { pill: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40', dot: 'bg-emerald-400' },
  Rejected:       { pill: 'bg-red-500/20 text-red-300 border border-red-500/40',           dot: 'bg-red-400' },
};

const STATUS_TABS = ['All', 'Pending', 'Under Review', 'Resolved', 'Rejected'];

const statusDotColors = {
  All: 'bg-gray-400',
  Pending: 'bg-yellow-400',
  'Under Review': 'bg-blue-400',
  Resolved: 'bg-emerald-400',
  Rejected: 'bg-red-400',
};

const STATUS_MINI = {
  Pending:        { bg: 'rgba(234,179,8,0.22)',   text: '#92400e', border: 'rgba(234,179,8,0.7)',   dot: '#f59e0b' },
  'Under Review': { bg: 'rgba(59,130,246,0.22)',  text: '#1e40af', border: 'rgba(59,130,246,0.7)',  dot: '#3b82f6' },
  Resolved:       { bg: 'rgba(16,185,129,0.22)',  text: '#065f46', border: 'rgba(16,185,129,0.7)',  dot: '#10b981' },
  Rejected:       { bg: 'rgba(239,68,68,0.22)',   text: '#991b1b', border: 'rgba(239,68,68,0.7)',   dot: '#ef4444' },
};

const getDueStatus = (item) => {
  if (item.status === 'Resolved' || item.status === 'Rejected') return null;
  const due = new Date(item.createdAt);
  due.setDate(due.getDate() + 5);
  const now = new Date();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  if (now > due) return 'overdue';
  if (diffDays <= 1) return 'due-today';
  if (diffDays <= 2) return 'due-soon';
  return null;
};

const DUE_BADGE = {
  'overdue':   { label: '⚠ Overdue',   cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  'due-today': { label: '⏰ Due Today', cls: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
  'due-soon':  { label: '🕐 Due Soon',  cls: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
};

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [allCategoryFeedbackMap, setAllCategoryFeedbackMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryFeedback, setCategoryFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [globalFeedback, setGlobalFeedback] = useState([]);
  const [globalFeedbackLoading, setGlobalFeedbackLoading] = useState(false);
  const [showGlobalPanel, setShowGlobalPanel] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '', icon: '📝' });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [isLightMode, setIsLightMode] = useState(
    () => document.documentElement.classList.contains('light-mode') || document.body.classList.contains('light-mode')
  );
  useEffect(() => {
    const check = () => setIsLightMode(
      document.documentElement.classList.contains('light-mode') || document.body.classList.contains('light-mode')
    );
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const dropdownPanelStyle = isLightMode
    ? { background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(196,181,253,0.5)', boxShadow: '0 8px 32px rgba(109,40,217,0.15)' }
    : { background: '#1a1025', border: '1px solid rgba(255,255,255,0.1)' };

  const dropdownItemActiveStyle = isLightMode ? 'bg-violet-100 text-violet-700' : 'bg-violet-500/20 text-violet-300';
  const dropdownItemInactiveStyle = isLightMode ? 'text-gray-700 hover:bg-violet-50' : 'text-gray-400 hover:bg-white/10';

  const selectStyle = isLightMode
    ? { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(196,181,253,0.4)', colorScheme: 'light', color: '#1e1b4b' }
    : { background: '#1a1025', border: '1px solid rgba(255,255,255,0.15)', colorScheme: 'dark', color: '#ffffff' };
  const optionStyle = isLightMode ? { background: '#ffffff', color: '#1e1b4b' } : { background: '#1a1025' };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.status-dropdown-wrapper')) setShowStatusDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      const cats = response.data.categories || [];
      setCategories(cats);
      await fetchAllFeedbackForCounts(cats);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFeedbackForCounts = async (cats) => {
    try {
      const allRes = await feedbackAPI.getAll({});
      const allFeedback = allRes.data.feedback || [];
      const map = {};
      cats.forEach(cat => { map[cat._id] = []; });
      allFeedback.forEach(item => {
        const cid = item.category?._id;
        if (cid) {
          if (!map[cid]) map[cid] = [];
          map[cid].push(item);
        }
      });
      setAllCategoryFeedbackMap(map);
    } catch (error) {
      console.error('Error fetching all feedback for counts:', error);
    }
  };

  const fetchCategoryFeedback = async (category) => {
    setSelectedCategory(category);
    setShowGlobalPanel(false);
    setFeedbackLoading(true);
    setCategoryFeedback([]);
    try {
      const params = { category: category._id, ...(statusFilter !== null && statusFilter !== 'All' && { status: statusFilter }) };
      const response = await feedbackAPI.getAll(params);
      setCategoryFeedback(response.data.feedback);
    } catch (error) {
      console.error('Error fetching category feedback:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const fetchGlobalFeedback = async (status) => {
    setGlobalFeedbackLoading(true);
    setGlobalFeedback([]);
    try {
      const params = status !== 'All' ? { status } : {};
      const response = await feedbackAPI.getAll(params);
      setGlobalFeedback(response.data.feedback || []);
    } catch (error) {
      console.error('Error fetching global feedback:', error);
    } finally {
      setGlobalFeedbackLoading(false);
    }
  };

  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({ name: category.name, description: category.description, icon: category.icon });
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: '', description: '', icon: '📝' });
    }
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryFormData({ name: '', description: '', icon: '📝' });
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoryAPI.update(editingCategory._id, categoryFormData);
        alert('Category updated successfully!');
      } else {
        await categoryAPI.create(categoryFormData);
        alert('Category created successfully!');
      }
      handleCloseCategoryModal();
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await categoryAPI.delete(id);
        alert('Category deleted successfully!');
        fetchCategories();
        if (selectedCategory?._id === id) { setSelectedCategory(null); setCategoryFeedback([]); }
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete category');
      }
    }
  };

  const handleToggleCategoryStatus = async (category) => {
    try {
      await categoryAPI.update(category._id, { isActive: !category.isActive });
      fetchCategories();
    } catch (error) {
      alert('Failed to update category status');
    }
  };

  const handleViewDetails = (item) => {
    setSelectedFeedback(item);
    setNewStatus(item.status);
    setAdminComment(item.adminResponse?.comment || '');
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async () => {
    try {
      await feedbackAPI.updateStatus(selectedFeedback._id, { status: newStatus, comment: adminComment });
      if (adminComment.trim()) await feedbackAPI.sendMessage(selectedFeedback._id, adminComment.trim());
      setShowDetailModal(false);
      if (selectedCategory) {
        fetchCategoryFeedback(selectedCategory);
      } else if (showGlobalPanel) {
        fetchGlobalFeedback(statusFilter ?? 'All');
      }
      fetchAllFeedbackForCounts(categories);
      alert('Feedback updated successfully!');
    } catch (error) {
      alert(`Failed to update feedback: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      try {
        await feedbackAPI.delete(id);
        if (selectedCategory) {
          fetchCategoryFeedback(selectedCategory);
        } else if (showGlobalPanel) {
          fetchGlobalFeedback(statusFilter ?? 'All');
        }
        fetchAllFeedbackForCounts(categories);
        alert('Feedback deleted successfully!');
      } catch (error) {
        alert('Failed to delete feedback');
      }
    }
  };

  const handleStatusFilter = (tab) => {
    setStatusFilter(tab);
    setShowStatusDropdown(false);

    if (selectedCategory) {
      setFeedbackLoading(true);
      feedbackAPI.getAll({ category: selectedCategory._id, ...(tab !== 'All' && { status: tab }) })
        .then(res => setCategoryFeedback(res.data.feedback))
        .catch(console.error)
        .finally(() => setFeedbackLoading(false));
    } else {
      setShowGlobalPanel(true);
      fetchGlobalFeedback(tab);
    }
  };

  const getStatusBadge = (status) => {
    const s = STATUS_STYLES[status] || { pill: 'bg-gray-500/20 text-gray-300 border border-gray-500/40', dot: 'bg-gray-400' };
    return (
      <span className={`inline-flex items-center justify-center gap-1.5 py-1 rounded-full text-xs font-semibold ${s.pill}`} style={{ width: '116px' }}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
        {status}
      </span>
    );
  };

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
      ))}
    </div>
  );

  const getRatingLabel = (rating) => {
    switch (rating) {
      case 1: return 'Very Unsatisfied'; case 2: return 'Unsatisfied';
      case 3: return 'Neutral'; case 4: return 'Satisfied'; case 5: return 'Very Satisfied';
      default: return '';
    }
  };

  const getCategoryStatusCounts = (categoryId) => {
    const items = allCategoryFeedbackMap[categoryId] || [];
    const counts = { Pending: 0, 'Under Review': 0, Resolved: 0, Rejected: 0 };
    items.forEach(item => { if (counts[item.status] !== undefined) counts[item.status]++; });
    return counts;
  };

  const getGlobalStatusCounts = () => {
    const counts = { Pending: 0, 'Under Review': 0, Resolved: 0, Rejected: 0 };
    Object.values(allCategoryFeedbackMap).forEach(items => {
      items.forEach(item => { if (counts[item.status] !== undefined) counts[item.status]++; });
    });
    return counts;
  };

  const sortedCategories = [...categories].sort((a, b) => {
    const aIsSuggestion = a.name?.toLowerCase().trim() === 'suggestions';
    const bIsSuggestion = b.name?.toLowerCase().trim() === 'suggestions';
    const aIsOther = a.name?.toLowerCase().trim() === 'others' || a.name?.toLowerCase().trim() === 'other';
    const bIsOther = b.name?.toLowerCase().trim() === 'others' || b.name?.toLowerCase().trim() === 'other';
    if (aIsOther) return 1;
    if (bIsOther) return -1;
    if (aIsSuggestion && !bIsSuggestion) return -1;
    if (!aIsSuggestion && bIsSuggestion) return 1;
    return 0;
  });

  const filteredCategories = sortedCategories.filter(cat =>
    cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFeedback = statusFilter === null || statusFilter === 'All'
    ? categoryFeedback
    : categoryFeedback.filter(f => f.status === statusFilter);

  const emojiList = [
    '💡', '📝', '🏫', '📚', '🏗️', '👤', '📖', '🔬', '💻', '🤝',
    '⚙️', '🎨', '🎭', '🎵', '⚽', '🍎', '📣', '🗳️', '✏️', '🏆',
    '💬', '📌', '🔔', '🌟', '⭐', '📊', '🗂️', '🧠', '🎯', '🏅',
  ];

  const STATUS_ACTIVE_COLORS = {
    All:            { bg: '#6b7280', border: '#4b5563', text: '#ffffff', shadow: 'rgba(107,114,128,0.35)' },
    Pending:        { bg: '#d97706', border: '#b45309', text: '#ffffff', shadow: 'rgba(217,119,6,0.35)'   },
    'Under Review': { bg: '#2563eb', border: '#1d4ed8', text: '#ffffff', shadow: 'rgba(37,99,235,0.35)'   },
    Resolved:       { bg: '#059669', border: '#047857', text: '#ffffff', shadow: 'rgba(5,150,105,0.35)'   },
    Rejected:       { bg: '#dc2626', border: '#b91c1c', text: '#ffffff', shadow: 'rgba(220,38,38,0.35)'   },
  };

  const getFilterBtnActiveStyle = (tab) => {
    const c = STATUS_ACTIVE_COLORS[tab] || STATUS_ACTIVE_COLORS['All'];
    return isLightMode
      ? { background: c.bg, borderColor: c.border, color: c.text, boxShadow: `0 2px 12px ${c.shadow}` }
      : {};
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-gray-400 text-sm">Loading categories...</p>
        </div>
      </div>
    );
  }

  const renderGlobalPanel = () => {
    const globalCounts = getGlobalStatusCounts();
    return (
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">
                {statusFilter === null || statusFilter === 'All' ? 'All Feedbacks' : `${statusFilter} Feedbacks`}
                <span className="ml-2 text-[10px] font-normal text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-full border border-violet-500/25 uppercase tracking-wide">All Categories</span>
              </h3>
              <p className="text-gray-500 text-xs">{globalFeedback.length} feedback{globalFeedback.length !== 1 ? 's' : ''} across all categories</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(globalCounts).map(([status, count]) => {
              if (count === 0) return null;
              const m = STATUS_MINI[status];
              const isFilterActive = statusFilter === status;
              return (
                <button key={status} onClick={() => handleStatusFilter(isFilterActive ? 'All' : status)}
                  title={`Filter by ${status}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={{
                    background: m.bg,
                    color: m.text,
                    border: `1.5px solid ${m.border}`,
                    boxShadow: isFilterActive ? `0 0 0 2px ${m.border}` : 'none',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
                  {status} · {count}
                </button>
              );
            })}
            <button onClick={() => { setShowGlobalPanel(false); setStatusFilter(null); }} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {globalFeedbackLoading ? (
          <div className="p-16 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              <p className="text-gray-500 text-sm">Loading feedback...</p>
            </div>
          </div>
        ) : globalFeedback.length === 0 ? (
          <div className="p-14 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No feedback found</p>
            {(statusFilter !== null && statusFilter !== 'All') && (
              <button onClick={() => handleStatusFilter('All')} className="text-violet-400 hover:text-violet-300 text-sm underline underline-offset-2 transition-colors">
                Show all feedbacks
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '2px solid rgba(0,0,0,0.3)' }}>
                {['Student', 'Category', 'Subject', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {globalFeedback.map((item) => (
                <tr key={item._id}
                  className="hover:bg-white/[0.03] transition-all cursor-pointer"
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.25)' }}
                  onClick={() => handleViewDetails(item)}
                >
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-white text-sm font-medium">{item.student?.name}</p>
                      <p className="text-gray-500 text-xs">{item.student?.studentId}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                      <span>{item.category?.icon}</span>
                      <span className="truncate max-w-[80px]">{item.category?.name}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-white text-sm max-w-[120px] truncate">{item.subject}</p>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap w-px">{getStatusBadge(item.status)}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-gray-500 text-xs tabular-nums">
                      {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleViewDetails(item)} title="View Details"
                        className="p-2 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500 border border-blue-500/30 hover:border-blue-500 transition-all">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleDeleteFeedback(item._id)} title="Delete"
                        className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 hover:border-red-500 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Category Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage feedback categories and browse submissions by category.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <LayoutGrid className="w-4 h-4 text-violet-400" />
            {categories.length} categories
          </div>
          <button onClick={() => handleOpenCategoryModal()} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
            <Plus size={18} />
            Add Category
          </button>
        </div>
      </div>

      {/* Search + Status Dropdown */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <style>{`.categories-search-input::placeholder { color: #1e1b4b !important; opacity: 0.5 !important; }`}</style>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: '#1e1b4b' }} />
          <input
            type="text"
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all categories-search-input"
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
        <div className="relative status-dropdown-wrapper">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              statusFilter !== null
                ? isLightMode
                  ? ''
                  : 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            style={statusFilter !== null ? getFilterBtnActiveStyle(statusFilter ?? 'All') : {}}
          >
            <Filter className="w-4 h-4" />
            <span>{statusFilter === null ? 'Filter Status' : statusFilter}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showStatusDropdown && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50 shadow-2xl" style={dropdownPanelStyle}>
              <p className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-widest font-semibold" style={{ color: isLightMode ? '#9ca3af' : '#4b5563' }}>
                {selectedCategory ? `Filter · ${selectedCategory.name}` : 'Filter · All Categories'}
              </p>
              {STATUS_TABS.map(tab => {
                const isActive = statusFilter === tab;
                const activeColors = STATUS_ACTIVE_COLORS[tab] || STATUS_ACTIVE_COLORS['All'];
                return (
                  <button key={tab} onClick={() => handleStatusFilter(tab)}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-all ${
                      isActive
                        ? isLightMode ? 'font-semibold' : 'bg-violet-500/20 text-violet-300'
                        : dropdownItemInactiveStyle
                    }`}
                    style={isActive && isLightMode ? {
                      background: `${activeColors.bg}18`,
                      color: activeColors.bg,
                      borderLeft: `3px solid ${activeColors.bg}`,
                    } : isActive ? {} : {}}
                  >
                    <span className={`w-2 h-2 rounded-full ${statusDotColors[tab]}`} />
                    <span>{tab}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Category List */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 px-1 mb-3">
            {filteredCategories.length} Categories
          </p>
          {filteredCategories.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-8 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Tag className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No categories found</p>
            </div>
          ) : (
            filteredCategories.map(cat => {
              const isActive = selectedCategory?._id === cat._id;
              const isSuggestion = cat.name?.toLowerCase().trim() === 'suggestions';
              const statusCounts = getCategoryStatusCounts(cat._id);
              const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

              return (
                <div key={cat._id} className="relative group">
                  <button
                    onClick={() => fetchCategoryFeedback(cat)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                      isActive ? 'border-violet-500/60 text-white'
                      : isSuggestion ? 'border-yellow-500/30 text-gray-300 hover:border-yellow-500/50 hover:text-white'
                      : 'border-white/10 text-gray-300 hover:border-white/20 hover:text-white'
                    }`}
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(219,39,119,0.15))'
                        : isSuggestion ? 'rgba(234,179,8,0.06)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all ${
                        isActive ? 'bg-violet-500/30' : isSuggestion ? 'bg-yellow-500/15' : 'bg-white/5 group-hover:bg-white/10'
                      }`}>
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{cat.name}</p>
                          {isSuggestion && (
                            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 uppercase tracking-wide">
                              Pinned
                            </span>
                          )}
                        </div>
                        {cat.description && <p className="text-xs text-gray-500 truncate mt-0.5">{cat.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {totalCount > 0 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-violet-500/40 text-violet-200' : 'bg-white/10 text-gray-400'}`}>
                            {totalCount}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 transition-all ${isActive ? 'text-violet-400 translate-x-0.5' : 'text-gray-600'}`} />
                      </div>
                    </div>
                    {totalCount > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pl-[52px]">
                        {Object.entries(statusCounts).map(([status, count]) => {
                          if (count === 0) return null;
                          const m = STATUS_MINI[status];
                          return (
                            <span key={status} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ background: m.bg, color: m.text }}>
                              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: m.dot }} />
                              {status} · {count}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </button>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-10">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(cat); }}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors" title="Edit Category">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat._id); }}
                      className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors" title="Delete Category">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Feedback Panel */}
        <div className="lg:col-span-2">
          {showGlobalPanel && !selectedCategory ? renderGlobalPanel() :

          !selectedCategory ? (
            <div className="rounded-2xl border border-white/10 p-16 flex flex-col items-center justify-center text-center min-h-[360px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Tag className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-300 font-semibold text-lg">Select a category</p>
              <p className="text-gray-600 text-sm mt-1">Click a category on the left to view its feedback</p>
              <p className="text-gray-600 text-xs mt-3 opacity-60">Or use the <span className="text-violet-400">Filter Status</span> button above to browse all feedbacks</p>
            </div>
          ) : feedbackLoading ? (
            <div className="rounded-2xl border border-white/10 p-16 flex items-center justify-center min-h-[360px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                <p className="text-gray-500 text-sm">Loading feedback...</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
              <div className="px-5 py-4 flex items-center justify-between border-b border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-lg">
                    {selectedCategory.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">{selectedCategory.name}</h3>
                    <p className="text-gray-500 text-xs">{filteredFeedback.length} feedback{filteredFeedback.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const counts = getCategoryStatusCounts(selectedCategory._id);
                    return Object.entries(counts).map(([status, count]) => {
                      if (count === 0) return null;
                      const m = STATUS_MINI[status];
                      const isFilterActive = statusFilter === status;
                      return (
                        <button key={status} onClick={() => handleStatusFilter(isFilterActive ? 'All' : status)}
                          title={`Filter by ${status}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                          style={{
                            background: m.bg,
                            color: m.text,
                            border: `1.5px solid ${m.border}`,
                            boxShadow: isFilterActive ? `0 0 0 2px ${m.border}` : 'none',
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
                          {status} · {count}
                        </button>
                      );
                    });
                  })()}
                  <button onClick={() => setSelectedCategory(null)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all ml-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {filteredFeedback.length === 0 ? (
                <div className="p-14 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-medium">No feedback found</p>
                  {(statusFilter !== null && statusFilter !== 'All') && (
                    <button onClick={() => handleStatusFilter('All')} className="text-violet-400 hover:text-violet-300 text-sm underline underline-offset-2 transition-colors">
                      Clear status filter
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '2px solid rgba(0,0,0,0.3)' }}>
                      {['Student', 'Subject', 'Status', 'Date', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeedback.map((item) => (
                      <tr key={item._id}
                        className="hover:bg-white/[0.03] transition-all cursor-pointer"
                        style={{ borderBottom: '1px solid rgba(0,0,0,0.25)' }}
                        onClick={() => handleViewDetails(item)}
                      >
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="text-white text-sm font-medium">{item.student?.name}</p>
                            <p className="text-gray-500 text-xs">{item.student?.studentId}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-white text-sm max-w-[140px] truncate">{item.subject}</p>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap w-px">{getStatusBadge(item.status)}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-gray-500 text-xs tabular-nums">
                            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleViewDetails(item)} title="View Details"
                              className="p-2 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500 border border-blue-500/30 hover:border-blue-500 transition-all">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => handleDeleteFeedback(item._id)} title="Delete"
                              className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 hover:border-red-500 transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-modal-overlay backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-modal rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-app-primary">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={handleCloseCategoryModal} className="text-app-secondary hover:text-app-primary"><X size={24} /></button>
            </div>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-app-secondary mb-2">Category Name *</label>
                <input type="text" required placeholder="e.g. Teaching Method, Facilities"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={categoryFormData.name} onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-app-secondary mb-2">Description</label>
                <textarea placeholder="Brief description of this category"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  rows="3" value={categoryFormData.description} onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-app-secondary mb-2">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {emojiList.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => setCategoryFormData({ ...categoryFormData, icon: emoji })}
                      className={`text-2xl p-2 rounded-lg hover:bg-card-hover transition-colors ${categoryFormData.icon === emoji ? 'bg-violet-500/30 ring-2 ring-violet-500' : ''}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:opacity-90">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={handleCloseCategoryModal} className="px-6 py-2 bg-card text-app-primary rounded-lg hover:bg-card-hover">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Detail Modal */}
      {showDetailModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="feedback-modal rounded-2xl w-full flex flex-col"
            style={{
              maxWidth: '1000px', maxHeight: '90vh',
              background: isLightMode ? 'rgba(245,243,255,0.97)' : 'linear-gradient(145deg, #1a1025, #0f0a1a)',
              border: isLightMode ? '1px solid rgba(196,181,253,0.5)' : '1px solid rgba(255,255,255,0.12)',
              boxShadow: isLightMode ? '0 25px 60px rgba(109,40,217,0.15)' : '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(109,40,217,0.2)',
            }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-base font-bold" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>Feedback Details</h2>
                <p className="text-xs" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>Review and respond to this submission</p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedFeedback.status)}
                {(() => {
                  const ds = getDueStatus(selectedFeedback);
                  const db = ds ? DUE_BADGE[ds] : null;
                  return db ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${db.cls}`}>{db.label}</span> : null;
                })()}
                <button onClick={() => setShowDetailModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Two-column body */}
            <div className="flex flex-1 min-h-0 divide-x divide-white/10">

              {/* LEFT */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-w-0">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      label: 'Student',
                      value: selectedFeedback.isAnonymous && !isAdmin ? 'Anonymous Student' : selectedFeedback.student?.name,
                      sub: selectedFeedback.isAnonymous && !isAdmin ? null : selectedFeedback.student?.studentId,
                      badge: selectedFeedback.isAnonymous ? (isAdmin ? '🕵️ Submitted Anonymously' : '🕵️ Anonymous') : null,
                    },
                    { label: 'Subject', value: selectedFeedback.subject },
                    {
                      label: 'Category',
                      value: `${selectedFeedback.category?.icon || ''} ${selectedFeedback.category?.name || ''}`,
                      sub: (
                        selectedFeedback.category?.name?.toLowerCase().trim() === 'others' ||
                        selectedFeedback.category?.name?.toLowerCase().trim() === 'other'
                      ) && selectedFeedback.otherSpecification
                        ? `Specified: "${selectedFeedback.otherSpecification}"`
                        : null,
                    },
                    selectedFeedback.teacherName ? { label: 'Teacher', value: selectedFeedback.teacherName } : { label: 'Priority', value: selectedFeedback.priority },
                    selectedFeedback.location ? { label: 'Location', value: `📍 ${selectedFeedback.location}` } : null,
                    selectedFeedback.dateTime ? { label: 'Class Date & Time', value: `🕐 ${selectedFeedback.dateTime}` } : null,
                    { label: 'Submitted', value: new Date(selectedFeedback.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                    selectedFeedback.lastUpdatedBy ? { label: 'Last Updated By', value: selectedFeedback.lastUpdatedBy?.name, badge: selectedFeedback.lastUpdatedBy?.role } : null,
                  ].filter(Boolean).map((field, i) => (
                    <div key={i} className="rounded-lg px-3 py-2" style={{ background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)', border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>{field.label}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium leading-snug" style={{ color: isLightMode ? '#1e1b4b' : '#ffffff' }}>{field.value}</p>
                        {field.badge && <span className="text-[10px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full">{field.badge}</span>}
                      </div>
                      {field.sub && <p className="text-xs mt-0.5 italic" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>{field.sub}</p>}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg px-3 py-2" style={{ background: isLightMode ? 'rgba(109,40,217,0.06)' : 'rgba(255,255,255,0.04)', border: isLightMode ? '1.5px solid #c4b5fd' : '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>Description</p>
                  <p className="text-sm leading-relaxed" style={{ color: isLightMode ? '#1e1b4b' : '#e5e7eb' }}>{selectedFeedback.description}</p>
                </div>

                {selectedFeedback.media && selectedFeedback.media.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#6d28d9' : '#6b7280' }}>Attached Media</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {selectedFeedback.media.map((file, index) => (
                        <div key={index} className="rounded-lg overflow-hidden border border-white/10">
                          {file.type === 'video'
                            ? <video src={file.url} controls className="w-full h-20 object-cover bg-black" />
                            : <img src={file.url} alt={`Attachment ${index + 1}`} className="w-full h-20 object-cover cursor-pointer hover:opacity-90 transition" onClick={() => window.open(file.url, '_blank')} />
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isAdmin && selectedFeedback.status === 'Resolved' && (
                  <div className="rounded-lg px-3 py-3" style={{ background: isLightMode ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.08)', border: isLightMode ? '1.5px solid rgba(245,158,11,0.3)' : '1px solid rgba(245,158,11,0.25)' }}>
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: isLightMode ? '#92400e' : '#d97706' }}>Student Satisfaction Rating</p>
                    {selectedFeedback.satisfactionRating ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          {renderStars(selectedFeedback.satisfactionRating)}
                          <span className="text-sm font-semibold" style={{ color: isLightMode ? '#92400e' : '#fbbf24' }}>
                            {selectedFeedback.satisfactionRating}/5 — {getRatingLabel(selectedFeedback.satisfactionRating)}
                          </span>
                        </div>
                        {selectedFeedback.satisfactionComment && <p className="text-xs italic" style={{ color: isLightMode ? '#6b7280' : '#9ca3af' }}>"{selectedFeedback.satisfactionComment}"</p>}
                        {selectedFeedback.ratedAt && <p className="text-[10px]" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>Rated on {new Date(selectedFeedback.ratedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: isLightMode ? '#9ca3af' : '#6b7280' }}>Student has not rated this resolution yet.</p>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT */}
              <div className="feedback-modal-right w-72 shrink-0 p-4 flex flex-col gap-3" style={{ background: isLightMode ? 'rgba(237,233,254,0.4)' : 'transparent' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: isLightMode ? '#4c1d95' : '#9ca3af' }}>Update Feedback</p>
                  <div className="flex items-center gap-2 mb-3 rounded-lg px-3 py-2" style={{ background: isLightMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.04)', border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs" style={{ color: '#6b7280' }}>Current:</p>
                    {getStatusBadge(selectedFeedback.status)}
                  </div>
                  <div className="mb-3">
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>New Status</p>
                    <select className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" style={selectStyle} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      <option value="Pending" style={optionStyle}>Pending</option>
                      <option value="Under Review" style={optionStyle}>Under Review</option>
                      <option value="Rejected" style={optionStyle}>Rejected</option>
                      <option value="Resolved" style={optionStyle}>Resolved</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: isLightMode ? '#4c1d95' : '#6b7280' }}>
                      {user?.role === 'staff' ? 'Staff Response' : 'Admin Response'} <span className="normal-case" style={{ color: isLightMode ? '#9ca3af' : '#4b5563' }}>· sent to chat</span>
                    </p>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none"
                      style={{ background: isLightMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)', border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.12)', color: isLightMode ? '#1e1b4b' : undefined }}
                      rows="5" value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Add your response..." />
                  </div>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <button onClick={handleUpdateStatus}
                    className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                    Update Feedback
                  </button>
                  <button onClick={() => setShowDetailModal(false)}
                    className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:bg-white/10"
                    style={{ background: isLightMode ? 'rgba(237,233,254,0.6)' : 'rgba(255,255,255,0.06)', border: isLightMode ? '1px solid rgba(196,181,253,0.4)' : '1px solid rgba(255,255,255,0.12)', color: isLightMode ? '#4c1d95' : '#d1d5db' }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CategoryManagement;