/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package com.pr.ordermanager.person.service;

import com.pr.ordermanager.common.model.RequestPeriodDate;
import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.model.PersonFormModel;
import com.pr.ordermanager.person.repository.PersonRepository;
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.ToString;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static com.pr.ordermanager.exception.ErrorCode.*;

/**
 * The service for management with {@link Person}
 * @author Oleksandr Prognimak
 * @since  21.09.2020 - 14:39
 */
@Service
@Transactional
@RequiredArgsConstructor
@ToString
public class PersonService {
    private static final Logger logger = LogManager.getLogger(PersonService.class);

    private final PersonRepository personRepository;
    private final UserService userService;


    /**
     * Saves {@link Person} to the database
     *
     * @param person   the invoice to be saved
     * @param userName currently authenticated user name
     * @throws OrderManagerException in case if person can not be saved
     */
    public void savePerson(Person person, String userName) {
        InvoiceUser user = userService.getUserOrException(userName);
        person.setInvoiceUser(user);
        try {
            personRepository.save(person);
        } catch (Exception ex) {
            logger.error(ex);
            throw new OrderManagerException(CODE_0000, "Unexpected exception", ex);
        }
    }


    /**
     * Update {@link Person} to the database
     *
     * @param persons   the invoice to be saved
     * @param userName currently authenticated user name
     * @throws OrderManagerException in case if person can not be saved
     */
    public void updatePersons(final List<PersonFormModel> persons, final String userName) {
        persons.forEach(p -> {
            Optional<Person> personEntityOpt = personRepository.findById(p.getId());
            if(personEntityOpt.isPresent()) {
                Person person = personEntityOpt.get();
                try {
                    PersonModelToEntityMapperHelper.mapPersonFomModelToAttachedEntity(p, person);
                } catch (Exception ex) {
                    logger.error(ex);
                    throw new OrderManagerException(CODE_0000, "Can not update the person with id :" + p.getId(), ex);
                }
            }
        });


    }

    /**
     * Retrieves all addresses for person which is defined by {@code personId}
     *
     * @param personId id of person
     * @return all all addresses for person which is defined by {@code personId}
     */
    public List<PersonAddress> getAllPersonAddresses(Long personId){
        Optional<Person> optionalPerson = personRepository.findById(personId);
        if(optionalPerson.isPresent()){
            return  optionalPerson.get().getPersonAddress();
        }else{
            logger.error("The person with id "+personId+ " is not found.");
            throw new OrderManagerException(CODE_0005,"The person with id "+personId+ " is not found.");
        }
    }


    /**
     * Retrievs all accounts of bank for person which is defined by {@code personId}
     *
     * @param personId id of person
     * @return all all accounts for person which is defined by {@code personId}
     */
    public List<BankAccount> getAllBankAccounts(Long personId){
        Optional<Person> optionalPerson = personRepository.findById(personId);
        try {
            return optionalPerson.orElseThrow().getBankAccount();
        }catch(NoSuchElementException ex){
            logger.error("The person with id "+personId+ " is not found.");
            throw new OrderManagerException(CODE_0006,"The person with id "+personId+ " is not found.");
        }catch(Exception ex){
            logger.error(ex);
            throw new OrderManagerException(CODE_0000,"Unexpected err with getting Person with id "+personId+ ".",ex);
        }
    }

    /**
     * Search and retrieve the persons which belongs to the user {@code userName}
     *
     * @param userName the user whom belongs the persons
     * @return the list of {@link Person}
     */
    public List<Person> getAllUserPersons(String userName){

        try{
            List<Person> persons = personRepository.findAllPersonsByUserName(userName);
            if(persons.isEmpty()){
                throw new OrderManagerException(CODE_0009, CODE_0009.getMessage(userName));
            }
            return persons;
        }catch(Exception ex){
            logger.error("No persons for  "+userName+ " are found.");
            return new ArrayList<>();
            //throw new OrderManagerException(CODE_0000,"No persons for  "+userName+ " are found.");
        }
    }


    /**
     * Search and retrieve the persons which belongs to the user {@code userName}
     *
     * @param userName the user whom belongs the persons
     * @param periodDate the date of period
     * @return the list of {@link Person}
     */
    public List<Person> getAllUserPersons(String userName, RequestPeriodDate periodDate){

        try{
            List<Person> persons = personRepository.findAllPersonsByUserNameAndCreatedBetween(userName,
                    periodDate.getStartDate().toInstant(), periodDate.getEndDate().toInstant());
            if(persons.isEmpty()){
                throw new OrderManagerException(CODE_0009, CODE_0009.getMessage(userName));
            }
            return persons;
        }catch(Exception ex){
            logger.error("No persons for  "+userName+ " are found.", ex);
            return new ArrayList<>();
            //throw new OrderManagerException(CODE_0000,"No persons for  "+userName+ " are found.");
        }
    }

    public void deletePerson(Long personId, String principal) {

        Long[] personUsageInInvoices = personRepository.findPersonUsageInInvoices(personId);
        if(personUsageInInvoices == null || personUsageInInvoices.length==0) {
            logger.info("Try to delete person with ID :" + personId);
            personRepository.deletePersonByPersonId(personId);
        } else {
            throw new OrderManagerException(CODE_0000,"The person can not be deleted.");
        }

    }
}
