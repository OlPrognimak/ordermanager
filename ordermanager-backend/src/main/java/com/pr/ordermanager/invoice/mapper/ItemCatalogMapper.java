package com.pr.ordermanager.invoice.mapper;

import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ItemCatalogMapper {

    ItemCatalog mapModelToItemCatalogEntity(ItemCatalogModel source);

    void mapItemCatalogModelToExistedEntity(ItemCatalogModel model, @MappingTarget ItemCatalog entity);
}
