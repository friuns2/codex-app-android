import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { RequestHandler, Request, Response, NextFunction } from 'express'

const TOKEN_COOKIE = 'codex_web_local_token'

function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim()
    const value = pair.slice(idx + 1).trim()
    cookies[key] = value
  }
  return cookies
}

function isLocalhostRemote(remote: string): boolean {
  return remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
}

function isAuthorizedByRequestLike(
  remoteAddress: string | undefined,
  _hostHeader: string | undefined,
  cookieHeader: string | undefined,
  validTokens: Set<string>,
): boolean {
  const remote = remoteAddress ?? ''
  if (isLocalhostRemote(remote)) {
    return true
  }

  const cookies = parseCookies(cookieHeader)
  const token = cookies[TOKEN_COOKIE]
  return Boolean(token && validTokens.has(token))
}

const LOGIN_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Codex Web</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem}
.card{background:#171717;border:1px solid #262626;border-radius:12px;padding:2rem;width:100%;max-width:380px}
h1{font-size:1.25rem;font-weight:600;margin-bottom:1.5rem;text-align:center;color:#fafafa}
label{display:block;font-size:.875rem;color:#a3a3a3;margin-bottom:.5rem}
input{width:100%;padding:.625rem .75rem;background:#0a0a0a;border:1px solid #404040;border-radius:8px;color:#fafafa;font-size:1rem;outline:none;transition:border-color .15s}
input:focus{border-color:#3b82f6}
button{width:100%;padding:.625rem;margin-top:1rem;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:.9375rem;font-weight:500;cursor:pointer;transition:background .15s}
button:hover{background:#2563eb}
.error{color:#ef4444;font-size:.8125rem;margin-top:.75rem;text-align:center;display:none}
</style>
</head>
<body>
<div class="card">
<h1>Codex Web</h1>
<form id="f">
<label for="pw">Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
<button type="submit">Sign in</button>
<p class="error" id="err">Incorrect password</p>
</form>
</div>
<script>
const form=document.getElementById('f');
const errEl=document.getElementById('err');
form.addEventListener('submit',async e=>{
  e.preventDefault();
  errEl.style.display='none';
  const res=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})});
  if(res.ok){window.location.reload()}else{errEl.style.display='block';document.getElementById('pw').value='';document.getElementById('pw').focus()}
});
</script>
</body>
</html>`

export function createAuthMiddleware(password: string): RequestHandler {
  return createAuthSession(password).middleware
}

export type AuthSession = {
  middleware: RequestHandler
  isRequestAuthorized: (req: IncomingMessage) => boolean
}

export function createAuthSession(password: string): AuthSession {
  const validTokens = new Set<string>()

  const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    if (isAuthorizedByRequestLike(req.socket.remoteAddress, req.headers.host, req.headers.cookie, validTokens)) {
      next()
      return
    }

    // Handle login POST
    if (req.method === 'POST' && req.path === '/auth/login') {
      let body = ''
      req.setEncoding('utf8')
      req.on('data', (chunk: string) => { body += chunk })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body) as { password?: string }
          const provided = typeof parsed.password === 'string' ? parsed.password : ''

          if (!constantTimeCompare(provided, password)) {
            res.status(401).json({ error: 'Invalid password' })
            return
          }

          const token = randomBytes(32).toString('hex')
          validTokens.add(token)

          res.setHeader('Set-Cookie', `${TOKEN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict`)
          res.json({ ok: true })
        } catch {
          res.status(400).json({ error: 'Invalid request body' })
        }
      })
      return
    }

    // No valid session — serve login page
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(LOGIN_PAGE_HTML)
  }

  return {
    middleware,
    isRequestAuthorized: (req: IncomingMessage) => (
      isAuthorizedByRequestLike(req.socket.remoteAddress, req.headers.host, req.headers.cookie, validTokens)
    ),
  }
}
