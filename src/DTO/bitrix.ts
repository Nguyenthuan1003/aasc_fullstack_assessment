import { IsNotEmpty, IsString, IsNumberString } from 'class-validator';

export class InstallVNDto {
  @IsString()
  @IsNotEmpty()
  AUTH_ID!: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_ID!: string;

  @IsNumberString()
  @IsNotEmpty()
  AUTH_EXPIRES!: string;

  @IsString()
  DOMAIN?: string;
}
