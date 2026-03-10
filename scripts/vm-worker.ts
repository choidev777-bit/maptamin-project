/**
 * Oracle VM Worker HTTP Server
 *
 * Vercel API에서 호출하는 HTTP 엔드포인트.
 * POST /run   → search_id를 받아 백그라운드에서 크롤링 실행
 * POST /schedule → 스케줄 모드 실행 (cron에서 호출)
 * GET  /health → 헬스체크
 */

import 'dotenv/config';
import http from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';

const PORT = parseInt(process.env.VM_WORKER_PORT || '3939', 10);
const SECRET = process.env.VM_WORKER_SECRET || '';

// Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
    console.error('[VM Worker] Missing Supabase env vars');
    process.exit(1);
}

if (!SECRET) {
    console.error('[VM Worker] Missing VM_WORKER_SECRET');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ── Active jobs tracking (중복 실행 방지) ──
const activeJobs = new Set<string>();

// ── Helper: JSON body parser ──
function parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

// ── Helper: Send JSON response ──
function sendJson(res: http.ServerResponse, status: number, data: any) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// ── Auth check ──
function isAuthorized(req: http.IncomingMessage): boolean {
    const auth = req.headers['authorization'] || '';
    return auth === `Bearer ${SECRET}`;
}

// ── Run search in background via child process ──
function runSearchInBackground(mode: string, searchId?: string) {
    const args = ['tsx', 'scripts/run-search.ts', mode];
    if (searchId) args.push(searchId);

    console.log(`[VM Worker] Spawning: npx ${args.join(' ')}`);

    const child = spawn('npx', args, {
        cwd: '/home/ubuntu/maptamin',
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: { ...process.env },
    });

    const jobKey = searchId || `schedule-${Date.now()}`;

    child.stdout.on('data', (data: Buffer) => {
        process.stdout.write(`[Job ${jobKey}] ${data}`);
    });

    child.stderr.on('data', (data: Buffer) => {
        process.stderr.write(`[Job ${jobKey}] ${data}`);
    });

    child.on('close', (code: number | null) => {
        console.log(`[VM Worker] Job ${jobKey} exited with code ${code}`);
        if (searchId) activeJobs.delete(searchId);
    });

    child.on('error', (err: Error) => {
        console.error(`[VM Worker] Failed to spawn job ${jobKey}:`, err.message);
        if (searchId) activeJobs.delete(searchId);
    });
}

// ── HTTP Server ──
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    const path = url.pathname;
    const method = req.method?.toUpperCase();

    // Health check (no auth needed)
    if (path === '/health' && method === 'GET') {
        return sendJson(res, 200, {
            status: 'ok',
            activeJobs: activeJobs.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    }

    // Auth required for all other endpoints
    if (!isAuthorized(req)) {
        return sendJson(res, 401, { error: 'Unauthorized' });
    }

    // POST /run — manual search execution
    if (path === '/run' && method === 'POST') {
        try {
            const body = await parseBody(req);
            const { search_id } = body;

            if (!search_id) {
                return sendJson(res, 400, { error: 'search_id is required' });
            }

            // 중복 실행 방지
            if (activeJobs.has(search_id)) {
                console.log(`[VM Worker] Job ${search_id} already running. Skipping.`);
                return sendJson(res, 200, { status: 'already_running', search_id });
            }

            // DB에서 현재 상태 확인 (이미 completed/cancelled면 무시)
            const { data: search } = await supabase
                .from('searches')
                .select('status')
                .eq('id', search_id)
                .maybeSingle();

            if (!search) {
                return sendJson(res, 404, { error: 'Search not found' });
            }

            if (search.status === 'completed' || search.status === 'cancelled') {
                console.log(`[VM Worker] Search ${search_id} is already ${search.status}. Skipping.`);
                return sendJson(res, 200, { status: 'skipped', reason: search.status });
            }

            // Accept & run in background
            activeJobs.add(search_id);
            runSearchInBackground('MANUAL', search_id);

            return sendJson(res, 200, { status: 'accepted', search_id });
        } catch (err: any) {
            console.error('[VM Worker] /run error:', err.message);
            return sendJson(res, 500, { error: 'Internal error' });
        }
    }

    // POST /schedule — scheduled search execution
    if (path === '/schedule' && method === 'POST') {
        try {
            runSearchInBackground('SCHEDULE');
            return sendJson(res, 200, { status: 'accepted', mode: 'SCHEDULE' });
        } catch (err: any) {
            console.error('[VM Worker] /schedule error:', err.message);
            return sendJson(res, 500, { error: 'Internal error' });
        }
    }

    // 404
    sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[VM Worker] 🚀 Server running on port ${PORT}`);
    console.log(`[VM Worker] Health: GET http://0.0.0.0:${PORT}/health`);
    console.log(`[VM Worker] Run:    POST http://0.0.0.0:${PORT}/run`);
});
