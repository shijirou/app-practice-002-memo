package com.example.memo.memo;

import jakarta.validation.constraints.NotBlank;

/** メモを登録するときに受け取るもの。前後の空白は取り除く。 */
public record MemoCreateRequest(
        @NotBlank(message = "本文を入力してください")
        @MaxChars(max = 1000, message = "本文は 1000 文字以内で入力してください")
        String body) {

    public MemoCreateRequest {
        body = body == null ? null : body.strip();
    }
}
