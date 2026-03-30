import { describe, expect, it } from 'vitest';
import { formatJsonReport } from '../../src/reporting/json-report.js';

describe('formatJsonReport', () => {
  it('serializes doctor, inspect, and edit reports with stable shapes', () => {
    expect(JSON.parse(formatJsonReport({
      command: 'doctor',
      tools: [{ name: 'apktool', status: 'available' }]
    }))).toEqual({
      tools: [{ name: 'apktool', status: 'available' }]
    });

    expect(JSON.parse(formatJsonReport({
      command: 'inspect',
      index: {
        packageName: 'com.example.demo',
        versionName: '1.2.3',
        versionCode: '42',
        labelRefs: ['@string/app_name'],
        iconRefs: ['@mipmap/ic_launcher']
      }
    }))).toEqual({
      packageName: 'com.example.demo',
      versionName: '1.2.3',
      versionCode: '42',
      labelRefs: ['@string/app_name'],
      iconRefs: ['@mipmap/ic_launcher']
    });

    expect(JSON.parse(formatJsonReport({
      command: 'edit',
      stages: [{ name: 'detect', status: 'ok' }],
      mutationReport: { changedFiles: ['AndroidManifest.xml'] },
      outputFile: 'dist/app-edited.apk',
      verify: {
        packageName: 'com.example.changed',
        versionName: '1.2.3',
        versionCode: '42',
        labelRefs: ['@string/app_name'],
        iconRefs: ['@mipmap/ic_launcher']
      }
    }))).toMatchObject({
      command: 'edit',
      outputFile: 'dist/app-edited.apk',
      mutationReport: { changedFiles: ['AndroidManifest.xml'] }
    });
  });
});
