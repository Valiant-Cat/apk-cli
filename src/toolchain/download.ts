export type DownloadRequest = {
  url: string;
  destination: string;
};

export type DownloadResult = {
  path: string;
};

export async function downloadArtifact(_request: DownloadRequest): Promise<DownloadResult> {
  throw new Error('downloadArtifact is not implemented');
}
