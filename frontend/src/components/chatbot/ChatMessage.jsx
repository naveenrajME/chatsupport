import React from 'react';

const TypingIndicator = () => (
  <div className="flex items-end gap-2 mb-4">
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{background: '#145476'}}>
      <img src="https://sandbox.saafe.in/static/media/saafe_light.a6365baa.png" alt="S" className="w-5 h-5 object-contain brightness-0 invert" />
    </div>
    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
      <div className="flex gap-1 items-center h-4">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
    </div>
  </div>
);

const ChatMessage = ({ message, isTyping }) => {
  if (isTyping) return <TypingIndicator />;

  const isBot = message.sender === 'bot';

  return (
    <div className={`flex items-end gap-2 mb-4 ${isBot ? '' : 'flex-row-reverse'}`}>
      {isBot && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{background: '#145476'}}>
          <img src="https://sandbox.saafe.in/static/media/saafe_light.a6365baa.png" alt="S" className="w-5 h-5 object-contain brightness-0 invert" />
        </div>
      )}

      <div className={`max-w-[75%] flex flex-col gap-1 ${isBot ? 'items-start' : 'items-end'}`}>
        {/* Image attachment */}
        {message.imagePreview && (
          <div className={`rounded-2xl overflow-hidden shadow-sm ${isBot ? 'rounded-bl-none' : 'rounded-br-none'}`}>
            <img
              src={message.imagePreview}
              alt="Attachment"
              className="max-w-[220px] max-h-[180px] object-cover cursor-pointer"
              onClick={() => window.open(message.imagePreview, '_blank')}
            />
          </div>
        )}

        {/* Text bubble */}
        {message.text && (
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
              isBot
                ? 'bg-white border border-gray-200 rounded-bl-none text-gray-800'
                : 'rounded-br-none text-white'
            }`}
            style={!isBot ? {background: '#145476'} : {}}
          >
            {message.text}
          </div>
        )}
      </div>

      {!isBot && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
          U
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
