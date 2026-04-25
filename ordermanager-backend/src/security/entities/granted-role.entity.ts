import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { InvoiceUserEntity } from './invoice-user.entity';

@Entity('granted_role')
export class GrantedRoleEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column()
  authority!: string;

  @ManyToMany(() => InvoiceUserEntity, (user) => user.authorities)
  @JoinTable({
    name: 'user_to_role',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  users?: InvoiceUserEntity[];
}
