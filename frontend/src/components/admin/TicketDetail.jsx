import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const TicketDetail = ({ ticket, onClose, onUpdate }) => {
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState(ticket.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isClosed = ticket.status === 'Closed';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.patch(`/tickets/${ticket.ticketId}`, { status, notes });
      onUpdate(res.data);
      onClose();
    } catch (err) {
      setError('Failed to update ticket. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white text-lg">Ticket Details</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{ticket.ticketId}</p>
          </div>
          {isClosed && (
            <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 px-2.5 py-1 rounded-full font-semibold">
              🔒 Closed — Read Only
            </span>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">Issue Description</div>
            <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{ticket.issueDescription}</div>
          </div>

          {ticket.attachmentUrl && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wide">Attached Image</div>
              <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer">
                <img
                  src={ticket.attachmentUrl}
                  alt="Attachment"
                  className="rounded-xl border border-gray-200 dark:border-gray-600 max-h-52 object-contain bg-gray-50 dark:bg-gray-700 w-full cursor-pointer hover:opacity-90 transition"
                />
              </a>
              <p className="text-xs text-gray-400 mt-1">Click image to open full size</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">Contact</div>
              <div className="text-gray-800 dark:text-gray-200 text-sm font-mono">{ticket.contact}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">{ticket.contactType}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">Created</div>
              <div className="text-gray-800 dark:text-gray-200 text-sm">{formatDate(ticket.createdAt)}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isClosed}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="Created">Created</option>
              <option value="Assigned">Assigned</option>
              <option value="Fixed">Fixed</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">Admin Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isClosed}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={isClosed ? 'Ticket is closed' : 'Add notes about this ticket...'}
            />
          </div>

          {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 text-sm">{error}</div>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            {isClosed ? 'Close' : 'Cancel'}
          </button>
          {!isClosed && (
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg py-2.5 text-sm font-semibold transition">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
