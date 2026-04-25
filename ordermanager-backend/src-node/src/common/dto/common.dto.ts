import { Type } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

export class CreatedResponseDto {
  createdId!: number;
}

export class DropdownDataTypeDto {
  label!: string;
  value!: string;
}

export class RequestPeriodDateDto {
  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ResponseExceptionDto {
  shortText?: string;
  errorMessage?: string;
  errorCode?: string;
}
