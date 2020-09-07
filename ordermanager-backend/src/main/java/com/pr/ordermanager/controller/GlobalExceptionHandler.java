package com.pr.ordermanager.controller;

import com.pr.ordermanager.controller.model.ResponseException;
import com.pr.ordermanager.exception.OrderManagerException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import static com.pr.ordermanager.exception.ErrorCode.CODE_0000;

@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler({ Exception.class })
    public ResponseEntity<ResponseException> handleAccessDeniedException(
            Exception ex, WebRequest request) {

        if (ex instanceof OrderManagerException) {
            OrderManagerException ordMngEx = (OrderManagerException)ex;
            ResponseException responseException = ResponseException.builder()
                    .errorCode(ordMngEx.getErrorCode())
                    .errorMessage(ordMngEx.getMessage()).build();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(responseException);
        }else{
            ResponseException responseException = ResponseException.builder()
                    .errorCode(CODE_0000)
                    .errorMessage(ex.getMessage()).build();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(responseException);
        }

    }
}
