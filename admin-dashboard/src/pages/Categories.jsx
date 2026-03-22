import React, { useState, useEffect } from 'react';
import { categoryAPI, feedbackAPI } from '../services/api';
import { Search, Trash2, MessageSquare, X, Tag, ChevronRight, LayoutGrid, Filter, ChevronDown, Plus, Edit2 } from 'lucide-react';

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

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryFeedback, setCategoryFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Add Category Modal States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    icon: '📝',
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.status-dropdown-wrapper')) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryFeedback = async (category) => {
    setSelectedCategory(category);
    setFeedbackLoading(true);
    setCategoryFeedback([]);
    try {
      const params = { category: category._id, ...(statusFilter !== 'All' && { status: statusFilter }) };
      const response = await feedbackAPI.getAll(params);
      setCategoryFeedback(response.data.feedback);
    } catch (error) {
      console.error('Error fetching category feedback:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Category CRUD Functions
  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        description: category.description,
        icon: category.icon,
      });
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
        if (selectedCategory?._id === id) {
          setSelectedCategory(null);
          setCategoryFeedback([]);
        }
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

  const handleRespond = (item) => {
    setSelectedFeedback(item);
    setNewStatus(item.status);
    setAdminComment(item.adminResponse?.comment || '');
    setShowRespondModal(true);
  };

  const handleSubmitResponse = async () => {
    try {
      await feedbackAPI.updateStatus(selectedFeedback._id, { status: newStatus, comment: adminComment });
      setShowRespondModal(false);
      fetchCategoryFeedback(selectedCategory);
      alert('Response submitted successfully!');
    } catch (error) {
      alert('Failed to submit response');
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      try {
        await feedbackAPI.delete(id);
        fetchCategoryFeedback(selectedCategory);
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
    }
  };

  const getStatusBadge = (status) => {
    const s = STATUS_STYLES[status] || { pill: 'bg-gray-500/20 text-gray-300 border border-gray-500/40', dot: 'bg-gray-400' };
    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}
        style={{ width: '116px' }}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
        {status}
      </span>
    );
  };

  // ── Pin "Suggestions" category to the top, rest follow original order ──
  const sortedCategories = [...categories].sort((a, b) => {
    const aIsSuggestion = a.name?.toLowerCase().trim() === 'suggestions';
    const bIsSuggestion = b.name?.toLowerCase().trim() === 'suggestions';
    if (aIsSuggestion && !bIsSuggestion) return -1;
    if (!aIsSuggestion && bIsSuggestion) return 1;
    return 0;
  });

  const filteredCategories = sortedCategories.filter(cat =>
    cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFeedback = statusFilter === 'All'
    ? categoryFeedback
    : categoryFeedback.filter(f => f.status === statusFilter);

  // ── Expanded emoji list with 💡 for Suggestions ──
  const emojiList = [
    '💡', '📝', '🏫', '📚', '🏗️', '👤', '📖', '🔬', '💻', '🤝',
    '⚙️', '🎨', '🎭', '🎵', '⚽', '🍎', '📣', '🗳️', '✏️', '🏆',
    '💬', '📌', '🔔', '🌟', '⭐', '📊', '🗂️', '🧠', '🎯', '🏅',
  ];

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

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-1">Admin Panel</p>
          <h1 className="text-3xl font-bold text-white">Category Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage feedback categories and browse submissions by category.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <LayoutGrid className="w-4 h-4 text-violet-400" />
            {categories.length} categories
          </div>
          <button
            onClick={() => handleOpenCategoryModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
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
              statusFilter !== 'All'
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>{statusFilter === 'All' ? 'Filter Status' : statusFilter}</span>
            {statusFilter !== 'All' && (
              <span className="bg-violet-500/30 text-violet-300 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {categoryFeedback.filter(f => f.status === statusFilter).length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showStatusDropdown && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 overflow-hidden z-50 shadow-2xl"
              style={{ background: '#1a1025' }}>
              {STATUS_TABS.map(tab => {
                const count = tab === 'All' ? categoryFeedback.length : categoryFeedback.filter(f => f.status === tab).length;
                const isActive = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => handleStatusFilter(tab)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all hover:bg-white/10 ${
                      isActive ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusDotColors[tab]}`} />
                      <span className={isActive ? 'font-semibold text-violet-300' : ''}>{tab}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-violet-500/30 text-violet-300' : 'bg-white/10 text-gray-500'}`}>
                      {count}
                    </span>
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
              return (
                <div key={cat._id} className="relative group">
                  <button
                    onClick={() => fetchCategoryFeedback(cat)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                      isActive
                        ? 'border-violet-500/60 text-white'
                        : isSuggestion
                          ? 'border-yellow-500/30 text-gray-300 hover:border-yellow-500/50 hover:text-white'
                          : 'border-white/10 text-gray-300 hover:border-white/20 hover:text-white'
                    }`}
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(219,39,119,0.15))'
                        : isSuggestion
                          ? 'rgba(234,179,8,0.06)'
                          : 'rgba(255,255,255,0.04)',
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
                          {/* ── Pinned badge for Suggestions ── */}
                          {isSuggestion && (
                            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 uppercase tracking-wide">
                              Pinned
                            </span>
                          )}
                        </div>
                        {cat.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cat.feedbackCount > 0 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            isActive ? 'bg-violet-500/40 text-violet-200' : 'bg-white/10 text-gray-400'
                          }`}>
                            {cat.feedbackCount}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 transition-all ${isActive ? 'text-violet-400 translate-x-0.5' : 'text-gray-600'}`} />
                      </div>
                    </div>
                  </button>

                  {/* Category Action Buttons (Edit/Delete) */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCategoryModal(cat);
                      }}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat._id);
                      }}
                      className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      title="Delete Category"
                    >
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
          {!selectedCategory ? (
            <div className="rounded-2xl border border-white/10 p-16 flex flex-col items-center justify-center text-center min-h-[360px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Tag className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-300 font-semibold text-lg">Select a category</p>
              <p className="text-gray-600 text-sm mt-1">Click a category on the left to view its feedback</p>
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
              {/* Panel Header */}
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
                <button onClick={() => setSelectedCategory(null)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {filteredFeedback.length === 0 ? (
                <div className="p-14 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-medium">No feedback found</p>
                  {statusFilter !== 'All' && <p className="text-gray-600 text-sm">Try changing the status filter.</p>}
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
                    {filteredFeedback.map((item, i) => (
                      <tr key={item._id} className="hover:bg-white/[0.03] transition-all" style={{ borderBottom: '1px solid rgba(0,0,0,0.25)' }}>
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
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1.5">
                            <button onClick={() => handleRespond(item)} title="Respond"
                              className="p-2 rounded-lg text-violet-400 hover:text-white hover:bg-violet-500 border border-violet-500/30 hover:border-violet-500 transition-all">
                              <MessageSquare size={14} />
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
              <h2 className="text-2xl font-bold text-app-primary">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={handleCloseCategoryModal} className="text-app-secondary hover:text-app-primary">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-app-secondary mb-2">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Teaching Method, Facilities"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-app-secondary mb-2">Description</label>
                <textarea
                  placeholder="Brief description of this category"
                  className="w-full px-4 py-2 bg-input border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  rows="3"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-app-secondary mb-2">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {emojiList.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCategoryFormData({ ...categoryFormData, icon: emoji })}
                      className={`text-2xl p-2 rounded-lg hover:bg-card-hover transition-colors ${
                        categoryFormData.icon === emoji ? 'bg-violet-500/30 ring-2 ring-violet-500' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:opacity-90"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseCategoryModal}
                  className="px-6 py-2 bg-card text-app-primary rounded-lg hover:bg-card-hover"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {showRespondModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(145deg, #1a1025, #0f0a1a)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(109,40,217,0.2)' }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">Respond to Feedback</h2>
                <p className="text-gray-500 text-xs mt-0.5">Update status and send a response</p>
              </div>
              <button onClick={() => setShowRespondModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Feedback Summary */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { label: 'Student', value: `${selectedFeedback.student?.name} (${selectedFeedback.student?.studentId})` },
                  { label: 'Subject', value: selectedFeedback.subject },
                  { label: 'Description', value: selectedFeedback.description },
                  { label: 'Submitted', value: new Date(selectedFeedback.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                ].map((f, i) => (
                  <div key={i}>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mb-0.5">{f.label}</p>
                    <p className="text-gray-200 text-sm">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Update Status */}
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mb-2">Update Status</p>
                <select
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Response */}
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mb-2">Your Response</p>
                <textarea
                  className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  rows="4"
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Write your response to the student..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSubmitResponse}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
                >
                  Submit Response
                </button>
                <button
                  onClick={() => setShowRespondModal(false)}
                  className="px-6 py-3 rounded-xl text-gray-300 font-medium text-sm hover:bg-white/10 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;