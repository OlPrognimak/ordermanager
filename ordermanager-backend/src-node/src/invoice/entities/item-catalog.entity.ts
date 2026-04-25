import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'item_catalog' })
export class ItemCatalogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column() description!: string;
  @Column({ nullable: true }) shortDescription?: string;
  @Column('double precision') itemPrice!: number;
  @Column('int') vat!: number;
}
