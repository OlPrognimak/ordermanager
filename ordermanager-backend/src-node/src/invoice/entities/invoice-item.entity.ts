import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InvoiceEntity } from './invoice.entity';
import { ItemCatalogEntity } from './item-catalog.entity';

@Entity({ name: 'invoice_item' })
export class InvoiceItemEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column('double precision') amountItems!: number;
  @Column('double precision') itemPrice!: number;
  @Column('int') vat!: number;
  @Column('double precision') sumNetto!: number;
  @Column('double precision') sumBrutto!: number;

  @ManyToOne(() => ItemCatalogEntity, { eager: true })
  @JoinColumn({ name: 'item_catalog_id' })
  itemCatalog!: ItemCatalogEntity;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.invoiceItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: InvoiceEntity;
}
