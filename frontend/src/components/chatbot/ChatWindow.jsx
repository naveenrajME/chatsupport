import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import api from '../../api/axios';

const STEPS = {
  GREETING: 'greeting',
  ASK_ISSUE: 'ask_issue',
  ASK_ISSUE_TEXT: 'ask_issue_text', // image received, waiting for text description
  ASK_SCREENSHOT: 'ask_screenshot',  // description received, asking for optional screenshot
  ASK_CONTACT: 'ask_contact',
  CONFIRM: 'confirm',
  SUBMITTING: 'submitting',
  DONE: 'done',
};

const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
const validatePhone = (val) => /^[6-9]\d{9}$/.test(val.replace(/\s/g, ''));

const botDelay = (ms = 1000) => new Promise((res) => setTimeout(res, ms));

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(STEPS.GREETING);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [ticketData, setTicketData] = useState({ issue: '', contact: '', contactType: '', imageFile: null });
  const bottomRef = useRef(null);
  const initRan = useRef(false);

  const addMessage = (text, sender = 'bot', imagePreview = null) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), text, sender, imagePreview }]);
  };

  const botSay = async (text, delay = 1000) => {
    setIsTyping(true);
    await botDelay(delay);
    setIsTyping(false);
    addMessage(text, 'bot');
  };

  const moveToContact = async () => {
    await botSay('Got it! Thanks for sharing.', 800);
    await botSay('Could you please share your 📧 Email ID or 📱 Mobile Number so we can follow up with you?');
    setStep(STEPS.ASK_CONTACT);
    setInputDisabled(false);
  };

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    const init = async () => {
      setInputDisabled(true);
      await botSay('👋 Hi there! Welcome to Support. I\'m here to help you.', 800);
      await botSay('Could you please describe the issue or problem you\'re facing?', 1200);
      setStep(STEPS.ASK_ISSUE);
      setInputDisabled(false);
    };
    init();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleUserSend = async (text, imageFile = null) => {
    const imagePreview = imageFile ? URL.createObjectURL(imageFile) : null;
    addMessage(text, 'user', imagePreview);
    setInputDisabled(true);

    // ── Step: ASK_ISSUE ──────────────────────────────────────────
    if (step === STEPS.ASK_ISSUE) {
      const hasText = text && text.trim().length >= 5;
      const hasImage = !!imageFile;

      if (!text && !imageFile) {
        await botSay('Please describe your issue or attach a screenshot so I can help you.');
        setInputDisabled(false);
        return;
      }

      if (!hasText && !hasImage) {
        await botSay('Please describe your issue in a bit more detail (at least a few words).');
        setInputDisabled(false);
        return;
      }

      if (hasImage && !hasText) {
        // Image sent without text — save image and ask for description
        setTicketData((prev) => ({ ...prev, imageFile }));
        await botSay('Thanks for the screenshot! Could you also describe the issue in a few words so our team knows what to look into?', 900);
        setStep(STEPS.ASK_ISSUE_TEXT);
        setInputDisabled(false);
        return;
      }

      if (hasText && hasImage) {
        // Both text and image provided — skip screenshot step
        setTicketData((prev) => ({ ...prev, issue: text.trim(), imageFile }));
        await moveToContact();
        return;
      }

      // Text only — ask for screenshot before contact
      setTicketData((prev) => ({ ...prev, issue: text.trim() }));
      await botSay('Thanks! Do you have a screenshot of the issue? If yes, attach it below. If not, type **skip** to continue.', 900);
      setStep(STEPS.ASK_SCREENSHOT);
      setInputDisabled(false);
      return;
    }

    // ── Step: ASK_ISSUE_TEXT (got image, waiting for description) ─
    if (step === STEPS.ASK_ISSUE_TEXT) {
      const hasText = text && text.trim().length >= 3;

      if (!hasText) {
        await botSay('Just a brief description will do — even a few words help our team understand the issue.');
        setInputDisabled(false);
        return;
      }

      setTicketData((prev) => ({ ...prev, issue: text.trim() }));
      await moveToContact();
      return;
    }

    // ── Step: ASK_SCREENSHOT ──────────────────────────────────────
    if (step === STEPS.ASK_SCREENSHOT) {
      const skipped = ['skip', 'no', 'n', 'nope', 'none'].includes(text.toLowerCase().trim());

      if (imageFile) {
        // User attached an image
        setTicketData((prev) => ({ ...prev, imageFile }));
        await botSay('Got it! Screenshot saved.', 700);
        await moveToContact();
        return;
      }

      if (skipped || (!imageFile && text)) {
        // User chose to skip
        await moveToContact();
        return;
      }

      await botSay('Please attach a screenshot or type **skip** to continue without one.');
      setInputDisabled(false);
      return;
    }

    // ── Step: ASK_CONTACT ─────────────────────────────────────────
    if (step === STEPS.ASK_CONTACT) {
      const trimmed = text.trim();
      let contactType = '';

      if (validateEmail(trimmed)) {
        contactType = 'email';
      } else if (validatePhone(trimmed)) {
        contactType = 'phone';
      } else {
        await botSay('Please enter a valid 10-digit mobile number (starting with 6-9) or a valid email address.\n\nExample: 9876543210 or name@email.com');
        setInputDisabled(false);
        return;
      }

      setTicketData((prev) => ({ ...prev, contact: trimmed, contactType }));

      await botSay('Perfect! Here\'s a summary of your ticket:', 800);
      // Read issue and imageFile from current ticketData via closure
      await botSay(
        `📋 Issue: ${ticketData.issue}\n📬 Contact: ${trimmed} (${contactType})${ticketData.imageFile ? '\n📎 Screenshot: Attached' : ''}\n\nType **yes** to submit or **no** to start over.`,
        1000
      );
      setStep(STEPS.CONFIRM);
      setInputDisabled(false);
      return;
    }

    // ── Step: CONFIRM ─────────────────────────────────────────────
    if (step === STEPS.CONFIRM) {
      const lower = text.toLowerCase().trim();
      const isYes = ['yes', 'y', 'confirm', 'submit', 'ok', 'okay', 'sure', 'yep', 'yeah'].includes(lower);
      const isNo = ['no', 'n', 'cancel', 'restart', 'reset', 'start over'].includes(lower);

      if (isYes) {
        setStep(STEPS.SUBMITTING);
        await botSay('Submitting your ticket... ⏳', 600);

        try {
          const formData = new FormData();
          formData.append('issueDescription', ticketData.issue);
          formData.append('contact', ticketData.contact);
          formData.append('contactType', ticketData.contactType);
          if (ticketData.imageFile) formData.append('image', ticketData.imageFile);

          const res = await api.post('/tickets', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          await botSay(
            `✅ Your support ticket has been created!\n\n🎫 Ticket ID: ${res.data.ticketId}\n\nOur team will reach out to you shortly. Thank you!`,
            800
          );
          setStep(STEPS.DONE);
          setInputDisabled(true);
        } catch (err) {
          await botSay('Sorry, there was an error submitting your ticket. Please try again.');
          setStep(STEPS.CONFIRM);
          setInputDisabled(false);
        }
        return;
      }

      if (isNo) {
        setTicketData({ issue: '', contact: '', contactType: '', imageFile: null });
        await botSay('No problem! Let\'s start over.', 600);
        await botSay('Please describe your issue or attach a screenshot.');
        setStep(STEPS.ASK_ISSUE);
        setInputDisabled(false);
        return;
      }

      await botSay('Type **yes** to submit the ticket or **no** to start over.');
      setInputDisabled(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">S</div>
        <div>
          <div className="font-semibold text-sm">Support Assistant</div>
          <div className="text-xs text-indigo-200 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
            Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isTyping && <ChatMessage isTyping />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleUserSend} disabled={inputDisabled} />
    </div>
  );
};

export default ChatWindow;
