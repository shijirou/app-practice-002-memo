package com.example.memo.memo;

/** 件数の表示用（「全 8 件（重要：2 件）」）。絞り込みに関係なく、全体の数を返す。 */
public record MemoCounts(long total, long important) {}
