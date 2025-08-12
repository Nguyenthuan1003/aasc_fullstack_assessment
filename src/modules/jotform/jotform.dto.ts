/* eslint-disable @typescript-eslint/no-unsafe-call */
// jotform.dto.ts
import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NameDto {
  @IsString()
  first!: string;

  @IsString()
  last!: string;
}

export class JotformPayloadDto {
  @ValidateNested()
  @Type(() => NameDto)
  q4_name!: NameDto;

  @IsObject()
  q6_phoneNumber!: { full: string };

  @IsString()
  q5_email!: string;
}
