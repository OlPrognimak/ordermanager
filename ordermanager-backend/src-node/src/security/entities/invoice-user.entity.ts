import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { GrantedRoleEntity } from './granted-role.entity';

@Entity('invoice_user')
export class InvoiceUserEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ unique: true, nullable: false })
  username!: string;

  @Column({ nullable: false })
  password!: string;

  @Column({ nullable: true })
  roles?: string;

  @Column({ default: true })
  accountNonExpired!: boolean;

  @Column({ default: true })
  accountNonLocked!: boolean;

  @Column({ default: true })
  credentialsNonExpired!: boolean;

  @Column({ default: true })
  enabled!: boolean;

  @ManyToMany(() => GrantedRoleEntity, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_to_role',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  authorities!: GrantedRoleEntity[];
}
