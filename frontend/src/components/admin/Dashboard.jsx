import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import TicketList from './TicketList';
import TicketDetail from './TicketDetail';
import ChangePassword from './ChangePassword';

const STATUSES = ['All', 'Created', 'Assigned', 'Fixed', 'Closed'];

const StatCard = ({ label, value, color }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4 ${color}`}>
    <div className="text-2xl font-bold text-gray-800 dark:text-white">{value}</div>
    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
  </div>
);

const Dashboard = () => {
  const { admin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/tickets', { params });
      setTickets(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate('/admin/login');
      } else {
        setError('Failed to load tickets.');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, logout, navigate]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchTickets(), 300);
    return () => clearTimeout(debounce);
  }, [fetchTickets]);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const handleTicketUpdate = (updated) => {
    setTickets((prev) => prev.map((t) => (t.ticketId === updated.ticketId ? updated : t)));
  };

  const stats = {
    total: tickets.length,
    created: tickets.filter((t) => t.status === 'Created').length,
    assigned: tickets.filter((t) => t.status === 'Assigned').length,
    fixed: tickets.filter((t) => t.status === 'Fixed').length,
    closed: tickets.filter((t) => t.status === 'Closed').length,
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'admin-bg-dark' : 'admin-bg-light'}`}>
      {/* Navbar */}
      <nav className="px-6 py-3 flex items-center justify-between shadow-md" style={{background: '#145476'}}>
        <div className="flex items-center gap-3">
          <img
            src="https://sandbox.saafe.in/static/media/saafe_light.a6365baa.png"
            alt="Saafe Logo"
            className="h-10 object-contain"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80 hidden sm:block">
            Logged in as <span className="font-semibold text-white">{admin?.username}</span>
          </span>
          <a href="/" target="_blank" rel="noreferrer" className="text-sm text-cyan-300 hover:text-white hover:underline transition-colors">Open Chat</a>

          {/* Dark/Light Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 6.106a.75.75 0 001.06 1.06l1.591-1.59a.75.75 0 10-1.06-1.061L6.166 6.106z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setShowChangePassword(true)}
            className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-medium transition"
          >
            Change Password
          </button>
          <button
            onClick={handleLogout}
            className="text-sm bg-red-500/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Tickets" value={stats.total} color="border-indigo-500" />
          <StatCard label="Created" value={stats.created} color="border-violet-500" />
          <StatCard label="Assigned" value={stats.assigned} color="border-yellow-500" />
          <StatCard label="Fixed" value={stats.fixed} color="border-blue-500" />
          <StatCard label="Closed" value={stats.closed} color="border-green-500" />
        </div>

        {/* Ticket Inbox */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h2 className="font-bold text-gray-800 dark:text-white text-lg">Ticket Inbox</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm pl-9 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-56"
                />
                <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              {/* Status Filter */}
              <div className="flex gap-1 flex-wrap">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    style={statusFilter === s ? {background: '#145476'} : {}}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      statusFilter === s
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Refresh */}
              <button
                onClick={fetchTickets}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">{error}</div>
          ) : (
            <TicketList tickets={tickets} onSelect={setSelectedTicket} />
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && <ChangePassword onClose={() => setShowChangePassword(false)} />}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleTicketUpdate}
        />
      )}
    </div>
  );
};

export default Dashboard;
