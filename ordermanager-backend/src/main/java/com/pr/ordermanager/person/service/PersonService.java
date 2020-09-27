package com.pr.ordermanager.person.service;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.repository.BankAccountRepository;
import com.pr.ordermanager.person.repository.PersonAddressRepository;
import com.pr.ordermanager.person.repository.PersonRepository;
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static com.pr.ordermanager.exception.ErrorCode.*;

/**
 *
 * @author Oleksandr Prognimak
 * @since  21.09.2020 - 14:39
 */
@Service
public class PersonService {
    @Autowired
    PersonRepository personRepository;
    @Autowired
    PersonAddressRepository personAddressRepository;
    @Autowired
    BankAccountRepository bankAccountRepository;
    @Autowired
    UserService userService;

    /**
     *
     * @param person the invoice to be saved
     * @param userName currently authenticated user name
     * @exception OrderManagerException in case if person can not be saved
     */
    public void savePerson(Person person, String userName){
        InvoiceUser user = userService.getUserOrException(userName);
        person.setInvoiceUser(user);
        if (validatePerson(person) ){
            try {
                personRepository.save(person);
            }catch(Exception ex) {
                throw new OrderManagerException(CODE_0000,"Unexpected exception",ex);
            }
        }else{
            throw new OrderManagerException(CODE_0001,"The validation of Person is failed.");
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
            throw new OrderManagerException(CODE_0005,"The person with id "+personId+ " is not found.");
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
            throw new OrderManagerException(CODE_0006,"The person with id "+personId+ " is not found.");
        }catch(Exception ex){
            throw new OrderManagerException(CODE_0000,"Unexpected err with getting Person with id "+personId+ ".",ex);
        }
    }

    public List<Person> getAllPersons(String userName){
        return personRepository.findAllPersonsByUserName(userName);
       // return personRepository.findAll(
       //         Sort.by(Sort.Direction.ASC, "personLastName","companyName"));
    }

    private boolean validatePerson(Person person){
        return true;
    }

}
