import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createApkCliMcpServer } from './server.js';
import { isProcessAlive, removeManagedMcpState, resolveMcpStateFile, writeManagedMcpState } from './state.js';

export type HttpMcpServerOptions = {
  host: string;
  port: number;
  stateFile: string;
};

export type HttpMcpServerHandle = {
  pid: number;
  host: string;
  port: number;
  url: string;
  startedAt: string;
  close(): Promise<void>;
};

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw === '' ? undefined : JSON.parse(raw);
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function createHttpHandler() {
  return async (request: IncomingMessage, response: ServerResponse) => {
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (method === 'GET' && url.pathname === '/health') {
      writeJson(response, 200, { status: 'ok' });
      return;
    }

    if (url.pathname !== '/mcp') {
      writeJson(response, 404, {
        jsonrpc: '2.0',
        error: {
          code: -32004,
          message: 'Not Found'
        },
        id: null
      });
      return;
    }

    if (method !== 'POST' && method !== 'GET' && method !== 'DELETE') {
      writeJson(response, 405, {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.'
        },
        id: null
      });
      return;
    }

    const server = createApkCliMcpServer();

    try {
      const parsedBody = method === 'POST' ? await readJsonBody(request) : undefined;
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined
      });

      await server.connect(transport);
      await transport.handleRequest(request, response, parsedBody);

      response.on('close', () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      if (!response.headersSent) {
        writeJson(response, 500, {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal server error'
          },
          id: null
        });
      }

      await server.close();
    }
  };
}

export async function startHttpMcpServer(options: HttpMcpServerOptions): Promise<HttpMcpServerHandle> {
  const stateFile = resolveMcpStateFile(options.stateFile);
  const httpServer = createServer();
  const requestHandler = createHttpHandler();

  httpServer.on('request', (request, response) => {
    void requestHandler(request, response);
  });

  await new Promise<void>((resolvePromise, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(options.port, options.host, () => {
      httpServer.off('error', reject);
      resolvePromise();
    });
  });

  const address = httpServer.address();
  if (address === null || typeof address === 'string') {
    await new Promise<void>((resolvePromise, reject) => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePromise();
      });
    });
    throw new Error('无法解析 MCP 服务监听地址');
  }

  const info = address as AddressInfo;
  const startedAt = new Date().toISOString();
  const handle: HttpMcpServerHandle = {
    pid: process.pid,
    host: options.host,
    port: info.port,
    url: `http://${options.host}:${info.port}/mcp`,
    startedAt,
    async close() {
      await new Promise<void>((resolvePromise, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolvePromise();
        });
      });
    }
  };

  await writeManagedMcpState(stateFile, {
    pid: handle.pid,
    host: handle.host,
    port: handle.port,
    url: handle.url,
    startedAt: handle.startedAt
  });

  const cleanup = async () => {
    if (isProcessAlive(process.pid)) {
      await removeManagedMcpState(stateFile);
    }
  };

  let shuttingDown = false;
  const shutdown = async (exitCode = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await cleanup();
    await handle.close();
    process.exit(exitCode);
  };

  process.on('SIGTERM', () => {
    void shutdown(0);
  });
  process.on('SIGINT', () => {
    void shutdown(0);
  });

  httpServer.on('close', () => {
    void cleanup();
  });

  return handle;
}
