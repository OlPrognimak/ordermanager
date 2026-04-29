import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'person_address' })
export class PersonAddressEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column() city!: string;
  @Column() street!: string;
  @Column() zipCode!: string;
  @Column({ name: 'post_Box_Code', nullable: true }) postBoxCode?: string;
}
