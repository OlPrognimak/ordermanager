import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class AbstractEntity {
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created', nullable: true })
  created?: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated', nullable: true })
  updated?: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;
}
