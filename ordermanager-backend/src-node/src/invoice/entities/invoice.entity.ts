import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { PersonEntity } from '../../person/entities/person.entity';
import { InvoiceUserEntity } from '../../security/entities/invoice-user.entity';
import { InvoiceItemEntity } from './invoice-item.entity';
import { RateType } from './rate-type.enum';

@Entity('invoice')
export class InvoiceEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @OneToMany(() => InvoiceItemEntity, (item) => item.invoice, { cascade: true, eager: true, orphanedRowAction: 'delete' })
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

  @Column({ type: 'timestamptz' })
  creationDate!: Date;

  @Column({ type: 'timestamptz' })
  invoiceDate!: Date;

  @Column({ length: 50, unique: true })
  invoiceNumber!: string;

  @Column({ nullable: true })
  invoiceDescription?: string;

  @Column({ type: 'enum', enum: RateType })
  rateType!: RateType;

  @Column('double precision', { nullable: true })
  totalSumNetto?: number;

  @Column('double precision', { nullable: true })
  totalSumBrutto?: number;
}
