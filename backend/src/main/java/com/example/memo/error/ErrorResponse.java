package com.example.memo.error;

/** 失敗したときに返す形。どの API も {"message": "..."} で返す（docs/data-design.md）。 */
public record ErrorResponse(String message) {
}
