/**
 * Slack Route Handler
 *
 * Endpoints:
 * - GET /channels - List channels
 * - GET /channel/:id/messages - Get channel messages
 * - POST /post - Post message to channel
 * - GET /users - List workspace users
 * - GET /user/:id - Get user info
 * - POST /search - Search messages
 */

import { Env } from '../index';

const SLACK_API = 'https://slack.com/api';

export async function handleSlack(request: Request, env: Env, path: string): Promise<Response> {
  const botToken = env.SLACK_BOT_TOKEN;

  if (!botToken) {
    return new Response(JSON.stringify({
      error: 'Slack not configured',
      message: 'SLACK_BOT_TOKEN is not set'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);

  // GET /channels - List all public channels
  if (path === '/channels' || path === '') {
    const limit = url.searchParams.get('limit') || '100';
    const cursor = url.searchParams.get('cursor') || '';

    const response = await fetch(
      `${SLACK_API}/conversations.list?types=public_channel,private_channel&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
      { headers: { Authorization: `Bearer ${botToken}` } }
    );

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // GET /channel/:id/messages - Get messages from a channel
  if (path.match(/^\/channel\/[^/]+\/messages$/)) {
    const channelId = path.split('/')[2];
    const limit = url.searchParams.get('limit') || '50';
    const cursor = url.searchParams.get('cursor') || '';

    const response = await fetch(
      `${SLACK_API}/conversations.history?channel=${channelId}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
      { headers: { Authorization: `Bearer ${botToken}` } }
    );

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /post - Post a message to a channel
  if (path === '/post' && request.method === 'POST') {
    const body = await request.json() as {
      channel: string;
      text: string;
      thread_ts?: string;
      blocks?: any[];
    };

    const response = await fetch(
      `${SLACK_API}/chat.postMessage`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: body.channel,
          text: body.text,
          ...(body.thread_ts && { thread_ts: body.thread_ts }),
          ...(body.blocks && { blocks: body.blocks }),
        }),
      }
    );

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // GET /users - List workspace users
  if (path === '/users') {
    const limit = url.searchParams.get('limit') || '200';
    const cursor = url.searchParams.get('cursor') || '';

    const response = await fetch(
      `${SLACK_API}/users.list?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
      { headers: { Authorization: `Bearer ${botToken}` } }
    );

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // GET /user/:id - Get user info
  if (path.match(/^\/user\/[^/]+$/)) {
    const userId = path.replace('/user/', '');

    const response = await fetch(
      `${SLACK_API}/users.info?user=${userId}`,
      { headers: { Authorization: `Bearer ${botToken}` } }
    );

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /search - Search messages
  if (path === '/search' && request.method === 'POST') {
    const body = await request.json() as { query: string; count?: number };

    const response = await fetch(
      `${SLACK_API}/search.messages?query=${encodeURIComponent(body.query)}&count=${body.count || 20}`,
      { headers: { Authorization: `Bearer ${botToken}` } }
    );

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /reaction - Add reaction to message
  if (path === '/reaction' && request.method === 'POST') {
    const body = await request.json() as {
      channel: string;
      timestamp: string;
      name: string; // emoji name without colons
    };

    const response = await fetch(
      `${SLACK_API}/reactions.add`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: body.channel,
          timestamp: body.timestamp,
          name: body.name,
        }),
      }
    );

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown slack endpoint', path }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}
