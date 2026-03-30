import type { EditRequest } from '../validators/edit-request.js';

export type EditPipelineReport = {
  input: string;
  status: 'skipped';
  message: string;
};

export async function runEditPipeline(request: EditRequest): Promise<EditPipelineReport> {
  return {
    input: request.input,
    status: 'skipped',
    message: 'edit 流程骨架已准备，真实修改流程尚未实现'
  };
}
