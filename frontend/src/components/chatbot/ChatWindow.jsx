import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import api from '../../api/axios';
import strings from './i18n';

const STEPS = {
  GREETING: 'greeting',
  ASK_ISSUE: 'ask_issue',
  ASK_ISSUE_TEXT: 'ask_issue_text',
  ASK_SCREENSHOT: 'ask_screenshot',
  ASK_EMAIL: 'ask_email',
  ASK_CONTACT: 'ask_contact',
  CONFIRM: 'confirm',
  SUBMITTING: 'submitting',
  DONE: 'done',
};

const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
const validatePhone = (val) => /^[6-9]\d{9}$/.test(val.replace(/\s/g, ''));
const botDelay = (ms = 1000) => new Promise((res) => setTimeout(res, ms));

const decodeTokenPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

// Resolve a bot message from a key + params using a given language strings object
const resolveMsg = (t, key, params = []) => {
  const val = t[key];
  if (val === undefined) return '';
  return typeof val === 'function' ? val(...params) : val;
};

const ChatWindow = ({ token = '' }) => {
  const userClaims = token ? decodeTokenPayload(token) : null;
  const userName = userClaims ? `${userClaims.first_name || ''} ${userClaims.last_name || ''}`.trim() : '';
  const userPhone = userClaims?.phone_number || '';

  const [lang, setLang] = useState('en');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(STEPS.GREETING);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [ticketData, setTicketData] = useState({
    issue: '', contact: userPhone, contactType: userPhone ? 'phone' : '',
    secondContact: '', secondContactType: '', imageFile: null,
  });
  const bottomRef = useRef(null);
  const initRan = useRef(false);

  // Always use current lang for interaction logic
  const t = strings[lang];

  // Add a user message (plain text)
  const addUserMessage = (text, imagePreview = null) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), text, sender: 'user', imagePreview }]);
  };

  // Add a bot message — store key + params so it re-renders when lang changes
  const addBotMessage = (key, params = []) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), msgKey: key, msgParams: params, sender: 'bot' }]);
  };

  const botSay = async (key, params = [], delay = 1000) => {
    setIsTyping(true);
    await botDelay(delay);
    setIsTyping(false);
    addBotMessage(key, params);
  };

  const moveToContact = async (issue, imageFile) => {
    if (userPhone) {
      await botSay('gotIt', [], 800);
      await botSay('askEmail', [], 900);
      setStep(STEPS.ASK_EMAIL);
      setInputDisabled(false);
    } else {
      await botSay('gotIt', [], 800);
      await botSay('askContact');
      setStep(STEPS.ASK_CONTACT);
      setInputDisabled(false);
    }
  };

  const showConfirm = async (issue, imageFile, email = '') => {
    await botSay('confirmBody', [issue, userPhone, email, !!imageFile], 900);
    setStep(STEPS.CONFIRM);
    setInputDisabled(false);
  };

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    const init = async () => {
      setInputDisabled(true);
      await botSay('greeting', [userName], 800);

      if (token && userPhone) {
        try {
          const res = await api.get('/tickets/my-tickets', { headers: { 'x-user-token': token } });
          const myTickets = res.data;
          const openTicket = myTickets.find((tk) => tk.status !== 'Closed');

          if (openTicket) {
            const statusEmoji = { Created: '🟣', Assigned: '🟡', Fixed: '🔵' };
            const shortIssue = openTicket.issueDescription.length > 60
              ? openTicket.issueDescription.slice(0, 60) + '…'
              : openTicket.issueDescription;
            await botSay('openTicket', [statusEmoji[openTicket.status] || '⚪', openTicket.ticketId, openTicket.status, shortIssue], 1000);
            setStep(STEPS.DONE);
            setInputDisabled(true);
            return;
          }

          if (myTickets.length > 0) {
            const statusEmoji = { Created: '🟣', Assigned: '🟡', Fixed: '🔵', Closed: '🟢' };
            const preview = myTickets.slice(0, 3);
            const ticketLines = preview.map((tk) => `${statusEmoji[tk.status] || '⚪'} ${tk.ticketId} — ${tk.status}`).join('\n');
            const moreLine = myTickets.length > 3 ? `\n+${myTickets.length - 3} more` : '';
            await botSay('prevTickets', [myTickets.length, ticketLines + moreLine], 1000);
          }
        } catch {
          // silently skip
        }
      }

      await botSay('askIssue', [], 1000);
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
    addUserMessage(text, imagePreview);
    setInputDisabled(true);

    // ── ASK_ISSUE ─────────────────────────────────────────────────
    if (step === STEPS.ASK_ISSUE) {
      const hasText = text && text.trim().length >= 5;
      const hasImage = !!imageFile;

      if (!text && !imageFile) {
        await botSay('askIssueOrImage');
        setInputDisabled(false);
        return;
      }
      if (!hasText && !hasImage) {
        await botSay('askIssueDetail');
        setInputDisabled(false);
        return;
      }
      if (hasImage && !hasText) {
        setTicketData((prev) => ({ ...prev, imageFile }));
        await botSay('askIssueText', [], 900);
        setStep(STEPS.ASK_ISSUE_TEXT);
        setInputDisabled(false);
        return;
      }
      if (hasText && hasImage) {
        setTicketData((prev) => ({ ...prev, issue: text.trim(), imageFile }));
        await moveToContact(text.trim(), imageFile);
        return;
      }
      setTicketData((prev) => ({ ...prev, issue: text.trim() }));
      await botSay('askScreenshot', [], 900);
      setStep(STEPS.ASK_SCREENSHOT);
      setInputDisabled(false);
      return;
    }

    // ── ASK_ISSUE_TEXT ────────────────────────────────────────────
    if (step === STEPS.ASK_ISSUE_TEXT) {
      const trimmed = text.trim();
      const skipped = t.skipWords.includes(trimmed.toLowerCase());

      if (skipped || !trimmed) {
        const issue = 'Screenshot attached';
        setTicketData((prev) => ({ ...prev, issue }));
        await moveToContact(issue, ticketData.imageFile);
        return;
      }
      if (trimmed.length < 3) {
        await botSay('askIssueTextRetry');
        setInputDisabled(false);
        return;
      }
      setTicketData((prev) => ({ ...prev, issue: trimmed }));
      await moveToContact(trimmed, ticketData.imageFile);
      return;
    }

    // ── ASK_SCREENSHOT ────────────────────────────────────────────
    if (step === STEPS.ASK_SCREENSHOT) {
      const skipped = t.skipWords.includes(text.toLowerCase().trim());
      if (imageFile) {
        setTicketData((prev) => ({ ...prev, imageFile }));
        await botSay('screenshotSaved', [], 700);
        await moveToContact(ticketData.issue, imageFile);
        return;
      }
      if (skipped || (!imageFile && text)) {
        await moveToContact(ticketData.issue, null);
        return;
      }
      await botSay('askScreenshotRetry');
      setInputDisabled(false);
      return;
    }

    // ── ASK_EMAIL ─────────────────────────────────────────────────
    if (step === STEPS.ASK_EMAIL) {
      const trimmed = text.trim();
      const skipped = t.skipWords.includes(trimmed.toLowerCase());
      if (skipped) {
        await showConfirm(ticketData.issue, ticketData.imageFile, '');
        return;
      }
      if (!validateEmail(trimmed)) {
        await botSay('invalidEmail');
        setInputDisabled(false);
        return;
      }
      setTicketData((prev) => ({ ...prev, secondContact: trimmed, secondContactType: 'email' }));
      await showConfirm(ticketData.issue, ticketData.imageFile, trimmed);
      return;
    }

    // ── ASK_CONTACT ───────────────────────────────────────────────
    if (step === STEPS.ASK_CONTACT) {
      const trimmed = text.trim();
      const emailMatch = trimmed.match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/);
      const phoneMatch = trimmed.match(/[6-9]\d{9}/);
      let contact = trimmed, contactType = '', secondContact = '', secondContactType = '';

      if (validateEmail(trimmed)) {
        contact = trimmed; contactType = 'email';
      } else if (validatePhone(trimmed)) {
        contact = trimmed; contactType = 'phone';
      } else if (emailMatch && phoneMatch) {
        contact = emailMatch[0]; contactType = 'email';
        secondContact = phoneMatch[0]; secondContactType = 'phone';
      } else if (emailMatch) {
        contact = emailMatch[0]; contactType = 'email';
      } else if (phoneMatch) {
        contact = phoneMatch[0]; contactType = 'phone';
      } else {
        await botSay('invalidContact');
        setInputDisabled(false);
        return;
      }

      setTicketData((prev) => ({ ...prev, contact, contactType, secondContact, secondContactType }));
      await botSay('confirmIntro', [], 800);
      await botSay('confirmBodyNoPhone', [ticketData.issue, contactType, contact, secondContact, secondContactType, !!ticketData.imageFile], 1000);
      setStep(STEPS.CONFIRM);
      setInputDisabled(false);
      return;
    }

    // ── CONFIRM ───────────────────────────────────────────────────
    if (step === STEPS.CONFIRM) {
      const lower = text.toLowerCase().trim();
      const isYes = t.yesWords.includes(lower);
      const isNo = t.noWords.includes(lower);

      if (isYes) {
        setStep(STEPS.SUBMITTING);
        await botSay('submitting', [], 600);
        try {
          const formData = new FormData();
          formData.append('issueDescription', ticketData.issue);
          if (ticketData.contact) formData.append('contact', ticketData.contact);
          if (ticketData.contactType) formData.append('contactType', ticketData.contactType);
          if (ticketData.secondContact) {
            formData.append('secondContact', ticketData.secondContact);
            formData.append('secondContactType', ticketData.secondContactType);
          }
          if (ticketData.imageFile) formData.append('image', ticketData.imageFile);
          const headers = { 'Content-Type': 'multipart/form-data' };
          if (token) headers['x-user-token'] = token;
          const res = await api.post('/tickets', formData, { headers });
          await botSay('success', [res.data.ticketId], 800);
          setStep(STEPS.DONE);
          setInputDisabled(true);
        } catch {
          await botSay('submitError');
          setStep(STEPS.CONFIRM);
          setInputDisabled(false);
        }
        return;
      }

      if (isNo) {
        setTicketData({ issue: '', contact: userPhone, contactType: userPhone ? 'phone' : '', secondContact: '', secondContactType: '', imageFile: null });
        await botSay('startOver', [], 600);
        await botSay('startOverPrompt');
        setStep(STEPS.ASK_ISSUE);
        setInputDisabled(false);
        return;
      }

      await botSay('confirmPrompt');
      setInputDisabled(false);
    }
  };

  // Resolve all bot messages in the current language at render time
  const displayMessages = messages.map((msg) => {
    if (msg.sender === 'bot' && msg.msgKey) {
      return { ...msg, text: resolveMsg(strings[lang], msg.msgKey, msg.msgParams) };
    }
    return msg;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-white px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ background: '#145476' }}>
        <img
          src="https://sandbox.saafe.in/static/media/saafe_light.a6365baa.png"
          alt="Saafe"
          className="h-8 object-contain brightness-0 invert flex-shrink-0"
        />
        <div className="w-px h-6 bg-white/30"></div>
        <div className="flex-1">
          <div className="font-semibold text-sm">Support Assistant</div>
        </div>
        {/* Language Toggle */}
        <button
          onClick={() => setLang((prev) => (prev === 'en' ? 'hi' : 'en'))}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors border border-white/20"
          title={lang === 'en' ? 'Switch to Hindi' : 'Switch to English'}
        >
          <span>{lang === 'en' ? 'हिं' : 'EN'}</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {displayMessages.map((msg) => (
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
