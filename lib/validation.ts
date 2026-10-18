import { z } from 'zod/v4';

export type ValidationStage = 'input' | 'analysis' | 'brief' | 'saved_analysis';
const messages: Record<ValidationStage, string> = {
  input: '요청 정보가 올바르지 않습니다. 파일과 제작 설정을 확인해 주세요.',
  analysis: 'PDF 분석 응답을 처리하지 못했습니다. 완료된 페이지는 유지되며, 다시 시도하면 이 구간부터 분석합니다.',
  brief: '인포그래픽 기획안의 응답 형식을 확인하지 못했습니다. 다시 시도하면 완료된 페이지 분석을 재사용합니다.',
  saved_analysis: '저장된 분석 결과의 형식이 올바르지 않습니다. PDF를 다시 선택해 분석해 주세요.',
};
export class ValidationError extends Error {
  readonly code: string;
  readonly stage: ValidationStage;
  readonly issues: { path: string; code: string }[];
  constructor(stage: ValidationStage, error: z.ZodError) {
    super(messages[stage]);
    this.name = 'ValidationError';
    this.stage = stage;
    this.code = `${stage}_format`;
    // Never include source content, received values, file names or credentials in diagnostics.
    this.issues = error.issues.slice(0, 12).map(issue => ({ path: issue.path.join('.'), code: issue.code }));
  }
}
export function parseChecked<T>(schema: z.ZodType<T>, value: unknown, stage: ValidationStage): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError(stage, result.error);
  return result.data;
}
