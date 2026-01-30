// Supabase routes for chi-gateway
// Project: audienceos-cc-fresh (qzkirjjrcblkqvhvalue)
// Updated: 2026-01-02 - Switched from old War Room schema to AudienceOS Command Center

import { Env } from '../index';

export interface SupabaseEnv extends Env {
  SUPABASE_URL: string;
  SUPABASE_PROJECT_ID: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
}

async function supabaseRequest(
  env: SupabaseEnv,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${env.SUPABASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers as Record<string, string> || {})
  };

  return fetch(url, {
    ...options,
    headers
  });
}

// List all tables via PostgREST schema
export async function listTables(env: SupabaseEnv): Promise<Response> {
  // Query the information_schema for tables
  const response = await supabaseRequest(
    env,
    '/rest/v1/rpc/get_tables',
    { method: 'POST', body: JSON.stringify({}) }
  );
  
  if (!response.ok) {
    // Fallback: try to get schema info from OpenAPI
    const schemaResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Accept': 'application/openapi+json'
      }
    });
    return schemaResponse;
  }
  
  return response;
}

// Query a table with optional filters
export async function queryTable(
  env: SupabaseEnv,
  table: string,
  params?: {
    select?: string;
    filter?: string;
    limit?: number;
    offset?: number;
    order?: string;
  }
): Promise<Response> {
  let endpoint = `/rest/v1/${table}`;
  const queryParams: string[] = [];
  
  if (params?.select) {
    queryParams.push(`select=${encodeURIComponent(params.select)}`);
  }
  if (params?.filter) {
    queryParams.push(params.filter);
  }
  if (params?.limit) {
    queryParams.push(`limit=${params.limit}`);
  }
  if (params?.offset) {
    queryParams.push(`offset=${params.offset}`);
  }
  if (params?.order) {
    queryParams.push(`order=${encodeURIComponent(params.order)}`);
  }
  
  if (queryParams.length > 0) {
    endpoint += `?${queryParams.join('&')}`;
  }
  
  return supabaseRequest(env, endpoint);
}

// Insert rows into a table
export async function insertRows(
  env: SupabaseEnv,
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[]
): Promise<Response> {
  return supabaseRequest(env, `/rest/v1/${table}`, {
    method: 'POST',
    body: JSON.stringify(rows)
  });
}

// Update rows in a table
export async function updateRows(
  env: SupabaseEnv,
  table: string,
  data: Record<string, unknown>,
  filter: string
): Promise<Response> {
  return supabaseRequest(env, `/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

// Delete rows from a table
export async function deleteRows(
  env: SupabaseEnv,
  table: string,
  filter: string
): Promise<Response> {
  return supabaseRequest(env, `/rest/v1/${table}?${filter}`, {
    method: 'DELETE'
  });
}

// Execute RPC function
export async function executeRpc(
  env: SupabaseEnv,
  functionName: string,
  params?: Record<string, unknown>
): Promise<Response> {
  return supabaseRequest(env, `/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    body: JSON.stringify(params || {})
  });
}

// Get storage buckets
export async function listBuckets(env: SupabaseEnv): Promise<Response> {
  return supabaseRequest(env, '/storage/v1/bucket');
}

// List files in a bucket
export async function listFiles(
  env: SupabaseEnv,
  bucket: string,
  path?: string
): Promise<Response> {
  const body: Record<string, unknown> = {
    prefix: path || '',
    limit: 100,
    offset: 0
  };
  
  return supabaseRequest(env, `/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

// REST endpoint handler
export async function handleSupabaseRoute(
  request: Request,
  env: SupabaseEnv,
  path: string
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  
  // /supabase/tables - list all tables
  if (path === '/tables' && method === 'GET') {
    return listTables(env);
  }
  
  // /supabase/query/:table - query a table
  if (path.startsWith('/query/') && method === 'GET') {
    const table = path.replace('/query/', '');
    const params = {
      select: url.searchParams.get('select') || '*',
      filter: url.searchParams.get('filter') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100,
      offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0,
      order: url.searchParams.get('order') || undefined
    };
    return queryTable(env, table, params);
  }
  
  // /supabase/insert/:table - insert rows
  if (path.startsWith('/insert/') && method === 'POST') {
    const table = path.replace('/insert/', '');
    const body = await request.json();
    return insertRows(env, table, body as Record<string, unknown>);
  }
  
  // /supabase/update/:table - update rows
  if (path.startsWith('/update/') && method === 'PATCH') {
    const table = path.replace('/update/', '');
    const filter = url.searchParams.get('filter') || '';
    const body = await request.json();
    return updateRows(env, table, body as Record<string, unknown>, filter);
  }
  
  // /supabase/delete/:table - delete rows
  if (path.startsWith('/delete/') && method === 'DELETE') {
    const table = path.replace('/delete/', '');
    const filter = url.searchParams.get('filter') || '';
    return deleteRows(env, table, filter);
  }
  
  // /supabase/rpc/:function - execute RPC
  if (path.startsWith('/rpc/') && method === 'POST') {
    const functionName = path.replace('/rpc/', '');
    const body = await request.json().catch(() => ({}));
    return executeRpc(env, functionName, body as Record<string, unknown>);
  }
  
  // /supabase/storage/buckets - list buckets
  if (path === '/storage/buckets' && method === 'GET') {
    return listBuckets(env);
  }
  
  // /supabase/storage/files/:bucket - list files
  if (path.startsWith('/storage/files/') && method === 'GET') {
    const bucket = path.replace('/storage/files/', '');
    const prefix = url.searchParams.get('path') || '';
    return listFiles(env, bucket, prefix);
  }
  
  return new Response(JSON.stringify({ error: 'Unknown Supabase route' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}
