package com.example.memo.memo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** メモ 1 件（表 memo の 1 行）。 */
@Entity
@Table(name = "memo")
public class Memo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String body;

    @Column(nullable = false)
    private boolean important;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Memo() {
        // JPA 用
    }

    public Memo(String body) {
        this.body = body;
        this.important = false;
        // DB（PostgreSQL）はマイクロ秒までしか持てない。ここで丸めておき、登録の返事と一覧で日時がずれないようにする
        this.createdAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
        this.updatedAt = this.createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getBody() {
        return body;
    }

    public boolean isImportant() {
        return important;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /** 重要の付け外し。本文の編集ではないので、更新日時は変えない。 */
    public void setImportant(boolean important) {
        this.important = important;
    }
}
