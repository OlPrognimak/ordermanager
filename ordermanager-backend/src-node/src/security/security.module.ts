import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';

@Module({
  imports: [AuthModule],
  exports: [AuthModule],
})
export class SecurityModule {}
