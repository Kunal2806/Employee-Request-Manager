'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, X, CheckCircle, XCircle, AlertCircle, Filter, Search, Save } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

// Types matching your Drizzle schema
type RequestStatus = 'accepted' | 'denied' | 'pending';
type RequestType = 'work_from_home' | 'holiday' | 'halfday' | 'other';

interface EmployeeRequest {
  id: string;
  name: string;
  email: string;
  type: RequestType;
  reason: string;
  startDate: string;
  endDate: string;
  status: RequestStatus;
}

interface UserSession {
  name: string;
  email: string;
}

export default function UserRequestsPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<EmployeeRequest[]>([]);
  const [showNewRequestRow, setShowNewRequestRow] = useState(false);
  const [user, setUser] = useState<UserSession>({ name: '', email: '' });
  const { data: session } = useSession();
  const userid = session?.user.id;

  // Filter state
  const [filters, setFilters] = useState({
    status: 'all' as RequestStatus | 'all',
    type: 'all' as RequestType | 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    type: 'holiday' as RequestType,
    reason: '',
    startDate: '',
    endDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch user's requests
  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/user/${userid}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
        setFilteredRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  useEffect(() => {
    if (userid) {
      fetchRequests();
      setUser({ name: session?.user.name || "", email: session?.user.email || "" });
    }
  }, [userid]);

  // Apply filters
  useEffect(() => {
    let filtered = [...requests];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(r => r.type === filters.type);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r =>
        r.reason.toLowerCase().includes(searchLower) ||
        getTypeLabel(r.type).toLowerCase().includes(searchLower)
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(r => new Date(r.startDate) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(r => new Date(r.endDate) <= toDate);
    }

    setFilteredRequests(filtered);
  }, [filters, requests]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: 'all',
      type: 'all',
      search: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  // Validate form
  const validateForm = () => {
    if (!formData.type) {
      setFormError('Please select a request type');
      return false;
    }
    if (!formData.reason.trim()) {
      setFormError('Please provide a reason for your request');
      return false;
    }
    if (!formData.startDate || !formData.endDate) {
      setFormError('Please select both start and end dates');
      return false;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setFormError('End date must be after start date');
      return false;
    }
    return true;
  };

  // Submit new request
  const handleSubmitRequest = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await fetch(`/api/user/${userid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          name: user.name,
          email: user.email,
        }),
      });

      if (response.ok) {
        setFormData({
          type: 'holiday',
          reason: '',
          startDate: '',
          endDate: '',
        });
        setShowNewRequestRow(false);
        fetchRequests();
      } else {
        setFormError('Failed to submit request. Please try again.');
      }
    } catch (err) {
      console.error('Failed to submit request:', err);
      setFormError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel new request
  const handleCancelNewRequest = () => {
    setShowNewRequestRow(false);
    setFormData({
      type: 'holiday',
      reason: '',
      startDate: '',
      endDate: '',
    });
    setFormError('');
  };

  // Calculate days between dates
  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Calculate stats
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const acceptedCount = requests.filter(r => r.status === 'accepted').length;
  const deniedCount = requests.filter(r => r.status === 'denied').length;
  const approvedDays = filteredRequests
    .filter(r => r.status === 'accepted')
    .reduce((total, req) => total + calculateDays(req.startDate, req.endDate), 0);

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'denied':
        return <XCircle className="w-4 h-4 text-rose-600" />;
    }
  };

  const getStatusBadgeStyle = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'accepted':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'denied':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
    }
  };

  const getTypeIcon = (type: RequestType) => {
    switch (type) {
      case 'holiday':
        return '🏖️';
      case 'work_from_home':
        return '🏠';
      case 'halfday':
        return '⏰';
      case 'other':
        return '📋';
    }
  };

  const getTypeLabel = (type: RequestType) => {
    switch (type) {
      case 'work_from_home':
        return 'Work from Home';
      case 'holiday':
        return 'Holiday';
      case 'halfday':
        return 'Half Day';
      case 'other':
        return 'Other';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleLogout = async () => {
    await signOut({ redirectTo: "/auth/login" });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.type !== 'all' || filters.search !== '' || filters.dateFrom !== '' || filters.dateTo !== '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Hi, {user.name}!
            </h1>
            <p className="text-slate-600">
              {user.email}
            </p>
            <button onClick={handleLogout} className='text-red-500 hover:text-red-600 text-sm font-medium mt-1'>
              Logout
            </button>
          </div>
          <button
            onClick={() => setShowNewRequestRow(true)}
            disabled={showNewRequestRow}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            New Request
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-blue-600 mb-1">{requests.length}</div>
            <div className="text-sm text-slate-600">Total Requests</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-amber-600 mb-1">{pendingCount}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-emerald-600 mb-1">{acceptedCount}</div>
            <div className="text-sm text-slate-600">Approved</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-purple-600 mb-1">{approvedDays}</div>
            <div className="text-sm text-slate-600">Approved Days</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 mb-6 overflow-hidden">
          <div className="p-4 space-y-4">
            {/* First Row - Search and Quick Filters */}
            <div className="flex items-center justify-between gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Filter Toggle & Quick Filters */}
              <div className="flex items-center gap-2">
                {/* Status Quick Filter */}
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Approved</option>
                  <option value="denied">Denied</option>
                </select>

                {/* Type Quick Filter */}
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="holiday">Holiday</option>
                  <option value="work_from_home">Work from Home</option>
                  <option value="halfday">Half Day</option>
                  <option value="other">Other</option>
                </select>

                
              </div>
            </div>
            <div>
            {/* Second Row - Date Range Filter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Date Range:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="From"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  min={filters.dateFrom}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="To"
                />
              </div>
            </div>
            {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
            </div>
          </div>

          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="px-4 pb-3 flex items-center gap-2 text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500">Showing {filteredRequests.length} of {requests.length} requests</span>
            </div>
          )}
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          {filteredRequests.length === 0 && !showNewRequestRow ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {hasActiveFilters ? 'No matching requests' : 'No requests yet'}
              </h3>
              <p className="text-slate-600 mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your filters' 
                  : 'Start by creating your first time-off request'}
              </p>
              {!hasActiveFilters && (
                <button
                  onClick={() => setShowNewRequestRow(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Request
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* New Request Row */}
                  {showNewRequestRow && (
                    <tr className="bg-blue-50 border-2 border-blue-300">
                      {/* Type Column */}
                      <td className="px-6 py-4">
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="holiday">🏖️ Holiday</option>
                          <option value="work_from_home">🏠 Work from Home</option>
                          <option value="halfday">⏰ Half Day</option>
                          <option value="other">📋 Other</option>
                        </select>
                      </td>

                      {/* Date Range Column */}
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleInputChange}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Start"
                          />
                          <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleInputChange}
                            min={formData.startDate || new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="End"
                          />
                        </div>
                      </td>

                      {/* Days Column */}
                      <td className="px-6 py-4">
                        {formData.startDate && formData.endDate ? (
                          <div className="flex items-center gap-1 text-sm font-medium text-blue-700">
                            <Clock className="w-4 h-4" />
                            {calculateDays(formData.startDate, formData.endDate)}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>

                      {/* Reason Column */}
                      <td className="px-6 py-4">
                        <textarea
                          name="reason"
                          value={formData.reason}
                          onChange={handleInputChange}
                          placeholder="Enter reason..."
                          rows={2}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        />
                        {formError && (
                          <p className="text-xs text-rose-600 mt-1">{formError}</p>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSubmitRequest}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelNewRequest}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Existing Requests */}
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getTypeIcon(request.type)}</span>
                          <span className="text-sm font-medium text-slate-800">
                            {getTypeLabel(request.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDate(request.startDate)} – {formatDate(request.endDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-800">
                          {calculateDays(request.startDate, request.endDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 line-clamp-2 max-w-md">
                          {request.reason}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(
                              request.status
                            )}`}
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}