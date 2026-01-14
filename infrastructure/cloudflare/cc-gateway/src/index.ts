/**
 * Chi Gateway - Cloudflare Worker with MCP Protocol Support
 * 
 * Services: Gmail, Calendar, Drive, Render, Sentry, Neon, Mercury,
 *           Netlify, Meta Ads, Google Ads, Playwright, Supabase
 */

import { handleGmail } from './routes/gmail';
import { handleCalendar } from './routes/calendar';
import { handleDrive } from './routes/drive';
import { handleSheets } from './routes/sheets';
import { handleDocs } from './routes/docs';
import { handleRender } from './routes/render';
import { handleSentry } from './routes/sentry';
import { handleNeon } from './routes/neon';
import { handleMercury } from './routes/mercury';
import { handleNetlify } from './routes/netlify';
import { handleMetaAds } from './routes/meta-ads';
import { handleGoogleAds } from './routes/google-ads';
import { handlePlaywright } from './routes/playwright';
import { handleUnipile } from './routes/unipile';
import { handleSupabaseRoute, queryTable, insertRows, executeRpc, listBuckets } from './routes/supabase';
import { handleMem0 } from './routes/mem0';
import { handleSlack } from './routes/slack';
import { runFullHealthCheck, checkSingleService, createErrorResponse, ErrorCodes } from './routes/health';

export interface Env {
  CHI_KV: KVNamespace;
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN: string;
  // Google Ads
  GOOGLE_ADS_DEVELOPER_TOKEN: string;
  GOOGLE_ADS_CUSTOMER_ID: string;
  // Services
  RENDER_API_KEY: string;
  SENTRY_AUTH_TOKEN: string;
  NEON_API_KEY: string;
  NEON_ORG_ID: string;
  MERCURY_API_TOKEN: string;
  NETLIFY_AUTH_TOKEN: string;
  META_ACCESS_TOKEN: string;
  BROWSERLESS_TOKEN: string;
  BROWSERLESS_URL: string;
  // Unipile (LinkedIn)
  UNIPILE_API_KEY: string;
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_PROJECT_ID: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  // Gateway
  CHI_API_KEY: string;
  // Mem0
  MEM0_API_KEY: string;
  // Slack
  SLACK_BOT_TOKEN: string;
}

// MCP Tool Definitions
const MCP_TOOLS = [
  // Gmail
  { name: "gmail_inbox", description: "Get emails from Gmail inbox", inputSchema: { type: "object", properties: { maxResults: { type: "number" }, query: { type: "string" } } } },
  { name: "gmail_read", description: "Read email by ID", inputSchema: { type: "object", properties: { messageId: { type: "string" } }, required: ["messageId"] } },
  { name: "gmail_send", description: "Send email", inputSchema: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } },
  { name: "gmail_archive", description: "Archive email (remove from inbox)", inputSchema: { type: "object", properties: { messageId: { type: "string" } }, required: ["messageId"] } },
  // Calendar
  { name: "calendar_events", description: "List calendar events", inputSchema: { type: "object", properties: { maxResults: { type: "number" }, calendarId: { type: "string" } } } },
  { name: "calendar_create", description: "Create calendar event", inputSchema: { type: "object", properties: { summary: { type: "string" }, start: { type: "string" }, end: { type: "string" }, description: { type: "string" } }, required: ["summary", "start", "end"] } },
  // Drive
  { name: "drive_list", description: "List Drive files", inputSchema: { type: "object", properties: { query: { type: "string" }, folderId: { type: "string" }, pageSize: { type: "number" } } } },
  { name: "drive_folder_create", description: "Create Drive folder", inputSchema: { type: "object", properties: { name: { type: "string" }, parentId: { type: "string" } }, required: ["name"] } },
  { name: "drive_move", description: "Move file to folder", inputSchema: { type: "object", properties: { fileId: { type: "string" }, folderId: { type: "string" } }, required: ["fileId", "folderId"] } },
  { name: "drive_search", description: "Search Drive files", inputSchema: { type: "object", properties: { name: { type: "string" }, mimeType: { type: "string" }, folderId: { type: "string" } } } },
  { name: "drive_export", description: "Export/read file content from Drive (PDFs, DOCX, Google Docs → text)", inputSchema: { type: "object", properties: { fileId: { type: "string" } }, required: ["fileId"] } },
  { name: "drive_convert", description: "Convert Office files (xlsx, docx, pptx, pdf) to Google format and keep the result", inputSchema: { type: "object", properties: { fileId: { type: "string" }, targetFolderId: { type: "string" } }, required: ["fileId"] } },
  // Sheets
  { name: "sheets_list", description: "List spreadsheets", inputSchema: { type: "object", properties: { folderId: { type: "string" } } } },
  { name: "sheets_create", description: "Create spreadsheet", inputSchema: { type: "object", properties: { title: { type: "string" }, folderId: { type: "string" }, sheets: { type: "array" } }, required: ["title"] } },
  { name: "sheets_read", description: "Read spreadsheet data", inputSchema: { type: "object", properties: { spreadsheetId: { type: "string" }, range: { type: "string" } }, required: ["spreadsheetId"] } },
  { name: "sheets_write", description: "Write data to spreadsheet", inputSchema: { type: "object", properties: { spreadsheetId: { type: "string" }, range: { type: "string" }, values: { type: "array" } }, required: ["spreadsheetId", "range", "values"] } },
  { name: "sheets_append", description: "Append rows to spreadsheet", inputSchema: { type: "object", properties: { spreadsheetId: { type: "string" }, range: { type: "string" }, values: { type: "array" } }, required: ["spreadsheetId", "range", "values"] } },
  { name: "sheets_metadata", description: "Get spreadsheet metadata (all sheet names/tabs)", inputSchema: { type: "object", properties: { spreadsheetId: { type: "string" } }, required: ["spreadsheetId"] } },
  // Docs
  { name: "docs_list", description: "List documents", inputSchema: { type: "object", properties: { folderId: { type: "string" } } } },
  { name: "docs_create", description: "Create document", inputSchema: { type: "object", properties: { title: { type: "string" }, folderId: { type: "string" }, content: { type: "string" } }, required: ["title"] } },
  { name: "docs_read", description: "Read document content", inputSchema: { type: "object", properties: { documentId: { type: "string" } }, required: ["documentId"] } },
  { name: "docs_append", description: "Append text to document", inputSchema: { type: "object", properties: { documentId: { type: "string" }, text: { type: "string" } }, required: ["documentId", "text"] } },
  { name: "docs_create_formatted", description: "Create document with proper formatting (14pt body, 24pt H1, 18pt H2, Arial font)", inputSchema: { type: "object", properties: { title: { type: "string" }, folderId: { type: "string" }, content: { type: "string" } }, required: ["title", "content"] } },
  // Render
  { name: "render_services", description: "List Render services", inputSchema: { type: "object", properties: {} } },
  { name: "render_deploy", description: "Trigger Render deploy", inputSchema: { type: "object", properties: { serviceId: { type: "string" } }, required: ["serviceId"] } },
  // Sentry
  { name: "sentry_issues", description: "Get Sentry issues", inputSchema: { type: "object", properties: { org: { type: "string" }, project: { type: "string" } }, required: ["org", "project"] } },
  { name: "sentry_teams", description: "List Sentry teams in org", inputSchema: { type: "object", properties: { org: { type: "string" } }, required: ["org"] } },
  { name: "sentry_create_project", description: "Create Sentry project", inputSchema: { type: "object", properties: { org: { type: "string" }, team: { type: "string" }, name: { type: "string" }, platform: { type: "string" } }, required: ["org", "team", "name"] } },
  // Neon
  { name: "neon_projects", description: "List Neon projects", inputSchema: { type: "object", properties: {} } },
  { name: "neon_branches", description: "List branches for a Neon project", inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"] } },
  // Mercury
  { name: "mercury_accounts", description: "List Mercury accounts", inputSchema: { type: "object", properties: {} } },
  { name: "mercury_transactions", description: "Get Mercury transactions", inputSchema: { type: "object", properties: { accountId: { type: "string" }, limit: { type: "number" } }, required: ["accountId"] } },
  // Netlify
  { name: "netlify_sites", description: "List Netlify sites", inputSchema: { type: "object", properties: {} } },
  { name: "netlify_deploys", description: "Get Netlify deploys", inputSchema: { type: "object", properties: { siteId: { type: "string" } }, required: ["siteId"] } },
  { name: "netlify_build", description: "Trigger Netlify build", inputSchema: { type: "object", properties: { siteId: { type: "string" } }, required: ["siteId"] } },
  // Meta Ads
  { name: "meta_accounts", description: "List Meta ad accounts", inputSchema: { type: "object", properties: {} } },
  { name: "meta_campaigns", description: "List Meta campaigns", inputSchema: { type: "object", properties: { accountId: { type: "string" } }, required: ["accountId"] } },
  { name: "meta_insights", description: "Get Meta ad insights", inputSchema: { type: "object", properties: { accountId: { type: "string" }, datePreset: { type: "string" } }, required: ["accountId"] } },
  { name: "meta_campaign_status", description: "Update Meta campaign status", inputSchema: { type: "object", properties: { campaignId: { type: "string" }, status: { type: "string" } }, required: ["campaignId", "status"] } },
  // Google Ads
  { name: "google_ads_campaigns", description: "List Google Ads campaigns", inputSchema: { type: "object", properties: {} } },
  { name: "google_ads_performance", description: "Get Google Ads performance", inputSchema: { type: "object", properties: { days: { type: "string" } } } },
  // Playwright
  { name: "browser_screenshot", description: "Take screenshot of URL", inputSchema: { type: "object", properties: { url: { type: "string" }, fullPage: { type: "boolean" } }, required: ["url"] } },
  { name: "browser_pdf", description: "Generate PDF of URL", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "browser_content", description: "Get page HTML content", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "browser_scrape", description: "Scrape elements from URL", inputSchema: { type: "object", properties: { url: { type: "string" }, elements: { type: "array" } }, required: ["url", "elements"] } },
  // Unipile (LinkedIn) - Note: Non-functional due to Cloudflare port limitation
  { name: "unipile_accounts", description: "List connected LinkedIn accounts (⚠️ port blocked)", inputSchema: { type: "object", properties: {} } },
  { name: "unipile_messages", description: "List LinkedIn messages (⚠️ port blocked)", inputSchema: { type: "object", properties: { account_id: { type: "string" }, limit: { type: "number" } } } },
  { name: "unipile_chats", description: "List LinkedIn chat threads (⚠️ port blocked)", inputSchema: { type: "object", properties: { account_id: { type: "string" }, limit: { type: "number" } } } },
  { name: "unipile_send", description: "Send LinkedIn message (⚠️ port blocked)", inputSchema: { type: "object", properties: { account_id: { type: "string" }, chat_id: { type: "string" }, text: { type: "string" } }, required: ["account_id", "text"] } },
  { name: "unipile_profile", description: "Get LinkedIn profile (⚠️ port blocked)", inputSchema: { type: "object", properties: { profile_id: { type: "string" } }, required: ["profile_id"] } },
  { name: "unipile_connect", description: "Send LinkedIn connection request (⚠️ port blocked)", inputSchema: { type: "object", properties: { account_id: { type: "string" }, profile_id: { type: "string" }, message: { type: "string" } }, required: ["account_id", "profile_id"] } },
  // Supabase
  { name: "supabase_query", description: "Query a Supabase table", inputSchema: { type: "object", properties: { table: { type: "string" }, select: { type: "string" }, filter: { type: "string" }, limit: { type: "number" }, order: { type: "string" } }, required: ["table"] } },
  { name: "supabase_insert", description: "Insert rows into Supabase table", inputSchema: { type: "object", properties: { table: { type: "string" }, rows: { type: "object" } }, required: ["table", "rows"] } },
  { name: "supabase_rpc", description: "Execute Supabase RPC function", inputSchema: { type: "object", properties: { function: { type: "string" }, params: { type: "object" } }, required: ["function"] } },
  { name: "supabase_buckets", description: "List Supabase storage buckets", inputSchema: { type: "object", properties: {} } },
  // Mem0
  { name: "mem0_add", description: "Add a memory to mem0", inputSchema: { type: "object", properties: { content: { type: "string", description: "The memory content to store" }, userId: { type: "string", description: "User ID (default: chi)" } }, required: ["content"] } },
  { name: "mem0_search", description: "Search memories in mem0", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query" }, userId: { type: "string", description: "User ID (default: chi)" } }, required: ["query"] } },
  // Slack
  { name: "slack_channels", description: "List Slack channels", inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max channels to return (default: 100)" } } } },
  { name: "slack_messages", description: "Get messages from a Slack channel", inputSchema: { type: "object", properties: { channel: { type: "string", description: "Channel ID" }, limit: { type: "number", description: "Max messages (default: 50)" } }, required: ["channel"] } },
  { name: "slack_post", description: "Post message to a Slack channel", inputSchema: { type: "object", properties: { channel: { type: "string", description: "Channel ID or name" }, text: { type: "string", description: "Message text" }, thread_ts: { type: "string", description: "Thread timestamp for replies" } }, required: ["channel", "text"] } },
  { name: "slack_users", description: "List Slack workspace users", inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max users (default: 200)" } } } },
  { name: "slack_user", description: "Get Slack user info", inputSchema: { type: "object", properties: { user: { type: "string", description: "User ID" } }, required: ["user"] } },
  { name: "slack_search", description: "Search Slack messages", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query" }, count: { type: "number", description: "Results count (default: 20)" } }, required: ["query"] } },
];

// Handle MCP JSON-RPC requests
async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { method: string; params?: any; id?: number };
  const { method, params, id } = body;

  let result: any;

  switch (method) {
    case "initialize":
      result = {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "chi-gateway", version: "1.3.0" }
      };
      break;

    case "tools/list":
      result = { tools: MCP_TOOLS };
      break;

    case "tools/call":
      result = await executeToolCall(params.name, params.arguments || {}, env);
      break;

    default:
      return new Response(JSON.stringify({
        jsonrpc: "2.0", id,
        error: { code: -32601, message: `Method not found: ${method}` }
      }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { "Content-Type": "application/json" }
  });
}

// Detect and handle common API errors with structured responses
function parseApiError(toolName: string, response: Response, responseText: string): any | null {
  const service = toolName.split('_')[0];

  if (response.status === 401) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(createErrorResponse(
          ErrorCodes.UNAUTHORIZED,
          `Authentication failed for ${service}`,
          service.startsWith('google') || ['gmail', 'calendar', 'drive', 'sheets', 'docs'].includes(service)
            ? 'Google token may be expired - will auto-refresh on next request'
            : `Check ${service.toUpperCase()}_API_KEY or token`,
          service
        ))
      }],
      isError: true
    };
  }

  if (response.status === 403) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(createErrorResponse(
          ErrorCodes.UNAUTHORIZED,
          `Access denied for ${service}`,
          'Check API permissions or scopes',
          service
        ))
      }],
      isError: true
    };
  }

  if (response.status === 429) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(createErrorResponse(
          ErrorCodes.RATE_LIMITED,
          `Rate limit exceeded for ${service}`,
          'Wait a few minutes before retrying',
          service
        ))
      }],
      isError: true
    };
  }

  if (response.status >= 500) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(createErrorResponse(
          ErrorCodes.SERVICE_UNAVAILABLE,
          `${service} service is temporarily unavailable`,
          'Retry in a few seconds',
          service
        ))
      }],
      isError: true
    };
  }

  return null;
}

// Execute tool calls
async function executeToolCall(toolName: string, args: any, env: Env): Promise<any> {
  try {
    let response: Response;
    
    switch (toolName) {
      // Gmail
      case "gmail_inbox":
        response = await handleGmail(new Request(`https://x/inbox?maxResults=${args.maxResults || 20}&q=${encodeURIComponent(args.query || 'in:inbox')}`), env, '/inbox');
        break;
      case "gmail_read":
        response = await handleGmail(new Request(`https://x/message/${args.messageId}`), env, `/message/${args.messageId}`);
        break;
      case "gmail_send":
        response = await handleGmail(new Request(`https://x/send`, { method: 'POST', body: JSON.stringify(args) }), env, '/send');
        break;
      case "gmail_archive":
        response = await handleGmail(new Request(`https://x/archive/${args.messageId}`, { method: 'POST' }), env, `/archive/${args.messageId}`);
        break;
      // Calendar
      case "calendar_events":
        response = await handleCalendar(new Request(`https://x/events?maxResults=${args.maxResults || 10}`), env, '/events');
        break;
      case "calendar_create":
        response = await handleCalendar(new Request(`https://x/event`, { method: 'POST', body: JSON.stringify(args) }), env, '/event');
        break;
      // Drive
      case "drive_list":
        response = await handleDrive(new Request(`https://x/files?q=${encodeURIComponent(args.query || '')}&folderId=${args.folderId || ''}`), env, '/files');
        break;
      case "drive_folder_create":
        response = await handleDrive(new Request(`https://x/folder`, { method: 'POST', body: JSON.stringify(args) }), env, '/folder');
        break;
      case "drive_move":
        response = await handleDrive(new Request(`https://x/move`, { method: 'POST', body: JSON.stringify(args) }), env, '/move');
        break;
      case "drive_search":
        response = await handleDrive(new Request(`https://x/search?name=${encodeURIComponent(args.name || '')}&mimeType=${args.mimeType || ''}&folderId=${args.folderId || ''}`), env, '/search');
        break;
      case "drive_export":
        response = await handleDrive(new Request(`https://x/export`, { method: 'POST', body: JSON.stringify(args) }), env, '/export');
        break;
      case "drive_convert":
        response = await handleDrive(new Request(`https://x/convert`, { method: 'POST', body: JSON.stringify(args) }), env, '/convert');
        break;
      // Sheets
      case "sheets_list":
        response = await handleSheets(new Request(`https://x/list?folderId=${args.folderId || ''}`), env, '/list');
        break;
      case "sheets_create":
        response = await handleSheets(new Request(`https://x/create`, { method: 'POST', body: JSON.stringify(args) }), env, '/create');
        break;
      case "sheets_read":
        response = await handleSheets(new Request(`https://x/read?spreadsheetId=${args.spreadsheetId}&range=${encodeURIComponent(args.range || 'Sheet1')}`), env, '/read');
        break;
      case "sheets_write":
        response = await handleSheets(new Request(`https://x/write`, { method: 'POST', body: JSON.stringify(args) }), env, '/write');
        break;
      case "sheets_append":
        response = await handleSheets(new Request(`https://x/append`, { method: 'POST', body: JSON.stringify(args) }), env, '/append');
        break;
      case "sheets_metadata":
        response = await handleSheets(new Request(`https://x/metadata?spreadsheetId=${args.spreadsheetId}`), env, '/metadata');
        break;
      // Docs
      case "docs_list":
        response = await handleDocs(new Request(`https://x/list?folderId=${args.folderId || ''}`), env, '/list');
        break;
      case "docs_create":
        response = await handleDocs(new Request(`https://x/create`, { method: 'POST', body: JSON.stringify(args) }), env, '/create');
        break;
      case "docs_read":
        response = await handleDocs(new Request(`https://x/read?documentId=${args.documentId}`), env, '/read');
        break;
      case "docs_append":
        response = await handleDocs(new Request(`https://x/append`, { method: 'POST', body: JSON.stringify(args) }), env, '/append');
        break;
      case "docs_create_formatted":
        response = await handleDocs(new Request(`https://x/create-formatted`, { method: 'POST', body: JSON.stringify(args) }), env, '/create-formatted');
        break;
      // Render
      case "render_services":
        response = await handleRender(new Request(`https://x/services`), env, '/services');
        break;
      case "render_deploy":
        response = await handleRender(new Request(`https://x/service/${args.serviceId}/deploy`, { method: 'POST' }), env, `/service/${args.serviceId}/deploy`);
        break;
      // Sentry
      case "sentry_issues":
        response = await handleSentry(new Request(`https://x/issues/${args.org}/${args.project}`), env, `/issues/${args.org}/${args.project}`);
        break;
      case "sentry_teams":
        response = await handleSentry(new Request(`https://x/teams/${args.org}`), env, `/teams/${args.org}`);
        break;
      case "sentry_create_project":
        response = await handleSentry(new Request(`https://x/teams/${args.org}/${args.team}/projects`, { 
          method: 'POST', 
          body: JSON.stringify({ name: args.name, slug: args.name.toLowerCase().replace(/\s+/g, '-'), platform: args.platform || 'javascript' })
        }), env, `/teams/${args.org}/${args.team}/projects`);
        break;
      // Neon
      case "neon_projects":
        response = await handleNeon(new Request(`https://x/projects`), env, '/projects');
        break;
      case "neon_branches":
        response = await handleNeon(new Request(`https://x/project/${args.projectId}/branches`), env, `/project/${args.projectId}/branches`);
        break;
      // Mercury
      case "mercury_accounts":
        response = await handleMercury(new Request(`https://x/accounts`), env, '/accounts');
        break;
      case "mercury_transactions":
        response = await handleMercury(new Request(`https://x/account/${args.accountId}/transactions?limit=${args.limit || 50}`), env, `/account/${args.accountId}/transactions`);
        break;
      // Netlify
      case "netlify_sites":
        response = await handleNetlify(new Request(`https://x/sites`), env, '/sites');
        break;
      case "netlify_deploys":
        response = await handleNetlify(new Request(`https://x/site/${args.siteId}/deploys`), env, `/site/${args.siteId}/deploys`);
        break;
      case "netlify_build":
        response = await handleNetlify(new Request(`https://x/site/${args.siteId}/builds`, { method: 'POST' }), env, `/site/${args.siteId}/builds`);
        break;
      // Meta Ads
      case "meta_accounts":
        response = await handleMetaAds(new Request(`https://x/accounts`), env, '/accounts');
        break;
      case "meta_campaigns":
        response = await handleMetaAds(new Request(`https://x/account/${args.accountId}/campaigns`), env, `/account/${args.accountId}/campaigns`);
        break;
      case "meta_insights":
        response = await handleMetaAds(new Request(`https://x/account/${args.accountId}/insights?date_preset=${args.datePreset || 'last_7d'}`), env, `/account/${args.accountId}/insights`);
        break;
      case "meta_campaign_status":
        response = await handleMetaAds(new Request(`https://x/campaign/${args.campaignId}/status`, { method: 'POST', body: JSON.stringify({ status: args.status }) }), env, `/campaign/${args.campaignId}/status`);
        break;
      // Google Ads
      case "google_ads_campaigns":
        response = await handleGoogleAds(new Request(`https://x/campaigns`), env, '/campaigns');
        break;
      case "google_ads_performance":
        response = await handleGoogleAds(new Request(`https://x/performance?days=${args.days || '7'}`), env, '/performance');
        break;
      // Playwright
      case "browser_screenshot":
        response = await handlePlaywright(new Request(`https://x/screenshot`, { method: 'POST', body: JSON.stringify(args) }), env, '/screenshot');
        const screenshotBuffer = await response.arrayBuffer();
        const screenshotBase64 = btoa(String.fromCharCode(...new Uint8Array(screenshotBuffer)));
        return { content: [{ type: "image", data: screenshotBase64, mimeType: "image/png" }] };
      case "browser_pdf":
        response = await handlePlaywright(new Request(`https://x/pdf`, { method: 'POST', body: JSON.stringify(args) }), env, '/pdf');
        const pdfBuffer = await response.arrayBuffer();
        const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
        return { content: [{ type: "resource", uri: "data:application/pdf;base64," + pdfBase64 }] };
      case "browser_content":
        response = await handlePlaywright(new Request(`https://x/content`, { method: 'POST', body: JSON.stringify(args) }), env, '/content');
        break;
      case "browser_scrape":
        response = await handlePlaywright(new Request(`https://x/scrape`, { method: 'POST', body: JSON.stringify(args) }), env, '/scrape');
        break;
      // Unipile (LinkedIn)
      case "unipile_accounts":
        response = await handleUnipile(new Request(`https://x/accounts`), env, '/accounts');
        break;
      case "unipile_messages":
        response = await handleUnipile(new Request(`https://x/messages?account_id=${args.account_id || ''}&limit=${args.limit || 50}`), env, '/messages');
        break;
      case "unipile_chats":
        response = await handleUnipile(new Request(`https://x/chats?account_id=${args.account_id || ''}&limit=${args.limit || 50}`), env, '/chats');
        break;
      case "unipile_send":
        response = await handleUnipile(new Request(`https://x/send`, { method: 'POST', body: JSON.stringify(args) }), env, '/send');
        break;
      case "unipile_profile":
        response = await handleUnipile(new Request(`https://x/profile/${args.profile_id}`), env, `/profile/${args.profile_id}`);
        break;
      case "unipile_connect":
        response = await handleUnipile(new Request(`https://x/connect`, { method: 'POST', body: JSON.stringify(args) }), env, '/connect');
        break;
      // Supabase
      case "supabase_query":
        response = await queryTable(env as any, args.table, {
          select: args.select || '*',
          filter: args.filter,
          limit: args.limit || 100,
          order: args.order
        });
        break;
      case "supabase_insert":
        response = await insertRows(env as any, args.table, args.rows);
        break;
      case "supabase_rpc":
        response = await executeRpc(env as any, args.function, args.params);
        break;
      case "supabase_buckets":
        response = await listBuckets(env as any);
        break;
      // Mem0
      case "mem0_add":
        response = await handleMem0(
          new Request(`https://x/add`, { method: 'POST', body: JSON.stringify(args) }),
          env, '/add'
        );
        break;
      case "mem0_search":
        response = await handleMem0(
          new Request(`https://x/search`, { method: 'POST', body: JSON.stringify(args) }),
          env, '/search'
        );
        break;
      // Slack
      case "slack_channels":
        response = await handleSlack(new Request(`https://x/channels?limit=${args.limit || 100}`), env, '/channels');
        break;
      case "slack_messages":
        response = await handleSlack(new Request(`https://x/channel/${args.channel}/messages?limit=${args.limit || 50}`), env, `/channel/${args.channel}/messages`);
        break;
      case "slack_post":
        response = await handleSlack(new Request(`https://x/post`, { method: 'POST', body: JSON.stringify(args) }), env, '/post');
        break;
      case "slack_users":
        response = await handleSlack(new Request(`https://x/users?limit=${args.limit || 200}`), env, '/users');
        break;
      case "slack_user":
        response = await handleSlack(new Request(`https://x/user/${args.user}`), env, `/user/${args.user}`);
        break;
      case "slack_search":
        response = await handleSlack(new Request(`https://x/search`, { method: 'POST', body: JSON.stringify(args) }), env, '/search');
        break;
      default:
        return {
          content: [{
            type: "text",
            text: JSON.stringify(createErrorResponse(
              ErrorCodes.NOT_FOUND,
              `Unknown tool: ${toolName}`,
              'Check available tools with tools/list'
            ))
          }],
          isError: true
        };
    }

    // Check for API errors and return structured response
    const responseText = await response.text();
    const apiError = parseApiError(toolName, response, responseText);
    if (apiError) {
      return apiError;
    }

    return { content: [{ type: "text", text: responseText }] };
  } catch (error) {
    const service = toolName.split('_')[0];
    return {
      content: [{
        type: "text",
        text: JSON.stringify(createErrorResponse(
          ErrorCodes.NETWORK_ERROR,
          error instanceof Error ? error.message : 'Unknown error',
          'Check network connectivity',
          service
        ))
      }],
      isError: true
    };
  }
}


export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle MCP protocol requests
    if (request.method === 'POST' && (path === '/' || path === '/mcp')) {
      return await handleMcpRequest(request, env);
    }

    // Health checks
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'ok', service: 'chi-gateway', version: '1.3.0',
        tools: MCP_TOOLS.length, timestamp: new Date().toISOString()
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Full health check with per-service status
    if (path === '/health/full') {
      const report = await runFullHealthCheck(env, MCP_TOOLS.length);
      return new Response(JSON.stringify(report), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Single service health check: /health/:service
    if (path.startsWith('/health/')) {
      const service = path.replace('/health/', '');
      const result = await checkSingleService(service, env);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // REST API (requires auth)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.replace('Bearer ', '') !== env.CHI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route to handlers
    if (path.startsWith('/gmail')) return await handleGmail(request, env, path.replace('/gmail', ''));
    if (path.startsWith('/calendar')) return await handleCalendar(request, env, path.replace('/calendar', ''));
    if (path.startsWith('/drive')) return await handleDrive(request, env, path.replace('/drive', ''));
    if (path.startsWith('/sheets')) return await handleSheets(request, env, path.replace('/sheets', ''));
    if (path.startsWith('/docs')) return await handleDocs(request, env, path.replace('/docs', ''));
    if (path.startsWith('/render')) return await handleRender(request, env, path.replace('/render', ''));
    if (path.startsWith('/sentry')) return await handleSentry(request, env, path.replace('/sentry', ''));
    if (path.startsWith('/neon')) return await handleNeon(request, env, path.replace('/neon', ''));
    if (path.startsWith('/mercury')) return await handleMercury(request, env, path.replace('/mercury', ''));
    if (path.startsWith('/netlify')) return await handleNetlify(request, env, path.replace('/netlify', ''));
    if (path.startsWith('/meta-ads')) return await handleMetaAds(request, env, path.replace('/meta-ads', ''));
    if (path.startsWith('/google-ads')) return await handleGoogleAds(request, env, path.replace('/google-ads', ''));
    if (path.startsWith('/browser')) return await handlePlaywright(request, env, path.replace('/browser', ''));
    if (path.startsWith('/unipile')) return await handleUnipile(request, env, path.replace('/unipile', ''));
    if (path.startsWith('/supabase')) return await handleSupabaseRoute(request, env as any, path.replace('/supabase', ''));
    if (path.startsWith('/mem0')) return await handleMem0(request, env, path.replace('/mem0', ''));
    if (path.startsWith('/slack')) return await handleSlack(request, env, path.replace('/slack', ''));

    return new Response(JSON.stringify({ error: 'Not found', path }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  },
};
