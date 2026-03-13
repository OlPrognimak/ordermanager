package com.pr.ordermanager.person.controller;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.person.entity.PersonType;
import com.pr.ordermanager.person.model.PersonFormModel;
import org.apache.logging.log4j.util.Strings;

import static com.pr.ordermanager.exception.ErrorCode.*;

/**
 * Person special case validator. And depends on the person type can be PRIVATE or ORGANISATION
 * The rest attributes will be validated with Bean Validation
 * @author Oleksandr Prognimak
 * @since 29.09.2020 - 16:50
 * @see PersonType#PRIVATE
 * @see PersonType#ORGANISATION
 */
public class PersonValidator {

    public static boolean validate(PersonFormModel person) {

        PersonType type = PersonType.valueOf(person.getPersonType());

        return switch (type) {
            case PRIVATE -> {
                if (Strings.isBlank(person.getPersonFirstName())) {
                    throw new OrderManagerException(CODE_20021, CODE_20021.getMessage());
                }
                if (Strings.isBlank(person.getPersonLastName())) {
                    throw new OrderManagerException(CODE_20022, CODE_20022.getMessage());
                }
                if (Strings.isBlank(person.getTaxNumber())) {
                    throw new OrderManagerException(CODE_20022, CODE_20022.getMessage());
                }
                yield true;
            }

            case ORGANISATION -> {
                if (Strings.isBlank(person.getCompanyName())) {
                    throw new OrderManagerException(CODE_20023, CODE_20023.getMessage());
                }
                yield true;
            }
        };
    }
}
