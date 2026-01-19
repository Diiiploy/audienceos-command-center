# Test Prompt for Claude in Chrome

Navigate to: https://audienceos-agro-bros.vercel.app

Execute the following test plan and provide a structured report at the end.

---

## TEST SEQUENCE

### Setup:
1. Open browser DevTools Console (press F12 or Cmd+Option+J)
2. Keep console visible during all tests to catch errors
3. Log in if needed

---

### TEST 1: Chat Initialization
**Action:** In console, type: `window.openChatWithMessage`
**Check:** Does it return a function or undefined?
**Log Result:** Function exists: YES/NO

---

### TEST 2: Dashboard Tasks - Send to AI
**Actions:**
1. Click "Dashboard" in sidebar
2. Click "Tasks" tab
3. Click first task in list
4. Task drawer opens on right
5. Click yellow "Send to AI" button

**Observe:**
- Does drawer close immediately? YES/NO
- Does chat panel slide up from bottom? YES/NO
- Is there text pre-filled in chat input? YES/NO
- What is the exact text? (copy/paste)
- Is textarea focused (cursor blinking)? YES/NO
- Any console errors? (copy/paste if yes)

---

### TEST 3: Dashboard Clients - Send to AI
**Actions:**
1. Click "Clients" tab
2. Click first client
3. Click yellow "Send to AI" button

**Observe:**
- Drawer closes? YES/NO
- Chat opens with text about the client? YES/NO
- Text format correct (mentions client name, stage, health)? YES/NO
- Console errors? (copy/paste if yes)

---

### TEST 4: Dashboard Alerts - Send to AI
**Actions:**
1. Click "Alerts" tab
2. Click first alert
3. Click yellow "Send to AI" button

**Observe:**
- Drawer closes? YES/NO
- Chat opens with alert description? YES/NO
- Console errors? (copy/paste if yes)

---

### TEST 5: Dashboard Performance - Send to AI
**Actions:**
1. Click "Performance" tab
2. Click first performance item
3. Click yellow "Send to AI" button

**Observe:**
- Drawer closes? YES/NO
- Chat opens with performance info? YES/NO
- Console errors? (copy/paste if yes)

---

### TEST 6: Race Condition Test
**Actions:**
1. Hard refresh page (Cmd+Shift+R or Ctrl+Shift+R)
2. IMMEDIATELY after page loads (within 1 second):
   - Click Dashboard
   - Click Tasks tab
   - Click first task
   - Click "Send to AI" button

**Observe:**
- Did it work? YES/NO
- Any console warnings like "[SEND-TO-AI] Chat not ready, retrying..."? YES/NO
- Did chat eventually open? YES/NO
- Copy/paste any console messages

---

### TEST 7: Visual Check - Drawer Borders
**Actions:**
1. Open any drawer (Tasks, Clients, Alerts, or Performance)
2. Scroll to bottom of drawer
3. Look at the bottom edge where drawer meets chat bar

**Observe:**
- Is there a clean border line at the bottom? YES/NO
- Does the line extend behind the chat bar? YES/NO
- Or does it look cut off/abrupt? YES/NO
- Take a screenshot if possible

---

### TEST 8: Chat Already Has Text
**Actions:**
1. Click chat input at bottom to open panel
2. Type: "test message"
3. Without sending, click Dashboard → Tasks → First task → "Send to AI"

**Observe:**
- What happened to "test message"? (replaced/appended/still there)
- Did new prompt appear? YES/NO
- Chat stayed open? YES/NO

---

### TEST 9: Double-Click Test
**Actions:**
1. Open any drawer
2. Click "Send to AI" button
3. IMMEDIATELY click it again (try to double-click)

**Observe:**
- What happened? (drawer closed once / two chats opened / error)
- Console errors? YES/NO

---

### TEST 10: Button Visual Check
**Action:** Open any drawer and look at the "Send to AI" button

**Observe:**
- Color: Is it yellow/amber? YES/NO
- Icon: Is there a sparkles icon? YES/NO
- Text: Says "Send to AI"? YES/NO
- Position: Above other action buttons? YES/NO

---

## FINAL REPORT FORMAT

Please provide your report in this exact format:

```
=== SEND TO AI FEATURE TEST REPORT ===

TESTS PASSED: X/10

TEST 1 - Chat Init: PASS/FAIL
Notes:

TEST 2 - Tasks: PASS/FAIL
Pre-filled text: "[copy exact text here]"
Notes:

TEST 3 - Clients: PASS/FAIL
Notes:

TEST 4 - Alerts: PASS/FAIL
Notes:

TEST 5 - Performance: PASS/FAIL
Notes:

TEST 6 - Race Condition: PASS/FAIL
Console output: "[paste here]"
Notes:

TEST 7 - Visual Borders: PASS/FAIL
Notes:

TEST 8 - Text Overwrite: PASS/WARN (expected behavior)
What happened:
Notes:

TEST 9 - Double Click: PASS/FAIL
Notes:

TEST 10 - Button Visual: PASS/FAIL
Notes:

=== CONSOLE ERRORS (if any) ===
[Copy/paste all errors here]

=== BLOCKERS FOUND ===
1. [Critical issues that prevent feature from working]

=== WARNINGS (Non-Critical) ===
1. [Minor issues or UX concerns]

=== OVERALL ASSESSMENT ===
Should we ship this feature? YES/NO/FIX_FIRST

Confidence Level: X/10

Additional Notes:
[Any other observations]
```

---

**IMPORTANT:** Please be thorough and copy exact error messages from console. Take your time with each test.
