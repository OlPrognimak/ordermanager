import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../security/auth.module';
import { BankAccountEntity } from './entities/bank-account.entity';
import { PersonAddressEntity } from './entities/person-address.entity';
import { PersonEntity } from './entities/person.entity';
import { PersonController } from './person.controller';
import { PersonService } from './person.service';

@Module({
  imports: [TypeOrmModule.forFeature([PersonEntity, PersonAddressEntity, BankAccountEntity]), AuthModule],
  controllers: [PersonController],
  providers: [PersonService],
  exports: [PersonService, TypeOrmModule],
})
export class PersonModule {}
