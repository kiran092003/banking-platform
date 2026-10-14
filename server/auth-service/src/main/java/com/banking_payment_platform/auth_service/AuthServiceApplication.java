	package com.banking_payment_platform.auth_service;

	import org.springframework.boot.SpringApplication;
	import org.springframework.boot.autoconfigure.SpringBootApplication;
	import java.util.TimeZone;

	@SpringBootApplication
	public class AuthServiceApplication {

		public static void main(String[] args) {
			/*
			 * Every timestamp this service writes is a LocalDateTime taken from the JVM
			 * clock, and it goes onto the wire without an offset. Pinning the default zone
			 * to UTC is what makes those values unambiguous: the service means UTC whether
			 * it runs in a container or on a developer's machine, and the browser converts
			 * to the viewer's zone.
			 */
			TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

			SpringApplication.run(AuthServiceApplication.class, args);
		}

	}
