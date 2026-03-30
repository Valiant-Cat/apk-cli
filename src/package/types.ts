export type ResourceIndex = {
  packageName?: string;
  versionName?: string;
  versionCode?: string;
  // Aggregated resource references found anywhere in AndroidManifest.xml.
  labelRefs: string[];
  iconRefs: string[];
};
