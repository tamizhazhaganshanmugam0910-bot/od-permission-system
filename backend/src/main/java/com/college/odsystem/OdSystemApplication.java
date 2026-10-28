package com.college.odsystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OdSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(OdSystemApplication.class, args);
    }
}
