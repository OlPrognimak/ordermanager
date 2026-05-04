import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'item_catalog' })
export class ItemCatalogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column() description!: string;
  @Column({ name: 'short_description', nullable: true }) shortDescription?: string;
  @Column('double precision', {name: 'item_price'}) itemPrice!: number;
  @Column('int') vat!: number;
}
