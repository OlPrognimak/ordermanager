import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GrantedRoleEntity } from './granted-role.entity';

@Entity({ name: 'invoice_user' })
export class InvoiceUserEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ unique: true, nullable: false })
  username!: string;

  @Column({ nullable: false })
  password!: string;

  @Column({ nullable: true })
  roles?: string;

  @Column({name: 'account_non_expired',  default: true })
  accountNonExpired!: boolean;

  @Column({name: 'account_non_locked', default: true })
  accountNonLocked!: boolean;

  @Column({name: 'credentials_non_expired', default: true })
  credentialsNonExpired!: boolean;

  @Column({ default: true })
  enabled!: boolean;

  @ManyToMany(() => GrantedRoleEntity, { eager: true })
  @JoinTable({
    name: 'user_to_role',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  authorities!: GrantedRoleEntity[];
}
