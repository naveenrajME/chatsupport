import React, { useState } from 'react';
import ChatWindow from '../components/chatbot/ChatWindow';

const ChatPage = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Hero Section */}
      <div className="text-center max-w-lg">
        <div className="text-5xl mb-4">💬</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">How can we help you?</h1>
        <p className="text-gray-500 mb-8 text-lg">
          Chat with our support assistant to get help or create a support ticket instantly.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
        >
          Start Chat
        </button>
        <p className="mt-4 text-sm text-gray-400">
          Are you an admin?{' '}
          <a href="/admin/login" className="text-indigo-500 hover:underline font-medium">
            Go to Admin Panel →
          </a>
        </p>
      </div>

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
            {/* Close button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center text-gray-500 hover:text-gray-800 transition"
                title="Close"
              >
                ✕
              </button>
            </div>
            <ChatWindow />
          </div>
        </div>
      )}

      {/* Floating chat button (when widget is closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 transform hover:scale-110"
          title="Open chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatPage;
