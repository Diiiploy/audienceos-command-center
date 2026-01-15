# AudienceOS Domain Setup Instructions

**Status:** ⚠️ Domain added to Vercel, **DNS VERIFICATION NEEDED**
**Deadline:** ASAP (blocks Google OAuth)
**People:** Brent (DNS), Trevor (Vercel + Supabase)
**Last Checked:** 2026-01-15 by Chi

---

## 🚨 CURRENT BLOCKER (Jan 15, 2026)

The domain `audienceos.diiiploy.io` was added to Vercel but shows **"Verification Needed"**.

**Root Cause:** The `diiiploy.io` domain is linked to another Vercel account. Ownership verification via TXT record is required.

**Action Required:** Brent needs to update DNS records (see section below).

---

## 🎯 What This Does

Changes the app URL from:
- ❌ `audienceos-agro-bros.vercel.app` (temporary)

To:
- ✅ `audienceos.diiiploy.io` (permanent branded domain)

This enables proper Google OAuth, email, and professional branding.

---

## 📌 FOR BRENT: Google Domains DNS Setup

**Time needed:** 5 minutes
**System:** Google Domains (for diiiploy.io)

### ⚠️ UPDATED DNS RECORDS (Jan 15, 2026)

Vercel requires **TWO** DNS records now (ownership verification needed):

| Type | Host | Value |
|------|------|-------|
| **CNAME** | `audienceos` | `e20ba527f311b024.vercel-dns-016.com.` |
| **TXT** | `_vercel` | *(Copy from Vercel - see below)* |

**Why TXT?** The `diiiploy.io` domain is linked to another Vercel account. The TXT record proves ownership.

### Step-by-Step

1. **Go to Google Domains**
   - URL: https://domains.google.com
   - Sign in with your account

2. **Find diiiploy.io**
   - Click on `diiiploy.io` in your domain list
   - Click **"Manage"**

3. **Go to DNS Settings**
   - Left sidebar → **"DNS"**
   - Scroll down to **"Custom records"** section

4. **Update/Add the CNAME Record**
   - If `audienceos` CNAME exists, **edit it**
   - If not, click **"Create new record"**
   - Fill in EXACTLY:
     ```
     Type:     CNAME
     Host:     audienceos
     TTL:      3600
     Value:    e20ba527f311b024.vercel-dns-016.com.
     ```
   - ⚠️ **NOTE:** Old value was `cname.vercel-dns.com` - this is WRONG now
   - Click **"Save"**

5. **Add the TXT Record (NEW - REQUIRED)**
   - Click **"Create new record"**
   - Fill in:
     ```
     Type:     TXT
     Host:     _vercel
     TTL:      3600
     Value:    [GET FROM VERCEL - SEE STEP 6]
     ```

6. **Get the TXT Value from Vercel**
   - Go to: https://vercel.com/agro-bros/audienceos/settings/domains
   - Find `audienceos.diiiploy.io` row
   - Click "Learn more" next to "Verification Needed"
   - Copy the TXT record value (starts with `vc-domain-verify=...`)
   - Paste it into Google Domains as the TXT value
   - Click **"Save"**

7. **Verify Records Added**
   - You should see in the list:
     ```
     audienceos.diiiploy.io  CNAME  e20ba527f311b024.vercel-dns-016.com.  3600
     _vercel.diiiploy.io     TXT    vc-domain-verify=audienceos...        3600
     ```

8. **Wait 5-10 minutes for DNS to propagate**
   - Then click "Refresh" in Vercel Domains page
   - Should change from "Verification Needed" to "Valid Configuration"

### That's It for DNS!

Once Vercel shows ✅ "Valid Configuration", the domain is ready.

---

## ⚙️ FOR TREVOR: Vercel + Supabase Setup

**Time needed:** 10 minutes
**Depends on:** Brent completing DNS above

### Part 1: Vercel (3 minutes)

1. **Go to Vercel**
   - URL: https://vercel.com
   - Sign in → Click **"audienceos"** project

2. **Add Custom Domain**
   - Left menu → **"Settings"**
   - Click **"Domains"** tab
   - Click **"Add Domain"**
   - Type: `audienceos.diiiploy.io`
   - Click **"Add"**

3. **Vercel Will Show Status**
   - Wait for it to show: ✅ **"Domain Valid"**
   - This means DNS is working correctly
   - If it says "Invalid", wait 5-10 minutes and refresh

4. **You're Done with Vercel**
   - Production URL is now: `https://audienceos.diiiploy.io`

---

### Part 2: Supabase (5 minutes)

**Project:** `audienceos-cc-fresh` (Project ID: ebxshdqfaqupnvpghodi)

#### 1. **Enable Google Provider**

1. Go to: https://supabase.com/dashboard
2. Select project: **`audienceos-cc-fresh`**
3. Left menu → **"Authentication"** → **"Providers"**
4. Find **"Google"** → Click to expand
5. Toggle: **"Enabled"** (turn on)
6. Leave OAuth 2.0 settings as-is (already configured)
7. Click **"Save"**

#### 2. **Update Site URL**

1. Still in Authentication section
2. Left menu → **"URL Configuration"**
3. Find field: **"Site URL"**
4. Delete the old value
5. Enter EXACTLY:
   ```
   https://audienceos.diiiploy.io
   ```
6. Click **"Save"**

#### 3. **Add Redirect URLs**

1. Still in "URL Configuration"
2. Find section: **"Redirect URLs"**
3. Click **"Add URL"**
4. Enter EXACTLY:
   ```
   https://audienceos.diiiploy.io/**
   ```
5. Click **"Add URL"** button
6. You should see it listed below
7. Click **"Save"**

---

## ✅ Verification Checklist

After both complete their parts:

- [x] Roderic: Domain added to Vercel (audienceos.diiiploy.io) ✅ Done Jan 15
- [ ] Brent: CNAME updated to `e20ba527f311b024.vercel-dns-016.com.`
- [ ] Brent: TXT record added for `_vercel` (copy value from Vercel)
- [ ] Trevor: Vercel shows ✅ "Valid Configuration" for audienceos.diiiploy.io
- [ ] Trevor: Supabase Site URL is `https://audienceos.diiiploy.io`
- [ ] Trevor: Supabase Redirect URL includes `https://audienceos.diiiploy.io/**`
- [ ] Test: Go to https://audienceos.diiiploy.io/login
- [ ] Click: "Sign in with Google"
- [ ] Verify: Google OAuth works (redirects to Google, then back)

---

## 🆘 If Something Goes Wrong

### "Vercel shows Verification Needed" ⚠️ CURRENT ISSUE
- **Cause:** Domain `diiiploy.io` is linked to another Vercel account
- **Fix:** Add TXT record for ownership verification:
  1. Go to Vercel Domains page
  2. Click "Learn more" on the verification warning
  3. Copy the TXT record value
  4. Add TXT record in Google Domains: Host=`_vercel`, Value=copied text
  5. Wait 5-10 minutes, click "Refresh" in Vercel

### "Vercel says domain is invalid"
- **Cause:** DNS not propagated yet OR wrong CNAME value
- **Fix:**
  1. Wait 10 minutes, refresh Vercel page
  2. Verify CNAME is `e20ba527f311b024.vercel-dns-016.com.` (NOT `cname.vercel-dns.com`)
- **Still broken?** Brent: Check DNS record is exactly right (no typos)

### "Google OAuth redirects to wrong domain"
- **Cause:** Supabase redirect URLs wrong
- **Fix:** Verify EXACTLY `https://audienceos.diiiploy.io/**` (notice the `/**`)

### "Google says 'Redirect URI mismatch'"
- **Cause:** Supabase Site URL or Redirect URLs don't match domain
- **Fix:** Verify all 3 fields in Supabase are set to `audienceos.diiiploy.io`

### "404 DEPLOYMENT_NOT_FOUND"
- **Cause:** Domain not added to Vercel project OR not assigned to Production
- **Fix:**
  1. Go to Vercel → Project Settings → Domains
  2. Click "Add Domain" and enter `audienceos.diiiploy.io`
  3. Make sure "Production" is selected
  4. Complete DNS verification if prompted

---

## 📞 Questions?

Message Roderic with:
1. What you're trying to do (DNS, Vercel, or Supabase)
2. What error/issue you're seeing
3. Screenshot if possible

**Timeline:** Do this today so Google OAuth works properly.

---

*Last updated: 2026-01-15 | Domain added to Vercel, DNS verification pending*
