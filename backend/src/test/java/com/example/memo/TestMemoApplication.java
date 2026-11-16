package com.example.memo;

import org.springframework.boot.SpringApplication;

public class TestMemoApplication {

	public static void main(String[] args) {
		SpringApplication.from(MemoApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
