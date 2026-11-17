package com.example.memo.memo;

/** 指定した id のメモがないとき。404 で返す。 */
public class MemoNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public MemoNotFoundException(Long id) {
        super("メモが見つかりません（id=" + id + "）");
    }
}
