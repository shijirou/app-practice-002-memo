package com.example.memo.memo;

import java.time.Instant;

/** 画面に返すメモ。エンティティをそのまま返さず、この形にする。 */
public record MemoResponse(Long id, String body, boolean important, Instant createdAt, Instant updatedAt) {

    static MemoResponse from(Memo memo) {
        return new MemoResponse(
                memo.getId(), memo.getBody(), memo.isImportant(), memo.getCreatedAt(), memo.getUpdatedAt());
    }
}
