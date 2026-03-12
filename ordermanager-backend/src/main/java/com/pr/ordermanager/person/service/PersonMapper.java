package com.pr.ordermanager.person.service;

import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.entity.PersonType;
import com.pr.ordermanager.person.model.BankAccountFormModel;
import com.pr.ordermanager.person.model.PersonAddressFormModel;
import com.pr.ordermanager.person.model.PersonFormModel;
import com.pr.ordermanager.utils.Utils;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PersonMapper {

    @Mapping(target = "personType", expression = "java(PersonType.valueOf(source.getPersonType()))")
    @Mapping(target = "bankAccount", expression = "java(singleBankAccount(source.getBankAccountFormModel()))")
    @Mapping(target = "personAddress", expression = "java(singlePersonAddress(source.getPersonAddressFormModel()))")
    Person mapPersonFormModelToEntity(PersonFormModel source);

    @Mapping(target = "personType", expression = "java(source.getPersonType().name())")
    @Mapping(target = "bankAccountFormModel", expression = "java(firstBankAccount(source))")
    @Mapping(target = "personAddressFormModel", expression = "java(firstPersonAddress(source))")
    PersonFormModel mapPersonEntityToModel(Person source);

    @Mapping(target = "personType", expression = "java(PersonType.valueOf(source.getPersonType()))")
    void mapPersonCoreToAttachedEntity(PersonFormModel source, org.mapstruct.MappingTarget Person person);

    void mapPersonAddressFormModelToAttachedEntity(PersonAddressFormModel source, org.mapstruct.MappingTarget PersonAddress personAddress);

    void mapBankAccountFormModelToAttachedEntity(BankAccountFormModel source, org.mapstruct.MappingTarget BankAccount bankAccount);

    BankAccount mapBankAccountFormModelToEntity(BankAccountFormModel source);

    BankAccountFormModel mapBankAccountEntityToModel(BankAccount source);

    PersonAddress mapPersonAddressFormModelToEntity(PersonAddressFormModel source);

    PersonAddressFormModel mapPersonAddressToEntity(PersonAddress source);

    default void mapPersonFomModelToAttachedEntity(PersonFormModel source, Person person) {
        mapPersonCoreToAttachedEntity(source, person);
        if (person.getBankAccount() != null && !person.getBankAccount().isEmpty() && source.getBankAccountFormModel() != null) {
            mapBankAccountFormModelToAttachedEntity(source.getBankAccountFormModel(), person.getBankAccount().get(0));
        }
        if (person.getPersonAddress() != null && !person.getPersonAddress().isEmpty() && source.getPersonAddressFormModel() != null) {
            mapPersonAddressFormModelToAttachedEntity(source.getPersonAddressFormModel(), person.getPersonAddress().get(0));
        }
    }

    default List<DropdownDataType> mapPersonToDropdownType(List<Person> source) {
        return source.stream()
                .map(p -> new DropdownDataType(
                        (Utils.emptyOrValue(p.getPersonFirstName()) + " "
                                + Utils.emptyOrValue(p.getPersonLastName()) + " "
                                + Utils.emptyOrValue(p.getCompanyName())).trim(),
                        String.valueOf(p.getId())
                ))
                .collect(Collectors.toList());
    }

    default List<BankAccount> singleBankAccount(BankAccountFormModel model) {
        return model == null ? Collections.emptyList() : Collections.singletonList(mapBankAccountFormModelToEntity(model));
    }

    default List<PersonAddress> singlePersonAddress(PersonAddressFormModel model) {
        return model == null ? Collections.emptyList() : Collections.singletonList(mapPersonAddressFormModelToEntity(model));
    }

    default BankAccountFormModel firstBankAccount(Person source) {
        return source.getBankAccount() == null || source.getBankAccount().isEmpty()
                ? null : mapBankAccountEntityToModel(source.getBankAccount().get(0));
    }

    default PersonAddressFormModel firstPersonAddress(Person source) {
        return source.getPersonAddress() == null || source.getPersonAddress().isEmpty()
                ? null : mapPersonAddressToEntity(source.getPersonAddress().get(0));
    }
}
