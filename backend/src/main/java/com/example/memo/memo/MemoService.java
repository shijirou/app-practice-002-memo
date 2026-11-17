package com.example.memo.memo;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemoService {

    private final MemoRepository repository;

    public MemoService(MemoRepository repository) {
        this.repository = repository;
    }

    /** keyword が無い（空・空白だけ）なら全件。onlyImportant が true なら重要だけ。 */
    @Transactional(readOnly = true)
    public List<MemoResponse> list(String keyword, boolean onlyImportant) {
        return repository.search(toLikePattern(keyword), onlyImportant).stream().map(MemoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public MemoCounts counts() {
        return new MemoCounts(repository.count(), repository.countByImportantTrue());
    }

    @Transactional
    public MemoResponse create(MemoBodyRequest request) {
        return MemoResponse.from(repository.save(new Memo(request.body())));
    }

    @Transactional
    public MemoResponse update(Long id, MemoBodyRequest request) {
        Memo memo = repository.findById(id).orElseThrow(() -> new MemoNotFoundException(id));
        memo.edit(request.body());
        return MemoResponse.from(memo);
    }

    @Transactional
    public void delete(Long id) {
        Memo memo = repository.findById(id).orElseThrow(() -> new MemoNotFoundException(id));
        repository.delete(memo);
    }

    @Transactional
    public MemoResponse setImportant(Long id, boolean important) {
        Memo memo = repository.findById(id).orElseThrow(() -> new MemoNotFoundException(id));
        memo.setImportant(important);
        return MemoResponse.from(memo);
    }

    /** 検索語を LIKE 用に直す。% _ とエスケープ用の ! は、記号ではなく普通の文字として探す。 */
    static String toLikePattern(String keyword) {
        String trimmed = keyword == null ? "" : keyword.strip();
        if (trimmed.isEmpty()) {
            return "%";
        }
        String escaped = trimmed.replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return "%" + escaped + "%";
    }
}
