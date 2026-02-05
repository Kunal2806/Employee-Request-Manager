'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [user, setUser] = useState<UserSession>({ name: '', email: '' });
  const { data: session } = useSession();
  const userid = session?.user.id;
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
      console.log(userid)
      const response = await fetch(`/api/user/${userid}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  // Fetch user session
  // const fetchUserSession = async () => {
  //   try {
  //     const response = await fetch('/api/auth/session');
  //     if (response.ok) {
  //       const data = await response.json();
  //       setUser(data);
  //     }
  //   } catch (err) {
  //     console.error('Failed to fetch user session:', err);
  //   }
  // };

  useEffect(() => {
    fetchRequests();
    setUser({name: session?.user.name || "" , email: session?.user.email || ""});
    // fetchUserSession();
  }, []);

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
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      const data = await response.json();
      console.log(data)

      if (response.ok) {
        // Reset form and close modal
        setFormData({
          type: 'holiday',
          reason: '',
          startDate: '',
          endDate: '',
        });
        setShowNewRequestForm(false);
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

  // Cancel request (if pending)
  // const handleCancelRequest = async (id: string) => {
  //   if (!confirm('Are you sure you want to cancel this request?')) return;

  //   try {
  //     const response = await fetch(`/api/user/${id}`, {
  //       method: 'DELETE',
  //     });

  //     if (response.ok) {
  //       fetchRequests();
  //     }
  //   } catch (err) {
  //     console.error('Failed to cancel request:', err);
  //   }
  // };

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
  const totalDaysRequested = requests.reduce((total, req) => {
    return total + calculateDays(req.startDate, req.endDate);
  }, 0);
  const approvedDays = requests
    .filter(r => r.status === 'accepted')
    .reduce((total, req) => total + calculateDays(req.startDate, req.endDate), 0);

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-rose-600" />;
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

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              {`Hii!,  ${user.name}`}
            </h1>
            <p className="text-slate-600">
              {`E-mail: ${user.email}`}
            </p>
            <p onClick={handleLogout} className='text-red-500 hover:cursor-pointer'>
              logout
            </p>
          </div>
          <button
            onClick={() => setShowNewRequestForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Request
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-blue-600 mb-1">{requests.length}</div>
            <div className="text-sm text-slate-600">Total Requests</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-amber-600 mb-1">{pendingCount}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-emerald-600 mb-1">{acceptedCount}</div>
            <div className="text-sm text-slate-600">Approved</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-rose-600 mb-1">{deniedCount}</div>
            <div className="text-sm text-slate-600">Denied</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {approvedDays}
              <span className="text-lg text-slate-400 ml-1">/ {totalDaysRequested}</span>
            </div>
            <div className="text-sm text-slate-600">Approved / Total Days</div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-md border border-slate-200 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                No requests yet
              </h3>
              <p className="text-slate-600 mb-4">
                Start by creating your first time-off request
              </p>
              <button
                onClick={() => setShowNewRequestForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Request
              </button>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {getTypeLabel(request.type)}
                        </h3>
                        <span className="text-2xl">{getTypeIcon(request.type)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(request.startDate)} – {formatDate(request.endDate)}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span>{calculateDays(request.startDate, request.endDate)} days</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeStyle(
                      request.status
                    )}`}
                  >
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-1">Reason:</p>
                  <p className="text-slate-600">{request.reason}</p>
                </div>

                {/* {request.status === 'pending' && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      Cancel Request
                    </button>
                  </div>
                )} */}
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Request Modal */}
      {showNewRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-slate-800">New Request</h2>
              <button
                onClick={() => {
                  setShowNewRequestForm(false);
                  setFormError('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-6">
              {/* Request Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Request Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="holiday">🏖️ Holiday</option>
                  <option value="work_from_home">🏠 Work from Home</option>
                  <option value="halfday">⏰ Half Day</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              {/* Duration Display */}
              {formData.startDate && formData.endDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">
                    Duration: {calculateDays(formData.startDate, formData.endDate)}{' '}
                    {calculateDays(formData.startDate, formData.endDate) === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Reason *
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Please provide a reason for your request..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  required
                />
              </div>

              {/* Error Message */}
              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700">{formError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRequestForm(false);
                    setFormError('');
                  }}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}