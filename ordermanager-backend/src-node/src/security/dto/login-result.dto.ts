export class LoginResultResponseDto {
  constructor(
    public readonly logged: boolean,
    public readonly token: string | null,
  ) {}
}
