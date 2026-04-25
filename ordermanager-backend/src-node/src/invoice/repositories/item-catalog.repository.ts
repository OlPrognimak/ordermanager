import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ItemCatalogEntity } from '../entities/item-catalog.entity';

@Injectable()
export class ItemCatalogRepository {
  constructor(@InjectRepository(ItemCatalogEntity) private readonly repo: Repository<ItemCatalogEntity>) {}

  findById(id: number): Promise<ItemCatalogEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findAll(): Promise<ItemCatalogEntity[]> {
    return this.repo.find({ order: { shortDescription: 'ASC' } });
  }

  findByDescriptionContainingOrShortDescriptionContaining(criteria: string): Promise<ItemCatalogEntity[]> {
    return this.repo.find({
      where: [{ description: ILike(`%${criteria}%`) }, { shortDescription: ILike(`%${criteria}%`) }],
      order: { shortDescription: 'ASC' },
    });
  }

  save(item: ItemCatalogEntity): Promise<ItemCatalogEntity> {
    return this.repo.save(item);
  }

  deleteById(id: number): Promise<void> {
    return this.repo.delete({ id }).then(() => undefined);
  }
}
