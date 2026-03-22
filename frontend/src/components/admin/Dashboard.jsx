import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import TicketList from './TicketList';
import TicketDetail from './TicketDetail';
import ChangePassword from './ChangePassword';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUSES = ['All', 'Created', 'Assigned', 'Fixed', 'Closed'];

const TIME_FILTERS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today',    value: 'today' },
  { label: '1 Week',   value: 'week' },
  { label: '1 Month',  value: 'month' },
  { label: 'Custom',   value: 'custom' },
];

const applyTimeFilter = (tickets, timeFilter, dateFrom, dateTo) => {
  if (timeFilter === 'all') return tickets;
  const now = new Date();
  const startOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  if (timeFilter === 'today') {
    const start = startOf(now);
    return tickets.filter((t) => new Date(t.createdAt) >= start);
  }
  if (timeFilter === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    return tickets.filter((t) => new Date(t.createdAt) >= start);
  }
  if (timeFilter === 'month') {
    const start = new Date(now); start.setMonth(now.getMonth() - 1);
    return tickets.filter((t) => new Date(t.createdAt) >= start);
  }
  if (timeFilter === 'custom') {
    const from = dateFrom ? startOf(dateFrom) : null;
    const to   = dateTo   ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : null;
    return tickets.filter((t) => {
      const d = new Date(t.createdAt);
      return (!from || d >= from) && (!to || d <= to);
    });
  }
  return tickets;
};

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
  const [timeFilter, setTimeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Header bar
    doc.setFillColor(20, 84, 118);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Saafe Support — Tickets Report', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${dateStr}`, doc.internal.pageSize.getWidth() - 14, 12, { align: 'right' });

    // Summary row
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.text(
      `Total: ${stats.total}   Created: ${stats.created}   Assigned: ${stats.assigned}   Fixed: ${stats.fixed}   Closed: ${stats.closed}`,
      14, 24
    );

    autoTable(doc, {
      startY: 28,
      head: [['Ticket ID', 'User', 'Issue', 'Contact', 'Type', 'Status', 'Notes', 'Created At']],
      body: filteredTickets.map((t) => [
        t.ticketId || '',
        t.userName || '',
        t.issueDescription || '',
        t.contact || '',
        t.contactType || '',
        t.status || '',
        t.notes || '',
        t.createdAt ? new Date(t.createdAt).toLocaleString() : '',
      ]),
      headStyles: { fillColor: [20, 84, 118], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [240, 248, 252] },
      columnStyles: { 2: { cellWidth: 60 }, 6: { cellWidth: 40 } },
      styles: { overflow: 'linebreak', cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });

    doc.save(`tickets_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleDownload = () => {
    const headers = ['Ticket ID', 'User Name', 'Issue Description', 'Contact', 'Contact Type', 'Second Contact', 'Second Contact Type', 'Status', 'Notes', 'Created At', 'Updated At', 'Closed At'];
    const escape = (val) => {
      const s = val == null ? '' : String(val);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filteredTickets.map((t) => [
      t.ticketId, t.userName, t.issueDescription, t.contact, t.contactType,
      t.secondContact, t.secondContactType, t.status, t.notes,
      t.createdAt, t.updatedAt, t.closedAt,
    ].map(escape).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTickets = applyTimeFilter(tickets, timeFilter, dateFrom, dateTo);

  const stats = {
    total: filteredTickets.length,
    created: filteredTickets.filter((t) => t.status === 'Created').length,
    assigned: filteredTickets.filter((t) => t.status === 'Assigned').length,
    fixed: filteredTickets.filter((t) => t.status === 'Fixed').length,
    closed: filteredTickets.filter((t) => t.status === 'Closed').length,
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/80">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu((v) => !v)}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors font-bold text-white text-sm uppercase"
              title={admin?.username}
            >
              {admin?.username?.[0] || 'A'}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Logged in as</div>
                  <div className="font-semibold text-gray-800 dark:text-white text-sm">{admin?.username}</div>
                </div>
                {/* Actions */}
                <button
                  onClick={() => { setShowProfileMenu(false); setShowChangePassword(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Change Password
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
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
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
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
                {/* Refresh */}
                <button
                  onClick={fetchTickets}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Refresh
                </button>
                {/* Download CSV */}
                <button
                  onClick={handleDownload}
                  disabled={filteredTickets.length === 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  CSV
                </button>
                {/* Download PDF */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={filteredTickets.length === 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  PDF
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Status Filter */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Status</span>
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
              </div>

              <div className="w-px self-stretch bg-gray-200 dark:bg-gray-600 hidden sm:block mx-1" />

              {/* Time Filter */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Period</span>
                <div className="flex gap-1 flex-wrap items-center">
                  {TIME_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => { setTimeFilter(f.value); if (f.value !== 'custom') { setDateFrom(''); setDateTo(''); } }}
                      style={timeFilter === f.value ? {background: '#0bb3c1'} : {}}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        timeFilter === f.value
                          ? 'text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                  {/* Custom Date Pickers */}
                  {timeFilter === 'custom' && (
                    <div className="flex items-center gap-2 ml-1">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                    </div>
                  )}
                </div>
              </div>
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
            <TicketList tickets={filteredTickets} onSelect={setSelectedTicket} />
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
