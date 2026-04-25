import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { PersonEntity } from './person.entity';

@Entity('bank_account')
export class BankAccountEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ nullable: true })
  accountNumber?: string;

  @Column()
  iban!: string;

  @Column()
  bicSwift!: string;

  @Column()
  bankName!: string;

  @ManyToMany(() => PersonEntity, (person) => person.bankAccount)
  persons?: PersonEntity[];
}
