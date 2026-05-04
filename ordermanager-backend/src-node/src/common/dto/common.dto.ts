export class CreatedResponseDto {
  constructor(public readonly createdId: number) {}
}

export class DropdownDataTypeDto {
  constructor(
    public readonly label: string,
    public readonly value: string,
  ) {}
}

export class RequestPeriodDateDto {
  startDate!: string;
  endDate!: string;
}

export class ResponseExceptionDto {
  shortText?: string;
  errorMessage?: string;
  errorCode?: { errorCode: number; message: string };
}
