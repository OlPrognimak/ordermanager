package com.pr.ordermanager;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class AppController {

    //@RequestMapping("/")
    public String geitIndexHtml(){
      return "index.html";
    }
}
