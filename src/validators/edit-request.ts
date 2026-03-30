import { normalizeOutputPath } from '../core/config.js';
import { parseKeystoreCredentials, type KeystoreCredentials } from './keystore.js';

export type EditRequestInput = Partial<KeystoreCredentials> & {
  input?: string;
  output?: string;
  appName?: string;
  icon?: string;
  versionName?: string;
  versionCode?: string | number;
  packageName?: string;
};

export type EditRequest = KeystoreCredentials & {
  input: string;
  output?: string;
  appName?: string;
  icon?: string;
  versionName?: string;
  versionCode?: string;
  packageName?: string;
};

function normalizeInputPath(input: unknown): string {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new Error('edit 命令缺少输入文件');
  }

  return input;
}

export function parseEditRequest(input: EditRequestInput): EditRequest {
  return {
    input: normalizeInputPath(input.input),
    output: normalizeOutputPath(normalizeInputPath(input.input), typeof input.output === 'string' ? input.output : undefined),
    appName: typeof input.appName === 'string' ? input.appName : undefined,
    icon: typeof input.icon === 'string' ? input.icon : undefined,
    versionName: typeof input.versionName === 'string' ? input.versionName : undefined,
    versionCode: input.versionCode === undefined ? undefined : String(input.versionCode),
    packageName: typeof input.packageName === 'string' ? input.packageName : undefined,
    ...parseKeystoreCredentials(input)
  };
}
