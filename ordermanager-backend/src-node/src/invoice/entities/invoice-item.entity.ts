import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InvoiceEntity } from './invoice.entity';
import { ItemCatalogEntity } from './item-catalog.entity';

@Entity({ name: 'invoice_item' })
export class InvoiceItemEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column('double precision', { name: 'amount_items' }) amountItems!: number;
  @Column('double precision', { name: 'item_price' }) itemPrice!: number;
  @Column('int') vat!: number;
  @Column('double precision', { name: 'sum_netto' }) sumNetto!: number;
  @Column('double precision', { name: 'sum_brutto' }) sumBrutto!: number;

  @ManyToOne(() => ItemCatalogEntity, { eager: true })
  @JoinColumn({ name: 'item_catalog_id' })
  itemCatalog!: ItemCatalogEntity;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.invoiceItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: InvoiceEntity;
}
