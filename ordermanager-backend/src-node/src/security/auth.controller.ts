import { Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/registration')
  async createUser(
    @Headers('User-Name') userName: string,
    @Headers('User-Password') userPassword: string,
  ): Promise<{ createdId: string }> {
    const user = await this.authService.createUserLogin(userName, userPassword);
    return { createdId: user.id };
  }

  @Public()
  @Post('/login')
  async login(@Headers('Login-Credentials') loginCredential: string) {
    return this.authService.validatePasswordAndReturnToken(loginCredential);
  }

  @Post('/perform_logout')
  logout(): string {
    return '';
  }

  @Get('/checkUser')
  checkUser(@Req() req: { user?: unknown }): string {
    return req.user ? '{"logged": true}' : '{"logged": false}';
  }
}
