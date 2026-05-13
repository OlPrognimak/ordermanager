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
import { InvoiceUserEntity } from '../../security/entities/invoice-user.entity';
import { PersonType } from './person-type.enum';
import { PersonAddressEntity } from './person-address.entity';
import { BankAccountEntity } from './bank-account.entity';
import { InvoiceEntity } from '../../invoice/entities/invoice.entity';

@Entity({ name: 'person' })
export class PersonEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'person_Last_Name', nullable: true }) personLastName?: string;
  @Column({ name: 'person_First_Name', nullable: true }) personFirstName?: string;
  @Column({ name: 'company_Name', nullable: true }) companyName?: string;
  @Column({ name: 'tax_Number', nullable: true }) taxNumber?: string;
  @Column({ unique: true }) email!: string;

  @Column({ type: 'enum', enum: PersonType })
  personType!: PersonType;

  @ManyToOne(() => InvoiceUserEntity, { eager: false })
  @JoinColumn({ name: 'user_id' })
  invoiceUser!: InvoiceUserEntity;

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.invoiceSupplierPerson)
  invoiceSuppliers?: InvoiceEntity[];

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.invoiceRecipientPerson)
  invoiceRecipient?: InvoiceEntity[];

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

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  created!: Date;
}
