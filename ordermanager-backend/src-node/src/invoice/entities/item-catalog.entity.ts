import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';

@Entity('item_catalog')
export class ItemCatalogEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column()
  description!: string;

  @Column({ nullable: true })
  shortDescription?: string;

  @Column('double precision')
  itemPrice!: number;

  @Column('int')
  vat!: number;
}
