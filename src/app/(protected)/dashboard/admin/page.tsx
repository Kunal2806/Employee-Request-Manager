'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, X, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
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

interface AdminSession {
  name: string;
  email: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<EmployeeRequest[]>([]);
  const [admin, setAdmin] = useState<AdminSession>({ name: '', email: '' });
  const { data: session } = useSession();

  // Filter state
  const [filters, setFilters] = useState({
    status: 'all' as RequestStatus | 'all',
    type: 'all' as RequestType | 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  // Fetch all requests
  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/holidays');
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
    fetchRequests();
    setAdmin({ name: session?.user.name || "", email: session?.user.email || "" });
  }, [session]);

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
        r.name.toLowerCase().includes(searchLower) ||
        r.email.toLowerCase().includes(searchLower) ||
        r.reason.toLowerCase().includes(searchLower) ||
        getTypeLabel(r.type).toLowerCase().includes(searchLower)
      );
    }

    // Date range filter - show requests that overlap with the selected date range
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(r => {
        const requestStart = new Date(r.startDate);
        const requestEnd = new Date(r.endDate);
        
        // If only dateFrom is set, show requests that end on or after dateFrom
        if (filters.dateFrom && !filters.dateTo) {
          const fromDate = new Date(filters.dateFrom);
          return requestEnd >= fromDate;
        }
        
        // If only dateTo is set, show requests that start on or before dateTo
        if (!filters.dateFrom && filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          return requestStart <= toDate;
        }
        
        // If both are set, show requests that overlap with the date range
        if (filters.dateFrom && filters.dateTo) {
          const fromDate = new Date(filters.dateFrom);
          const toDate = new Date(filters.dateTo);
          // Request overlaps if it starts before the range ends AND ends after the range starts
          return requestStart <= toDate && requestEnd >= fromDate;
        }
        
        return true;
      });
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

  // Update request status (admin action)
  const updateRequestStatus = async (id: string, newStatus: RequestStatus) => {
    try {
      const response = await fetch(`/api/holidays/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
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
  const totalRequests = requests.length;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-1">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            {admin.email}
          </p>
          <button onClick={handleLogout} className='text-red-500 hover:text-red-600 text-xs font-medium mt-1'>
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-md border border-slate-200">
            <div className="text-2xl font-bold text-blue-600 mb-0.5">{totalRequests}</div>
            <div className="text-xs text-slate-600">Total Requests</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border border-slate-200">
            <div className="text-2xl font-bold text-amber-600 mb-0.5">{pendingCount}</div>
            <div className="text-xs text-slate-600">Pending</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border border-slate-200">
            <div className="text-2xl font-bold text-emerald-600 mb-0.5">{acceptedCount}</div>
            <div className="text-xs text-slate-600">Approved</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border border-slate-200">
            <div className="text-2xl font-bold text-rose-600 mb-0.5">{deniedCount}</div>
            <div className="text-xs text-slate-600">Denied</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border border-slate-200">
            <div className="text-2xl font-bold text-purple-600 mb-0.5">{approvedDays}</div>
            <div className="text-xs text-slate-600">Approved Days</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 mb-4 overflow-hidden">
          <div className="p-3 space-y-3">
            {/* First Row - Search and Quick Filters */}
            <div className="flex items-center justify-between gap-3">
              {/* Search */}
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or reason..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                />
              </div>

              {/* Filter Toggle & Quick Filters */}
              <div className="flex items-center gap-2">
                {/* Status Quick Filter */}
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
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
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                >
                  <option value="all">All Types</option>
                  <option value="holiday">Holiday</option>
                  <option value="work_from_home">Work from Home</option>
                  <option value="halfday">Half Day</option>
                  <option value="other">Other</option>
                </select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Second Row - Date Range Filter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-medium">Filter by Date:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  title="Show requests on or after this date"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  min={filters.dateFrom}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  title="Show requests on or before this date"
                />
              </div>
              {(filters.dateFrom || filters.dateTo) && (
                <span className="text-xs text-slate-500 italic">
                  Showing requests within this range
                </span>
              )}
            </div>
          </div>

          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="px-3 pb-2 flex items-center gap-2 text-xs border-t border-slate-100 pt-2">
              <span className="text-slate-500">Showing {filteredRequests.length} of {requests.length} requests</span>
            </div>
          )}
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 ">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {hasActiveFilters ? 'No matching requests' : 'No requests yet'}
              </h3>
              <p className="text-slate-600 mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your filters' 
                  : 'No employee requests available at the moment'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                      {/* Employee Column */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-slate-800 truncate max-w-[150px]">
                            {request.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[150px]">
                            {request.email}
                          </div>
                        </div>
                      </td>

                      {/* Type Column */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{getTypeIcon(request.type)}</span>
                          <span className="text-xs font-medium text-slate-800">
                            {getTypeLabel(request.type)}
                          </span>
                        </div>
                      </td>

                      {/* Date Range Column */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {formatDate(request.startDate)} – {formatDate(request.endDate)}
                          </span>
                        </div>
                      </td>

                      {/* Days Column */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-slate-800">
                          {calculateDays(request.startDate, request.endDate)}
                        </span>
                      </td>

                      {/* Reason Column */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600 line-clamp-2 max-w-[200px]">
                          {request.reason}
                        </p>
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(request.status)}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(
                              request.status
                            )}`}
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {request.status === 'pending' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateRequestStatus(request.id, 'accepted')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Accept
                            </button>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'denied')}
                              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-xs font-medium flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Deny
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
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