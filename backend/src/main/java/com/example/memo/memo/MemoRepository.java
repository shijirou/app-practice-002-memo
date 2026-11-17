package com.example.memo.memo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemoRepository extends JpaRepository<Memo, Long> {

    /**
     * 絞り込み（F3・F6）。作成日時の新しい順（同じ日時なら id の新しい順）。
     * pattern は LIKE 用の形（前後に % を付け、特別な記号は ! で打ち消し済み）。全件なら "%"。
     * onlyImportant が true のときは、重要なメモだけ。
     */
    @Query("""
            select m from Memo m
            where lower(m.body) like lower(:pattern) escape '!'
              and (:onlyImportant = false or m.important = true)
            order by m.createdAt desc, m.id desc
            """)
    List<Memo> search(@Param("pattern") String pattern, @Param("onlyImportant") boolean onlyImportant);

    long countByImportantTrue();
}
