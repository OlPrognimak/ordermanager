import { Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { CreatedResponseDto } from '../../common/dto/common.dto';
import { Public } from '../decorators/public.decorator';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Public()
  @Post('/registration')
  async createUser(
    @Headers('user-name') userName: string,
    @Headers('user-password') userPassword: string,
  ): Promise<CreatedResponseDto> {
    const user = await this.userService.createUserLogin(userName, userPassword);
    return new CreatedResponseDto(user.id);
  }

  @Post('/perform_logout')
  logout(): string {
    return '';
  }

  @Public()
  @Post('/login')
  login(@Headers('login-credentials') loginCredentials: string) {
    return this.authService.loginWithHeader(loginCredentials);
  }

  @Get('/checkUser')
  checkUser(@Req() req: any): string {
    return req.user ? '{"logged": true}' : '{"logged": false}';
  }
}
