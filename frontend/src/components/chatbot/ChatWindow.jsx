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

// Decode JWT payload without verification (verification happens on backend)
const decodeTokenPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

const ChatWindow = ({ token = '' }) => {
  const userClaims = token ? decodeTokenPayload(token) : null;
  const userName = userClaims ? `${userClaims.first_name || ''} ${userClaims.last_name || ''}`.trim() : '';
  const userPhone = userClaims?.phone_number || '';

  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(STEPS.GREETING);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [ticketData, setTicketData] = useState({ issue: '', contact: userPhone, contactType: userPhone ? 'phone' : '', secondContact: '', secondContactType: '', imageFile: null });
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

  const moveToContact = async (issueOverride = '', imageFileOverride = undefined) => {
    const currentIssue = issueOverride || ticketData.issue;
    const currentImageFile = imageFileOverride !== undefined ? imageFileOverride : ticketData.imageFile;

    if (userPhone) {
      // User identified via token — skip contact step
      await botSay('Got it! Thanks for sharing.', 800);
      await botSay(
        `📋 Issue: ${currentIssue}\n📱 Phone: ${userPhone}${currentImageFile ? '\n📎 Screenshot: Attached' : ''}\n\nType **yes** to submit or **no** to start over.`,
        900
      );
      setStep(STEPS.CONFIRM);
      setInputDisabled(false);
    } else {
      await botSay('Got it! Thanks for sharing.', 800);
      await botSay('Could you please share your 📧 Email ID or 📱 Mobile Number so we can follow up with you?');
      setStep(STEPS.ASK_CONTACT);
      setInputDisabled(false);
    }
  };

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    const init = async () => {
      setInputDisabled(true);
      const greeting = userName ? `👋 Hi ${userName}! Welcome to Saafe Support.` : '👋 Hi there! Welcome to Saafe Support. I\'m here to help you.';
      await botSay(greeting, 800);

      // If user is identified via token, fetch their previous tickets
      if (token && userPhone) {
        try {
          const res = await api.get('/tickets/my-tickets', {
            headers: { 'x-user-token': token },
          });
          const myTickets = res.data;
          const openTicket = myTickets.find((t) => t.status !== 'Closed');

          if (openTicket) {
            // User has an open ticket — show status and block new ticket creation
            const statusEmoji = { Created: '🟣', Assigned: '🟡', Fixed: '🔵' };
            await botSay(
              `You already have an open support ticket:\n\n${statusEmoji[openTicket.status] || '⚪'} **${openTicket.ticketId}**\n📌 Status: ${openTicket.status}\n📋 Issue: ${openTicket.issueDescription}\n\nOur team is already working on it. You'll be notified once it's resolved.`,
              1000
            );
            await botSay('If this is a different issue, please wait for the current ticket to be closed before raising a new one.', 800);
            setStep(STEPS.DONE);
            setInputDisabled(true);
            return;
          }

          // No open tickets — show history if any, then allow new ticket
          if (myTickets.length > 0) {
            const statusEmoji = { Created: '🟣', Assigned: '🟡', Fixed: '🔵', Closed: '🟢' };
            const ticketLines = myTickets
              .slice(0, 5)
              .map((t) => `${statusEmoji[t.status] || '⚪'} ${t.ticketId} — ${t.status}\n   ${t.issueDescription.slice(0, 60)}${t.issueDescription.length > 60 ? '…' : ''}`)
              .join('\n\n');
            await botSay(`📋 Your previous tickets:\n\n${ticketLines}`, 1000);
          }
        } catch {
          // silently skip if fetch fails
        }
      }

      await botSay('Could you please describe the issue or problem you\'re facing?', 1000);
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
        await moveToContact(text.trim(), imageFile);
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
      await moveToContact(text.trim(), ticketData.imageFile);
      return;
    }

    // ── Step: ASK_SCREENSHOT ──────────────────────────────────────
    if (step === STEPS.ASK_SCREENSHOT) {
      const skipped = ['skip', 'no', 'n', 'nope', 'none'].includes(text.toLowerCase().trim());

      if (imageFile) {
        // User attached an image
        setTicketData((prev) => ({ ...prev, imageFile }));
        await botSay('Got it! Screenshot saved.', 700);
        await moveToContact(ticketData.issue, imageFile);
        return;
      }

      if (skipped || (!imageFile && text)) {
        // User chose to skip
        await moveToContact(ticketData.issue, null);
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
      let contact = trimmed;

      // Extract email and phone from the message
      const emailMatch = trimmed.match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/);
      const phoneMatch = trimmed.match(/[6-9]\d{9}/);

      let secondContact = '';
      let secondContactType = '';

      if (validateEmail(trimmed)) {
        contact = trimmed; contactType = 'email';
      } else if (validatePhone(trimmed)) {
        contact = trimmed; contactType = 'phone';
      } else if (emailMatch && phoneMatch) {
        // Both found — email as primary, phone as secondary
        contact = emailMatch[0]; contactType = 'email';
        secondContact = phoneMatch[0]; secondContactType = 'phone';
      } else if (emailMatch) {
        contact = emailMatch[0]; contactType = 'email';
      } else if (phoneMatch) {
        contact = phoneMatch[0]; contactType = 'phone';
      } else {
        await botSay('Please enter a valid 10-digit mobile number (starting with 6-9) or a valid email address.\n\nExample: 9876543210 or name@email.com');
        setInputDisabled(false);
        return;
      }

      setTicketData((prev) => ({ ...prev, contact, contactType, secondContact, secondContactType }));

      await botSay('Perfect! Here\'s a summary of your ticket:', 800);
      // Read issue and imageFile from current ticketData via closure
      await botSay(
        `📋 Issue: ${ticketData.issue}\n📧 ${contactType === 'email' ? 'Email' : 'Phone'}: ${contact}${secondContact ? `\n📱 ${secondContactType === 'phone' ? 'Phone' : 'Email'}: ${secondContact}` : ''}${ticketData.imageFile ? '\n📎 Screenshot: Attached' : ''}\n\nType **yes** to submit or **no** to start over.`,
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
        setTicketData({ issue: '', contact: userPhone, contactType: userPhone ? 'phone' : '', secondContact: '', secondContactType: '', imageFile: null });
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
      <div className="text-white px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{background: '#145476'}}>
        <img
          src="https://sandbox.saafe.in/static/media/saafe_light.a6365baa.png"
          alt="Saafe"
          className="h-8 object-contain brightness-0 invert flex-shrink-0"
        />
        <div className="w-px h-6 bg-white/30"></div>
        <div>
          <div className="font-semibold text-sm">Support Assistant</div>
          <div className="text-xs text-white/70 flex items-center gap-1">
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
