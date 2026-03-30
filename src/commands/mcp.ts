import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { startHttpMcpServer } from '../mcp/http.js';
import {
  isProcessAlive,
  mcpStateFileExists,
  readManagedMcpState,
  removeManagedMcpState,
  resolveMcpStateFile,
  type ManagedMcpState
} from '../mcp/state.js';

type McpServeOptions = {
  host?: string;
  port?: number;
  stateFile?: string;
};

type McpStartOptions = McpServeOptions & {
  startupTimeout?: number;
};

type McpStopOptions = {
  stateFile?: string;
};

type McpStatusOptions = {
  stateFile?: string;
};

function formatRunningState(stateFile: string, state: ManagedMcpState | null): string {
  if (state === null) {
    return [`running: no`, `state file: ${stateFile}`].join('\n') + '\n';
  }

  return [
    'running: yes',
    `pid: ${state.pid}`,
    `host: ${state.host}`,
    `port: ${state.port}`,
    `url: ${state.url}`,
    `started at: ${state.startedAt}`,
    `state file: ${stateFile}`
  ].join('\n') + '\n';
}

async function getManagedServerState(stateFile: string): Promise<ManagedMcpState | null> {
  if (!await mcpStateFileExists(stateFile)) {
    return null;
  }

  try {
    const state = await readManagedMcpState(stateFile);
    if (!isProcessAlive(state.pid)) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

async function waitForStartedState(stateFile: string, pid: number, timeoutMs: number): Promise<ManagedMcpState> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      throw new Error('MCP 后台服务已提前退出');
    }

    try {
      const state = await readManagedMcpState(stateFile);
      if (state.pid === pid && state.port > 0) {
        return state;
      }
    } catch {
      // ignore until timeout
    }

    await sleep(200);
  }

  throw new Error(`等待 MCP 服务启动超时: ${timeoutMs}ms`);
}

export async function runMcpServeCommand(options?: McpServeOptions): Promise<void> {
  const stateFile = resolveMcpStateFile(options?.stateFile);
  const runningState = await getManagedServerState(stateFile);

  if (runningState !== null && runningState.pid !== process.pid) {
    throw new Error(`MCP 服务已在运行: ${runningState.url}`);
  }

  const handle = await startHttpMcpServer({
    host: options?.host ?? '127.0.0.1',
    port: options?.port ?? 39039,
    stateFile
  });

  process.stdout.write(
    [
      `running: yes`,
      `pid: ${handle.pid}`,
      `url: ${handle.url}`,
      `state file: ${stateFile}`
    ].join('\n') + '\n'
  );

  await new Promise<void>(() => {
    // Keep the foreground process attached until a signal closes it.
  });
}

export async function runMcpStartCommand(options?: McpStartOptions): Promise<void> {
  const stateFile = resolveMcpStateFile(options?.stateFile);
  const existingState = await getManagedServerState(stateFile);

  if (existingState !== null) {
    process.stdout.write(formatRunningState(stateFile, existingState));
    return;
  }

  if (await mcpStateFileExists(stateFile)) {
    await removeManagedMcpState(stateFile);
  }

  const child = spawn(
    process.execPath,
    [
      process.argv[1]!,
      'mcp',
      'serve',
      '--host',
      options?.host ?? '127.0.0.1',
      '--port',
      String(options?.port ?? 39039),
      '--state-file',
      stateFile
    ],
    {
      cwd: process.cwd(),
      detached: true,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1'
      },
      stdio: 'ignore'
    }
  );

  child.unref();

  const state = await waitForStartedState(stateFile, child.pid ?? 0, options?.startupTimeout ?? 15000);
  process.stdout.write(formatRunningState(stateFile, state));
}

export async function runMcpStatusCommand(options?: McpStatusOptions): Promise<void> {
  const stateFile = resolveMcpStateFile(options?.stateFile);
  const state = await getManagedServerState(stateFile);
  process.stdout.write(formatRunningState(stateFile, state));
}

export async function runMcpStopCommand(options?: McpStopOptions): Promise<void> {
  const stateFile = resolveMcpStateFile(options?.stateFile);
  const state = await getManagedServerState(stateFile);

  if (state === null) {
    await removeManagedMcpState(stateFile);
    process.stdout.write(`stopped: no\nstate file: ${stateFile}\n`);
    return;
  }

  process.kill(state.pid, 'SIGTERM');

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (!isProcessAlive(state.pid)) {
      await removeManagedMcpState(stateFile);
      process.stdout.write(`stopped: yes\npid: ${state.pid}\nstate file: ${stateFile}\n`);
      return;
    }

    await sleep(200);
  }

  process.kill(state.pid, 'SIGKILL');
  await removeManagedMcpState(stateFile);
  process.stdout.write(`stopped: yes\npid: ${state.pid}\nstate file: ${stateFile}\n`);
}
