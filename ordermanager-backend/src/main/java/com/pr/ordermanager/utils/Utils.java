package com.pr.ordermanager.utils;

/**
 * the utility class
 */
public class Utils {

    private Utils() {
    }

    /**
     *
     * @param value the value to check and return back
     * @return empty string if value
     */
    public static String emptyOrValue(String value){
        if(null==value){
            return "";
        }else{
            return value;
        }

    }

}
