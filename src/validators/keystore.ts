export type KeystoreCredentials = {
  keystore: string;
  storePass: string;
  keyAlias: string;
  keyPass: string;
};

function normalizeValue(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`edit 命令缺少必要的 keystore 参数：${fieldName}`);
  }

  return value;
}

export function parseKeystoreCredentials(input: Partial<KeystoreCredentials>): KeystoreCredentials {
  return {
    keystore: normalizeValue(input.keystore, 'keystore'),
    storePass: normalizeValue(input.storePass, 'store-pass'),
    keyAlias: normalizeValue(input.keyAlias, 'key-alias'),
    keyPass: normalizeValue(input.keyPass, 'key-pass')
  };
}
