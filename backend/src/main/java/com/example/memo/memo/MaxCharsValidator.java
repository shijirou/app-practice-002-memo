package com.example.memo.memo;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class MaxCharsValidator implements ConstraintValidator<MaxChars, String> {

    private int max;

    @Override
    public void initialize(MaxChars annotation) {
        this.max = annotation.max();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // null や空は、ここでは調べない（@NotBlank が調べる）
        return value == null || value.codePointCount(0, value.length()) <= max;
    }
}
