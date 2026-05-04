import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'bank_account' })
export class BankAccountEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ nullable: true }) accountNumber?: string;
  @Column() iban!: string;
  @Column() bicSwift!: string;
  @Column() bankName!: string;
}
