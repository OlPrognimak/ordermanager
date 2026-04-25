import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { InvoiceEntity } from './invoice.entity';
import { ItemCatalogEntity } from './item-catalog.entity';

@Entity('invoice_item')
export class InvoiceItemEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column('double precision')
  amountItems!: number;

  @Column('double precision')
  itemPrice!: number;

  @Column('int')
  vat!: number;

  @Column('double precision', { nullable: true })
  sumNetto?: number;

  @Column('double precision', { nullable: true })
  sumBrutto?: number;

  @ManyToOne(() => ItemCatalogEntity, { eager: true })
  itemCatalog!: ItemCatalogEntity;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.invoiceItems)
  invoice!: InvoiceEntity;
}
