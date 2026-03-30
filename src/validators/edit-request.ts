import { parseKeystoreCredentials, type KeystoreCredentials } from './keystore.js';

export type EditRequestInput = Partial<KeystoreCredentials> & {
  input?: string;
};

export type EditRequest = KeystoreCredentials & {
  input: string;
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
    ...parseKeystoreCredentials(input)
  };
}
