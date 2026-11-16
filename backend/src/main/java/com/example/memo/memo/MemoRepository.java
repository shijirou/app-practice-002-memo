package com.example.memo.memo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemoRepository extends JpaRepository<Memo, Long> {

    /** 作成日時の新しい順（同じ日時なら id の新しい順）。 */
    List<Memo> findAllByOrderByCreatedAtDescIdDesc();
}
