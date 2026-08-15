package com.pr.ordermanager.exception;

import com.pr.ordermanager.common.model.ResponseException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * @author Oleksandr Prognimak
 * @created 29.09.2020 - 15:42
 */
class GlobalExceptionHandlerTest {

    @Test
    void handlesDuplicatePersonEmailWithUserFacingMessage() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        DataIntegrityViolationException exception = new DataIntegrityViolationException(
                "constraint [person_email_key]"
        );

        ResponseEntity<ResponseException> response = handler.handleAccessDeniedException(exception, null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(ErrorCode.CODE_0010, response.getBody().getErrorCode());
        assertEquals(ErrorCode.CODE_0010.getMessage(), response.getBody().getErrorMessage());
    }
}
