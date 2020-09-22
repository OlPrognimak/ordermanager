package com.pr.ordermanager.security.service;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.repository.UserRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import javax.persistence.EntityNotFoundException;

import static com.pr.ordermanager.exception.ErrorCode.CODE_0000;
import static com.pr.ordermanager.exception.ErrorCode.CODE_0007;

/**
 * @author Oleksandr Prognimak
 * @created 22.09.2020 - 19:01
 */
@Service
public class UserService {
    private static final Logger logger = LogManager.getLogger();
    @Autowired
    UserRepository userRepository;

    /**
     *
     * @param userName the user name for finding
     * @return the user which is found or exception
     */
    public InvoiceUser getUserOrException(String userName){
        try {
         InvoiceUser user = userRepository.findByUserName(userName);
         return user;
        }catch (EntityNotFoundException | DataAccessException ex){
            logger.error("Use is not Found",ex);
            throw new OrderManagerException(CODE_0007,"Can not find user with user name: "+userName);
        }catch(Exception e){
            logger.error("Use is not Found",e);
            throw new OrderManagerException(CODE_0000,"Unexpected error in searching user wit name: "+userName);
        }
    }
}
