import { IsString, IsOptional } from 'class-validator';

export class JotformAnswerName {
  @IsOptional()
  @IsString()
  first?: string;

  @IsOptional()
  @IsString()
  last?: string;
}

export class JotformAnswer {
  @IsOptional()
  answer?: string;

  @IsOptional()
  first?: string;

  @IsOptional()
  last?: string;
}

export class JotformSubmission {
  answers: Record<string, JotformAnswer | JotformAnswerName>;
}
