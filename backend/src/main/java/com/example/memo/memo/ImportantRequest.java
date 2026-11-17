package com.example.memo.memo;

import jakarta.validation.constraints.NotNull;

/** 重要の付け外しで受け取るもの。 */
public record ImportantRequest(@NotNull(message = "important は true か false で指定してください") Boolean important) {}
