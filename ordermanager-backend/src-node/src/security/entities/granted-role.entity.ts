import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'granted_role' })
export class GrantedRoleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'authority', type: 'varchar' })
  authority!: string;
}
