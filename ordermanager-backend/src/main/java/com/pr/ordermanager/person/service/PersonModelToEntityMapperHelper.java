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

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.entity.PersonType;
import com.pr.ordermanager.person.model.BankAccountFormModel;
import com.pr.ordermanager.person.model.PersonAddressFormModel;
import com.pr.ordermanager.person.model.PersonFormModel;
import com.pr.ordermanager.utils.Utils;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * The mapper class for mapping rest model object {@link PersonFormModel} and their member objects
 * to the entity {@link Person}
 *
 * @author  Oleksandr Prognimak
 */
public class PersonModelToEntityMapperHelper {


    /**
     *
     * @return object mapper for management with json and json objects
     */
   public static ObjectMapper createObjectMapper() {
       ObjectMapper mapper = new ObjectMapper();
       mapper.registerModule(new JavaTimeModule());
       mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
       return mapper;
   }

    /**
     * Maps source data from object {@link PersonFormModel} to the entity {@link Person}
     *
     * @param source the data source object {@link PersonFormModel}
     * @return the target object {@link Person}
     */
    public static Person mapPersonFormModelToEntity(PersonFormModel source) {
        return Person.builder()
                .personFirstName(source.getPersonFirstName())
                .personLastName(source.getPersonLastName())
                .personType(PersonType.valueOf(source.getPersonType()))
                .companyName(source.getCompanyName())
                .email(source.getEmail())
                .taxNumber ( source.getTaxNumber () )
                .bankAccount(
                        Collections.singletonList(
                                mapBankAccountFormModelToEntity(
                                        source.getBankAccountFormModel()
                                )
                        )
                )
                .personAddress(
                        Collections.singletonList(
                                mapPersonAddressFormModelToEntity(
                                        source.getPersonAddressFormModel()
                                )
                        )
                )
                .build();
    }

    /**
     * Maps source data from object {@link PersonFormModel} to the entity {@link Person}
     *
     * @param source the data source object {@link PersonFormModel}
     * @return the target object {@link Person}
     */
    public static PersonFormModel mapPersonEntityToModel(Person source) {
        return PersonFormModel.builder()
                .personFirstName(source.getPersonFirstName())
                .personLastName(source.getPersonLastName())
                .personType(source.getPersonType().name())
                .companyName(source.getCompanyName())
                .email(source.getEmail())
                .taxNumber ( source.getTaxNumber () )
                .bankAccountFormModel(
                        (source.getBankAccount()==null||source.getBankAccount().isEmpty())? null:
                                mapBankAccountEntityToModel(source.getBankAccount().get(0))
                )
                .personAddressFormModel(
                        mapPersonAddressToEntity (
                                source.getPersonAddress().get(0)
                        )
                )
                .build();
    }



    /**
     * Maps source data from object {@link PersonAddressFormModel} to the entity {@link PersonAddress}
     *
     * @param source the data source object {@link PersonFormModel}
     * @return the target object {@link Person}
     */
    public static PersonAddress mapPersonAddressFormModelToEntity(PersonAddressFormModel source){
       return PersonAddress.builder ()
           .postBoxCode (source.getPostBoxCode())
           .zipCode (source.getZipCode())
           .street (source.getStreet())
           .city (source.getCity()).build();
    }


    /**
     * Maps source data from object {@link PersonAddress} to the entity {@link PersonAddressFormModel}
     *
     * @param source the data source object {@link PersonAddress}
     * @return the target object {@link PersonAddressFormModel}
     */
    public static PersonAddressFormModel mapPersonAddressToEntity(PersonAddress source){
        return PersonAddressFormModel.builder ()
                .postBoxCode (source.getPostBoxCode())
                .zipCode (source.getZipCode())
                .street (source.getStreet())
                .city (source.getCity()).build();
    }


    /**
     * Maps source data from object {@link BankAccountFormModel} to the entity {@link BankAccount}
     *
     * @param source the data source object {@link BankAccountFormModel}
     * @return the target object {@link BankAccount}
     */
    public static BankAccount mapBankAccountFormModelToEntity(BankAccountFormModel source){
        return BankAccount.builder ()
             .bankName ( source.getBankName ())
             .iban (source.getIban())
             .bicSwift (source.getBicSwift ())
             .accountNumber (source.getAccountNumber()).build();
    }



    /**
     * Maps source data from object {@link BankAccount} to the entity {@link BankAccountFormModel}
     *
     * @param source the data source object {@link BankAccount}
     * @return the target object {@link BankAccountFormModel}
     */
    public static BankAccountFormModel mapBankAccountEntityToModel(BankAccount source){
        return BankAccountFormModel.builder ()
                .bankName( source.getBankName ())
                .iban(source.getIban())
                .bicSwift(source.getBicSwift ())
                .accountNumber (source.getAccountNumber()).build();
    }

    /**
     * Maps the data from list of source Entity objects {@link Person} to the list of rest model objects
     * {@link DropdownDataType}
     * @param source the list of Entity object {@link Person} with data for mapping to the target List
     * @return the List of target objects {@link InvoiceFormModel}
     */
    public static List<DropdownDataType> mapPersonToDropdownType(List<Person> source){
        return source.stream().map(p->new DropdownDataType(
                Utils.emptyOrValue(p.getPersonFirstName())+ " "+
                        Utils.emptyOrValue(p.getPersonLastName())+ " "+
                        Utils.emptyOrValue(p.getCompanyName()).trim(),
                String.valueOf(p.getId()))).collect(Collectors.toList());
    }

}
