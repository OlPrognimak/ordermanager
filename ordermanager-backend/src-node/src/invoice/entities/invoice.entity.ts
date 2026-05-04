import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { InvoiceUserEntity } from '../../security/entities/invoice-user.entity';
import { PersonEntity } from '../../person/entities/person.entity';
import { RateType } from './rate-type.enum';
import { InvoiceItemEntity } from './invoice-item.entity';

@Entity({ name: 'invoice' })
export class InvoiceEntity  {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @OneToMany(() => InvoiceItemEntity, (item) => item.invoice, { cascade: true, eager: true })
  invoiceItems!: InvoiceItemEntity[];

  @ManyToOne(() => InvoiceUserEntity)
  @JoinColumn({ name: 'user_id' })
  invoiceUser!: InvoiceUserEntity;

  @ManyToOne(() => PersonEntity)
  @JoinColumn({ name: 'invoice_supplier' })
  invoiceSupplierPerson!: PersonEntity;

  @ManyToOne(() => PersonEntity)
  @JoinColumn({ name: 'invoice_recipient' })
  invoiceRecipientPerson!: PersonEntity;

  @Column({name: 'creation_date', type: 'timestamptz' }) creationDate!: Date;
  @Column({name: 'invoice_date', type: 'timestamptz' }) invoiceDate!: Date;
  @Column({ name: 'invoice_number', length: 50, unique: true }) invoiceNumber!: string;
  @Column({ name: 'invoice_description', nullable: true }) invoiceDescription?: string;
  @Column({ name: 'rate_type', type: 'enum', enum: RateType }) rateType!: RateType;
  @Column('double precision', { name: 'total_sum_netto', nullable: true }) totalSumNetto?: number;
  @Column('double precision', { name: 'total_sum_brutto', nullable: true }) totalSumBrutto?: number;
}
