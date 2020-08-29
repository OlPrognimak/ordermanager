package com.pr.ordermanager.repository.jpa;

import com.pr.ordermanager.jpa.entity.ItemCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemCatalogRepository extends JpaRepository<ItemCatalog, Long> {
}
