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
package com.pr.ordermanager.exception;

/**
 * Enumeration with error codes
 * @author Oleksandr Prognimak
 */
public enum ErrorCode {
    CODE_0000(-1, "Unexpected error"),
    CODE_0001(1, "Can not save person"),
    CODE_0002(2, "Can not save invoice"),
    CODE_0003(3, "Can not find person"),
    CODE_0004(4, "Can not find invoice"),
    CODE_0005(5, "Can not find address"),
    CODE_0006(6, "Can not find bank account"),
    CODE_10001(10001, "Can not create jasper report"),
    CODE_10002(10002, "Database exception");
    private String shotDescription;
    private int errorCode;
    ErrorCode(int errorCode, String shotDescription){
      this.errorCode = errorCode;
      this.shotDescription = shotDescription;
    }
}
