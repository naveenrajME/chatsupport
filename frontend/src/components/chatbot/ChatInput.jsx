import React, { useState, useRef } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 5;

const ChatInput = ({ onSend, disabled }) => {
  const [value, setValue] = useState('');
  const [image, setImage] = useState(null); // { file, preview }
  const [imageError, setImageError] = useState('');
  const fileRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;
    if (!value.trim() && !image) return;
    onSend(value.trim(), image?.file || null);
    setValue('');
    setImage(null);
    setImageError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('Only JPG, PNG, GIF, WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setImageError(`Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setImageError('');
    setImage({ file, preview: URL.createObjectURL(file) });
  };

  const removeImage = () => {
    if (image?.preview) URL.revokeObjectURL(image.preview);
    setImage(null);
    setImageError('');
  };

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Image preview */}
      {image && (
        <div className="px-4 pt-3 flex items-center gap-2">
          <div className="relative inline-block">
            <img
              src={image.preview}
              alt="Preview"
              className="h-16 w-16 object-cover rounded-lg border border-gray-200"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
            >
              ✕
            </button>
          </div>
          <span className="text-xs text-gray-500 truncate max-w-[160px]">{image.file.name}</span>
        </div>
      )}

      {imageError && (
        <p className="px-4 pt-2 text-xs text-red-500">{imageError}</p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 p-4 items-center">
        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="w-10 h-10 flex-shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-500 transition-colors"
          title="Attach image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        </button>

        {/* Text input */}
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-100"
          placeholder={disabled ? 'Chat ended' : 'Type your message...'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          autoFocus
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={(!value.trim() && !image) || disabled}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
