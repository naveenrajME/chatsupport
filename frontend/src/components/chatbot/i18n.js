const strings = {
  en: {
    greeting: (name) =>
      name
        ? `👋 Hi ${name}! Welcome to Saafe Support.`
        : `👋 Hi there! Welcome to Saafe Support. I'm here to help you.`,
    openTicket: (emoji, id, status, issue) =>
      `You have an open ticket:\n${emoji} **${id}** — ${status}\n"${issue}"\n\nOur team is working on it. Please wait for it to be resolved before raising a new one.`,
    prevTickets: (count, lines) =>
      `📋 Previous tickets (${count}):\n${lines}`,
    askIssue: `Could you please describe the issue or problem you're facing?`,
    askIssueOrImage: `Please describe your issue or attach a screenshot so I can help you.`,
    askIssueDetail: `Please describe your issue in a bit more detail (at least a few words).`,
    askIssueText: `Thanks for the screenshot! Could you also describe the issue in a few words so our team knows what to look into?`,
    askIssueTextRetry: `Just a brief description will do — even a few words help our team understand the issue.`,
    askScreenshot: `Thanks! Do you have a screenshot of the issue? If yes, attach it below. If not, type **skip** to continue.`,
    screenshotSaved: `Got it! Screenshot saved.`,
    askScreenshotRetry: `Please attach a screenshot or type **skip** to continue without one.`,
    gotIt: `Got it! Thanks for sharing.`,
    askEmail: `Would you like to add an 📧 Email ID for updates? (Type your email or **skip** to continue)`,
    askContact: `Could you please share your 📧 Email ID or 📱 Mobile Number so we can follow up with you?`,
    invalidEmail: `Please enter a valid email address or type **skip** to continue without one.`,
    invalidContact: `Please enter a valid 10-digit mobile number (starting with 6-9) or a valid email address.\n\nExample: 9876543210 or name@email.com`,
    confirmIntro: `Perfect! Here's a summary of your ticket:`,
    confirmBody: (issue, phone, email, hasImage) =>
      `📋 Issue: ${issue}\n📱 Phone: ${phone}${email ? `\n📧 Email: ${email}` : ''}${hasImage ? '\n📎 Screenshot: Attached' : ''}\n\nType **yes** to submit or **no** to start over.`,
    confirmBodyNoPhone: (issue, contactType, contact, secondContact, secondContactType, hasImage) => {
      const cl = contactType === 'email' ? '📧 Email' : '📱 Phone';
      const sl = secondContactType === 'phone' ? '📱 Phone' : '📧 Email';
      return `📋 Issue: ${issue}\n${cl}: ${contact}${secondContact ? `\n${sl}: ${secondContact}` : ''}${hasImage ? '\n📎 Screenshot: Attached' : ''}\n\nType **yes** to submit or **no** to start over.`;
    },
    confirmPrompt: `Type **yes** to submit the ticket or **no** to start over.`,
    submitting: `Submitting your ticket... ⏳`,
    success: (id) =>
      `✅ Your support ticket has been created!\n\n🎫 Ticket ID: ${id}\n\nOur team will reach out to you shortly. Thank you!`,
    submitError: `Sorry, there was an error submitting your ticket. Please try again.`,
    startOver: `No problem! Let's start over.`,
    startOverPrompt: `Please describe your issue or attach a screenshot.`,
    skipWords: ['skip', 'no', 'n', 'nope', 'none', 's'],
    yesWords: ['yes', 'y', 'confirm', 'submit', 'ok', 'okay', 'sure', 'yep', 'yeah'],
    noWords: ['no', 'n', 'cancel', 'restart', 'reset', 'start over'],
  },

  hi: {
    greeting: (name) =>
      name
        ? `👋 नमस्ते ${name}! Saafe Support में आपका स्वागत है।`
        : `👋 नमस्ते! Saafe Support में आपका स्वागत है। मैं आपकी मदद के लिए यहाँ हूँ।`,
    openTicket: (emoji, id, status, issue) =>
      `आपका एक खुला टिकट है:\n${emoji} **${id}** — ${status}\n"${issue}"\n\nहमारी टीम इस पर काम कर रही है। कृपया नया टिकट बनाने से पहले इसके हल होने की प्रतीक्षा करें।`,
    prevTickets: (count, lines) =>
      `📋 पिछले टिकट (${count}):\n${lines}`,
    askIssue: `कृपया अपनी समस्या या परेशानी बताएं।`,
    askIssueOrImage: `कृपया अपनी समस्या बताएं या स्क्रीनशॉट लगाएं ताकि मैं आपकी मदद कर सकूं।`,
    askIssueDetail: `कृपया अपनी समस्या थोड़ी और विस्तार से बताएं।`,
    askIssueText: `स्क्रीनशॉट के लिए धन्यवाद! क्या आप कुछ शब्दों में समस्या बता सकते हैं ताकि हमारी टीम समझ सके?`,
    askIssueTextRetry: `एक संक्षिप्त विवरण काफी है — कुछ शब्द भी हमारी टीम को समझने में मदद करते हैं।`,
    askScreenshot: `धन्यवाद! क्या आपके पास समस्या का स्क्रीनशॉट है? यदि हाँ, तो नीचे लगाएं। नहीं तो **skip** टाइप करें।`,
    screenshotSaved: `ठीक है! स्क्रीनशॉट सहेज लिया।`,
    askScreenshotRetry: `कृपया स्क्रीनशॉट लगाएं या बिना स्क्रीनशॉट के जारी रखने के लिए **skip** टाइप करें।`,
    gotIt: `ठीक है! जानकारी देने के लिए धन्यवाद।`,
    askEmail: `क्या आप अपडेट के लिए 📧 ईमेल आईडी जोड़ना चाहते हैं? (ईमेल टाइप करें या जारी रखने के लिए **skip** करें)`,
    askContact: `कृपया अपना 📧 ईमेल आईडी या 📱 मोबाइल नंबर दें ताकि हम आपसे संपर्क कर सकें।`,
    invalidEmail: `कृपया एक मान्य ईमेल पता दर्ज करें या **skip** टाइप करें।`,
    invalidContact: `कृपया एक मान्य 10 अंकों का मोबाइल नंबर (6-9 से शुरू) या ईमेल पता दर्ज करें।\n\nउदाहरण: 9876543210 या name@email.com`,
    confirmIntro: `बढ़िया! आपके टिकट का सारांश:`,
    confirmBody: (issue, phone, email, hasImage) =>
      `📋 समस्या: ${issue}\n📱 फ़ोन: ${phone}${email ? `\n📧 ईमेल: ${email}` : ''}${hasImage ? '\n📎 स्क्रीनशॉट: संलग्न' : ''}\n\nसबमिट करने के लिए **yes** या फिर से शुरू करने के लिए **no** टाइप करें।`,
    confirmBodyNoPhone: (issue, contactType, contact, secondContact, secondContactType, hasImage) => {
      const cl = contactType === 'email' ? '📧 ईमेल' : '📱 फ़ोन';
      const sl = secondContactType === 'phone' ? '📱 फ़ोन' : '📧 ईमेल';
      return `📋 समस्या: ${issue}\n${cl}: ${contact}${secondContact ? `\n${sl}: ${secondContact}` : ''}${hasImage ? '\n📎 स्क्रीनशॉट: संलग्न' : ''}\n\nसबमिट करने के लिए **yes** या फिर से शुरू करने के लिए **no** टाइप करें।`;
    },
    confirmPrompt: `टिकट सबमिट करने के लिए **yes** या फिर से शुरू करने के लिए **no** टाइप करें।`,
    submitting: `आपका टिकट सबमिट हो रहा है... ⏳`,
    success: (id) =>
      `✅ आपका सपोर्ट टिकट बन गया है!\n\n🎫 टिकट ID: ${id}\n\nहमारी टीम जल्द ही आपसे संपर्क करेगी। धन्यवाद!`,
    submitError: `क्षमा करें, टिकट सबमिट करने में त्रुटि हुई। कृपया पुनः प्रयास करें।`,
    startOver: `कोई बात नहीं! फिर से शुरू करते हैं।`,
    startOverPrompt: `कृपया अपनी समस्या बताएं या स्क्रीनशॉट लगाएं।`,
    skipWords: ['skip', 'no', 'n', 'nope', 'none', 's', 'नहीं', 'छोड़ें', 'छोड़'],
    yesWords: ['yes', 'y', 'confirm', 'submit', 'ok', 'okay', 'sure', 'yep', 'yeah', 'हाँ', 'हां', 'ठीक है', 'सबमिट'],
    noWords: ['no', 'n', 'cancel', 'restart', 'reset', 'start over', 'नहीं', 'रद्द'],
  },
};

export default strings;
