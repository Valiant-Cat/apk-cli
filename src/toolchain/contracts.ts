export type ToolSpec = {
  name: string;
  command: string;
};

export type ToolStatus = 'available' | 'missing';

export type ToolDetection = {
  name: string;
  status: ToolStatus;
};

export type DoctorReport = {
  tools: ToolDetection[];
};
