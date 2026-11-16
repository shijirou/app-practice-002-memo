package com.example.memo.memo;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** 文字数の上限。見た目の 1 文字を 1 と数える（絵文字も 1。Java の length() だと 2 になるため）。 */
@Documented
@Constraint(validatedBy = MaxCharsValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface MaxChars {

    String message() default "文字数が多すぎます";

    int max();

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
