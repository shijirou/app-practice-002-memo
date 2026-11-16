package com.example.memo.memo;

import jakarta.validation.constraints.NotBlank;
import java.util.regex.Pattern;

/** メモを登録するときに受け取るもの。前後の空白は取り除く。 */
public record MemoCreateRequest(
        @NotBlank(message = "本文を入力してください")
        @MaxChars(max = 1000, message = "本文は 1000 文字以内で入力してください")
        String body) {

    // 画面（JavaScript の trim）と同じ範囲の空白を取り除く。
    // Java 標準の strip() は、改行しないスペース（U+00A0）や U+FEFF を空白と見なさないため、自前で決める
    private static final Pattern EDGE_SPACES = Pattern.compile("^[\\p{Z}\\s\\uFEFF]+|[\\p{Z}\\s\\uFEFF]+$");

    public MemoCreateRequest {
        body = body == null ? null : EDGE_SPACES.matcher(body).replaceAll("");
    }
}
