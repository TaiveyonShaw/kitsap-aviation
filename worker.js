function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

var jwksCache = { keys: null, fetchedAt: 0 };

function b64urlToBytes(part) {
  var padded = part.replace(/-/g, '+').replace(/_/g, '/');
  var pad = padded.length % 4;
  if (pad) padded += '='.repeat(4 - pad);
  var bin = atob(padded);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeJwtJson(part) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));
}

function getAccessToken(request) {
  var header = request.headers.get('Cf-Access-Jwt-Assertion');
  if (header) return header;
  var cookie = request.headers.get('Cookie') || '';
  var match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function getJwks(teamDomain) {
  var now = Date.now();
  if (jwksCache.keys && now - jwksCache.fetchedAt < 3600000) return jwksCache.keys;
  var response = await fetch('https://' + teamDomain + '/cdn-cgi/access/certs');
  if (!response.ok) throw new Error('Could not load Access certs');
  var body = await response.json();
  jwksCache = { keys: body.keys || [], fetchedAt: now };
  return jwksCache.keys;
}

async function verifyAccessJwt(request, env) {
  var teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  var audience = env.CF_ACCESS_AUD;
  if (!teamDomain || !audience) {
    return json({
      error: 'Access is not configured',
      message: 'Set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD on the worker, then save again.'
    }, 503);
  }

  var token = getAccessToken(request);
  if (!token) return json({ error: 'Unauthorized' }, 401);

  var parts = token.split('.');
  if (parts.length !== 3) return json({ error: 'Unauthorized' }, 401);

  var header;
  var payload;
  try {
    header = decodeJwtJson(parts[0]);
    payload = decodeJwtJson(parts[1]);
  } catch (error) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (payload.iss !== 'https://' + teamDomain) return json({ error: 'Unauthorized' }, 401);
  var aud = payload.aud;
  var audOk = Array.isArray(aud) ? aud.indexOf(audience) !== -1 : aud === audience;
  if (!audOk) return json({ error: 'Unauthorized' }, 401);
  if (!payload.exp || payload.exp * 1000 < Date.now()) return json({ error: 'Unauthorized' }, 401);

  var keys = await getJwks(teamDomain);
  var jwk = keys.filter(function (key) { return key.kid === header.kid; })[0];
  if (!jwk) return json({ error: 'Unauthorized' }, 401);

  var cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  var data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  var ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, b64urlToBytes(parts[2]), data);
  if (!ok) return json({ error: 'Unauthorized' }, 401);
  return null;
}

function sanitizeEvents(input) {
  if (!Array.isArray(input)) return null;
  if (input.length > 50) return null;
  return input.map(function (event) {
    return {
      id: String(event.id || '').slice(0, 80),
      title: String(event.title || '').slice(0, 120),
      date: String(event.date || '').slice(0, 10),
      startTime: String(event.startTime || '').slice(0, 5),
      endTime: String(event.endTime || '').slice(0, 5),
      location: String(event.location || '').slice(0, 160),
      description: String(event.description || '').slice(0, 2000),
      linkText: 'RSVP',
      linkHref: 'contact.html?interest=Upcoming+Event'
    };
  }).filter(function (event) {
    return event.title && event.date;
  });
}

async function eventsFromAssets(request, env) {
  try {
    var url = new URL(request.url);
    url.pathname = '/events.json';
    var response = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
    if (!response.ok) return [];
    var data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

async function getEvents(request, env) {
  if (env.EVENTS) {
    var stored = await env.EVENTS.get('list', { type: 'json' });
    if (Array.isArray(stored)) return stored;
  }
  return eventsFromAssets(request, env);
}

async function handleEvents(request, env) {
  if (request.method === 'GET') {
    return json(await getEvents(request, env));
  }

  if (request.method === 'PUT') {
    var unauthorized = await verifyAccessJwt(request, env);
    if (unauthorized) return unauthorized;
    if (!env.EVENTS) {
      return json({
        error: 'KV is not bound',
        message: 'In Cloudflare, bind a KV namespace to this worker as EVENTS, then save again.'
      }, 503);
    }
    var events = sanitizeEvents(await request.json().catch(function () { return null; }));
    if (!events) return json({ error: 'Invalid events payload' }, 400);
    await env.EVENTS.put('list', JSON.stringify(events));
    return json({ ok: true, events: events });
  }

  return json({ error: 'Method not allowed' }, 405);
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    if (url.pathname === '/api/events') {
      return handleEvents(request, env);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, 404);
    }
    return env.ASSETS.fetch(request);
  }
};
