import React, { useState, useEffect } from 'react';

const statusConfig = {
  Created:  { label: 'Created',  class: 'bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700' },
  Assigned: { label: 'Assigned', class: 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700' },
  Fixed:    { label: 'Fixed',    class: 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' },
  Closed:   { label: 'Closed',   class: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700' },
};

const PAGE_SIZE = 10;

const TicketList = ({ tickets, onSelect }) => {
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [tickets]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
        <div className="text-5xl mb-4">📭</div>
        <p className="text-lg font-medium">No tickets found</p>
        <p className="text-sm mt-1">Try adjusting your filters or search.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(tickets.length / PAGE_SIZE);
  const paginated = tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ticket ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Issue</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((ticket) => {
              const sc = statusConfig[ticket.status] || statusConfig.Assigned;
              return (
                <tr key={ticket._id} onClick={() => onSelect(ticket)} className="border-b border-gray-100 dark:border-gray-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{ticket.ticketId}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="truncate text-gray-700 dark:text-gray-300" title={ticket.issueDescription}>{ticket.issueDescription}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-gray-600 dark:text-gray-400">{ticket.contact}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">{ticket.contactType}</div>
                    {ticket.secondContact && (
                      <>
                        <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-0.5">{ticket.secondContact}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">{ticket.secondContactType}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sc.class}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{formatDate(ticket.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onSelect(ticket)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-xs hover:underline">
                      {ticket.status === 'Closed' ? 'View' : 'View / Edit'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tickets.length)} of {tickets.length} tickets
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={page === p ? { background: '#145476' } : {}}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                  page === p
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketList;
