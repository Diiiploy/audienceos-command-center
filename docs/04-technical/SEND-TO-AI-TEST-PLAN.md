# Send to AI Feature - Browser Testing Plan

## Test Environment
- **URL:** https://audienceos-agro-bros.vercel.app
- **Browser:** Comet (Chromium)
- **Tool:** Claude in Chrome extension

---

## PRE-TEST CHECKLIST

1. ✅ Open Developer Console (Cmd+Option+J)
2. ✅ Navigate to Dashboard view
3. ✅ Check console for any errors on page load
4. ✅ Verify chat bar visible at bottom of screen

---

## TEST 1: Chat Component Initialization

### Steps:
1. Open Console
2. Type: `window.openChatWithMessage`
3. Check output

### Expected Result:
```javascript
ƒ (message) { ... }
```

### Actual Result:
- [ ] ✅ Function exists
- [ ] ❌ Function undefined (BLOCKER - retry after 1 second)

### Notes:
_______________________________________

---

## TEST 2: Task Drawer "Send to AI"

### Steps:
1. Dashboard → Tasks tab
2. Click any task item
3. Task drawer opens on right
4. Click yellow "Send to AI" button
5. Observe behavior

### Expected Results:
- [ ] ✅ Drawer closes immediately
- [ ] ✅ Chat panel opens (slides up from bottom)
- [ ] ✅ Chat input contains pre-filled text: `Help me with task: "[title]" for [client]. [description]`
- [ ] ✅ Textarea is focused (cursor blinking)
- [ ] ✅ No console errors

### Actual Results:
_______________________________________

### Console Output:
```
(paste any errors here)
```

---

## TEST 3: Client Drawer "Send to AI"

### Steps:
1. Dashboard → Clients tab
2. Click any client
3. Client drawer opens
4. Click yellow "Send to AI" button

### Expected Results:
- [ ] ✅ Drawer closes
- [ ] ✅ Chat opens with text: `Tell me about [name] - currently in [stage] stage, [health]. Notes: ... Blocker: ...`
- [ ] ✅ No console errors

### Actual Results:
_______________________________________

---

## TEST 4: Alert Drawer "Send to AI"

### Steps:
1. Dashboard → Alerts tab
2. Click any alert
3. Alert drawer opens
4. Click yellow "Send to AI" button

### Expected Results:
- [ ] ✅ Drawer closes
- [ ] ✅ Chat opens with text: `Analyze this critical alert: "[title]" affecting [client]. [description]`
- [ ] ✅ No console errors

### Actual Results:
_______________________________________

---

## TEST 5: Performance Drawer "Send to AI"

### Steps:
1. Dashboard → Performance tab
2. Click any performance item
3. Drawer opens
4. Click yellow "Send to AI" button

### Expected Results:
- [ ] ✅ Drawer closes
- [ ] ✅ Chat opens with text: `[Severity]: "[title]" for [client]. [description]. What should I do?`
- [ ] ✅ No console errors

### Actual Results:
_______________________________________

---

## TEST 6: Race Condition (First Load)

### Steps:
1. Hard refresh page (Cmd+Shift+R)
2. IMMEDIATELY click Dashboard → Tasks
3. Click first task
4. IMMEDIATELY click "Send to AI" (within 100ms of page load)

### Expected Results:
- [ ] ✅ Either works immediately OR shows console warning: `[SEND-TO-AI] Chat not ready, retrying...`
- [ ] ✅ Chat opens after retry (50ms delay)
- [ ] ✅ Prompt appears in chat input

### Actual Results:
_______________________________________

### Console Output:
```
(paste any warnings/errors here)
```

---

## TEST 7: Empty Data Handling

### Steps:
1. Inspect a task/client/alert with missing data
2. Click "Send to AI"
3. Check prompt content

### Expected Results:
- [ ] ✅ No empty quotes like `""`
- [ ] ✅ Fallback text visible: "Untitled", "No description provided", etc.
- [ ] ✅ Prompt is still readable

### Example Good Prompt:
```
Help me with task: "Untitled" for client. No description provided
```

### Actual Results:
_______________________________________

---

## TEST 8: Double-Click Prevention

### Steps:
1. Open any drawer
2. Click "Send to AI"
3. IMMEDIATELY click it again (double-click)

### Expected Results:
- [ ] ✅ Drawer closes on first click (button disappears)
- [ ] ✅ Second click does nothing (drawer already closed)
- [ ] ✅ No duplicate chat openings

### Actual Results:
_______________________________________

---

## TEST 9: Visual Border Fix

### Steps:
1. Open any drawer (Tasks, Clients, Alerts, Performance)
2. Scroll to bottom of drawer
3. Look at bottom edge

### Expected Results:
- [ ] ✅ Clean border line visible at bottom
- [ ] ✅ Line extends behind chat bar
- [ ] ✅ No abrupt cutoff

### Actual Results:
_______________________________________

---

## TEST 10: Chat Already Open

### Steps:
1. Click chat input (opens panel)
2. Type some text: "test message"
3. Go to Dashboard → Tasks
4. Click task → Click "Send to AI"

### Expected Results:
- [ ] ⚠️ KNOWN ISSUE: Existing text will be REPLACED
- [ ] ✅ New prompt appears
- [ ] ✅ Chat stays open

### Actual Results:
_______________________________________

### Notes:
This is a known limitation - current implementation replaces text instead of appending.

---

## SUMMARY

### Passing Tests: __ / 10

### Blockers Found:
1. ______________________________________
2. ______________________________________
3. ______________________________________

### Warnings (Non-Critical):
1. ______________________________________
2. ______________________________________

### Confidence Score: __ / 10

---

## RECOMMENDATIONS

Based on test results, should we:
- [ ] ✅ Ship as-is (all tests passed)
- [ ] ⚠️ Fix minor issues first
- [ ] ❌ Major blockers found - do not ship

### Next Steps:
______________________________________
______________________________________
______________________________________
