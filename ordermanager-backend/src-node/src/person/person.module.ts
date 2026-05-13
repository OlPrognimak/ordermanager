import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonEntity } from './entities/person.entity';
import { PersonAddressEntity } from './entities/person-address.entity';
import { BankAccountEntity } from './entities/bank-account.entity';
import { PersonRepository } from './repositories/person.repository';
import { PersonService } from './services/person.service';
import { PersonController } from './controllers/person.controller';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [TypeOrmModule.forFeature([PersonEntity, PersonAddressEntity, BankAccountEntity]), SecurityModule],
  providers: [PersonRepository, PersonService],
  controllers: [PersonController],
  exports: [PersonService, PersonRepository],
})
export class PersonModule {}
