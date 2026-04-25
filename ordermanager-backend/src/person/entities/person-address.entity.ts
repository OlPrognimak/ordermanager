import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { PersonEntity } from './person.entity';

@Entity('person_address')
export class PersonAddressEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column()
  city!: string;

  @Column()
  street!: string;

  @Column()
  zipCode!: string;

  @Column({ nullable: true })
  postBoxCode?: string;

  @ManyToMany(() => PersonEntity, (person) => person.personAddress)
  persons?: PersonEntity[];
}
