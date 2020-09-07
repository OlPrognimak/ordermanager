package com.pr.ordermanager.exception;

/**
 * Enumeration with error codes
 */
public enum ErrorCode {
    CODE_0000(-1, "Unexpected error"),
    CODE_0001(1, "Can not save person"),
    CODE_0002(2, "Can not save invoice"),
    CODE_0003(3, "Can not find person"),
    CODE_0004(4, "Can not find invoice"),
    CODE_0005(5, "Can not find address"),
    CODE_0006(6, "Can not find bank account");

    private String shotDescription;
    private int errorCode;
    ErrorCode(int errorCode, String shotDescription){
      this.errorCode = errorCode;
      this.shotDescription = shotDescription;
    }
}
