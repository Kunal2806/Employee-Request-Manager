'use client';

import { useEffect, useState } from 'react';
import { Search, Calendar, Filter, X } from 'lucide-react';
import { signOut } from 'next-auth/react';

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

export default function EmployeeRequestsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | RequestType>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [requestData, setRequestData] = useState<EmployeeRequest[]>([]);
  const [filterData, setFilterData] = useState<EmployeeRequest[]>([]);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/holidays");
      if (response.ok) {
        const data = await response.json();
        setRequestData(data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = requestData;

    if (searchQuery.trim() !== "") {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((item) => item.type === typeFilter);
    }

    if (fromDate && toDate) {
      filtered = filtered.filter((item) => {
        const requestStart = new Date(item.startDate);
        const requestEnd = new Date(item.endDate);
        const filterStart = new Date(fromDate);
        const filterEnd = new Date(toDate);
        
        return requestStart <= filterEnd && requestEnd >= filterStart;
      });
    } else if (fromDate) {
      filtered = filtered.filter(
        (item) => new Date(item.endDate) >= new Date(fromDate)
      );
    } else if (toDate) {
      filtered = filtered.filter(
        (item) => new Date(item.startDate) <= new Date(toDate)
      );
    }

    setFilterData(filtered);
  }, [requestData, searchQuery, statusFilter, typeFilter, fromDate, toDate]);

  const updateRequestStatus = async (id: string, newStatus: RequestStatus) => {
    try {
      const response = await fetch(`/api/holidays/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setFromDate('');
    setToDate('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || 
                          typeFilter !== 'all' || fromDate !== '' || toDate !== '';

  // Calculate days between start and end date
  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Calculate total duration for requests
  const calculateTotalDuration = (requests: EmployeeRequest[]) => {
    return requests.reduce((total, request) => {
      return total + calculateDays(request.startDate, request.endDate);
    }, 0);
  };

  // Calculate stats
  const totalRequests = requestData.length;
  const pendingCount = requestData.filter(data => data.status === "pending").length;
  const acceptedCount = requestData.filter(data => data.status === "accepted").length;
  const deniedCount = requestData.filter(data => data.status === "denied").length;
  const filteredDuration = calculateTotalDuration(filterData);
  const totalDuration = calculateTotalDuration(requestData);

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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleLogout = async () => {
    await signOut({ redirectTo: "/auth/login" });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Employee Requests
          </h1>
          <p className="text-slate-600">
            Manage time-off and work arrangements
          </p>
          <p onClick={handleLogout} className='text-red-500 hover:cursor-pointer'>
              logout
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-blue-600 mb-1">{totalRequests}</div>
            <div className="text-sm text-slate-600">Total Requests</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-amber-600 mb-1">{pendingCount}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-emerald-600 mb-1">{acceptedCount}</div>
            <div className="text-sm text-slate-600">Accepted</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-rose-600 mb-1">{deniedCount}</div>
            <div className="text-sm text-slate-600">Denied</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {filteredDuration}
              {hasActiveFilters && (
                <span className="text-lg text-slate-400 ml-1">/ {totalDuration}</span>
              )}
            </div>
            <div className="text-sm text-slate-600">
              {hasActiveFilters ? 'Filtered Days / Total' : 'Total Days'}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 mb-6 space-y-4">
          {/* Header with Clear Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-700">Date Range:</span>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-slate-700 mr-2">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('accepted')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === 'accepted'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Accepted
            </button>
            <button
              onClick={() => setStatusFilter('denied')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === 'denied'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Denied
            </button>
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-slate-700 mr-2">Type:</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                typeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('holiday')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                typeFilter === 'holiday'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Holiday
            </button>
            <button
              onClick={() => setTypeFilter('work_from_home')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                typeFilter === 'work_from_home'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Work from Home
            </button>
            <button
              onClick={() => setTypeFilter('halfday')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                typeFilter === 'halfday'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Half Day
            </button>
            <button
              onClick={() => setTypeFilter('other')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                typeFilter === 'other'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Other
            </button>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-slate-200">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-slate-600">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
                    {`Search: "{searchQuery}"`}
                    <button onClick={() => setSearchQuery('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {typeFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
                    Type: {getTypeLabel(typeFilter)}
                    <button onClick={() => setTypeFilter('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {fromDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
                    From: {formatDate(fromDate)}
                    <button onClick={() => setFromDate('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {toDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
                    To: {formatDate(toDate)}
                    <button onClick={() => setToDate('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filterData.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                  {request.name.split(' ').map(n => n[0]).join('')}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {request.name}
                      </h3>
                      <p className="text-sm text-slate-500">{request.email}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeStyle(
                        request.status
                      )}`}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-200">
                      {getTypeIcon(request.type)} {getTypeLabel(request.type)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {calculateDays(request.startDate, request.endDate)} {calculateDays(request.startDate, request.endDate) === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <p className="text-slate-700 mb-3">{request.reason}</p>

                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(request.startDate)} – {formatDate(request.endDate)}
                      </span>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateRequestStatus(request.id, 'accepted')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateRequestStatus(request.id, 'denied')}
                        className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium"
                      >
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {filterData.length === 0 && (
            <div className="bg-white rounded-2xl p-12 shadow-md border border-slate-200 text-center">
              <Filter className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                No requests found
              </h3>
              <p className="text-slate-600 mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more results'
                  : 'No employee requests available at the moment'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}