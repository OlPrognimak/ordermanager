import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { InvoiceEntity } from '../../invoice/entities/invoice.entity';
import { InvoiceUserEntity } from '../../security/entities/invoice-user.entity';
import { BankAccountEntity } from './bank-account.entity';
import { PersonAddressEntity } from './person-address.entity';
import { PersonType } from './person-type.enum';

@Entity('person')
export class PersonEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ nullable: true })
  personLastName?: string;

  @Column({ nullable: true })
  personFirstName?: string;

  @Column({ nullable: true })
  companyName?: string;

  @Column({ nullable: true })
  taxNumber?: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'enum', enum: PersonType })
  personType!: PersonType;

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.invoiceSupplierPerson)
  invoiceSuppliers?: InvoiceEntity[];

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.invoiceRecipientPerson)
  invoiceRecipient?: InvoiceEntity[];

  @ManyToOne(() => InvoiceUserEntity)
  @JoinColumn({ name: 'user_id' })
  invoiceUser!: InvoiceUserEntity;

  @ManyToMany(() => PersonAddressEntity, { cascade: true, eager: true })
  @JoinTable({
    name: 'person_to_address',
    joinColumn: { name: 'persons_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'address_id', referencedColumnName: 'id' },
  })
  personAddress!: PersonAddressEntity[];

  @ManyToMany(() => BankAccountEntity, { cascade: true, eager: true })
  @JoinTable({
    name: 'person_to_account',
    joinColumn: { name: 'persons_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'bank_account_id', referencedColumnName: 'id' },
  })
  bankAccount!: BankAccountEntity[];
}
