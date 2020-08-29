package com.pr.ordermanager.service;


import com.pr.ordermanager.controller.model.GridDataModel;
import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.jpa.entity.*;
import com.pr.ordermanager.repository.jpa.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
@Transactional
public class InvoiceService {
    @Autowired
    PersonRepository personRepository;
    @Autowired
    InvoiceRepository invoiceRepository;
    @Autowired
    PersonAddressRepository personAddressRepository;
    @Autowired
    BankAccountRepository bankAccountRepository;
    @Autowired
    private InvoiceMappingService invoiceMappingService;
    @Autowired
    private ItemCatalogRepository itemCatalogRepository;


    /**
     *
     * @param person the invoice to be saved
     * @Exception OrderManagerException
     */
    public void savePerson(Person person){

        if (validatePerson(person) ){
            try {
                personRepository.save(person);
            }catch(Exception ex) {
                throw new OrderManagerException("Unexpected exception",ex);
            }
        }else{
            throw new OrderManagerException("The validation of Person is failed.");
        }

    }

    /**
     * Retrievs all addresses for person which is defined by {@code personId}
     * @param personId id of person
     * @return all all addresses for person which is defined by {@code personId}
     */
    public List<PersonAddress> getAllPersonAddresses(Long personId){
        Optional<Person> optionalPerson = personRepository.findById(personId);
        if(optionalPerson.isPresent()){
          return  optionalPerson.get().getPersonAddress();
        }else{
            throw new OrderManagerException("The person with id "+personId+ " is not found.");
        }
    }


    /**
     * Retrievs all accounts of bank for person which is defined by {@code personId}
     * @param personId id of person
     * @return all all accounts for person which is defined by {@code personId}
     */
    public List<BankAccount> getAllBankAccounts(Long personId){
        Optional<Person> optionalPerson = personRepository.findById(personId);
         try {
             return optionalPerson.orElseThrow().getBankAccount();
         }catch(NoSuchElementException ex){
             throw new OrderManagerException("The person with id "+personId+ " is not found.");
         }catch(Exception ex){
            throw new OrderManagerException("Unexpected err with getting Person with id "+personId+ ".",ex);
         }
    }



    /**
     *
     * @param invoice the invoice to be saved
     * @return result of execution
     *
     * @Exception  OrderManagerException
     */
    public String saveInvoice(Invoice invoice){
        String invoiceNumder=null;
        if (validateInvoiceData(invoice) ){
            try {
                invoiceRepository.save(invoice);
                invoiceNumder = invoice.getInvoiceNumber();
            }catch(Exception ex) {
                throw new OrderManagerException("Unexpected exception",ex);
            }
        }else{
            throw new OrderManagerException("The validation of Person is failed.");
        }

        return invoiceNumder;
    }

    public Invoice getInvoice(String invoiceNumber){
        Invoice invoiceData = invoiceRepository.findByInvoiceNumber(invoiceNumber);
        return invoiceData;
    }

    private boolean validateInvoiceData(Invoice invoiceData){
        return true;
    }

    private boolean validatePerson(Person person){
        return true;
    }

    public List<GridDataModel> getAllData() {
//        List<GridDataModelEntity> entities = dataGridRepository.findAll();
//        List<GridDataModel> dataModelList = entities.stream().parallel().map(m -> map(m)).collect(Collectors.toList());
//
//        return dataModelList;
        return null;

    }

    public List<Person> getAllPersons(){
       return personRepository.findAll(
               Sort.by(Sort.Direction.ASC, "personLastName","companyName"));
    }

    public List<ItemCatalog> getAllCatalogItems(){
        return itemCatalogRepository.findAll(
                Sort.by(Sort.Direction.ASC, "shortDescription"));
    }

    public void saveItemCatalog(ItemCatalog itemCatalog){
       itemCatalogRepository.save(itemCatalog);
    }

}
