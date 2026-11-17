package com.example.memo.memo;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/memos")
public class MemoController {

    private final MemoService service;

    public MemoController(MemoService service) {
        this.service = service;
    }

    /** 一覧・検索・重要のみ（F2・F3・F6）。作成日時の新しい順。keyword・important は省略できる。 */
    @GetMapping
    public List<MemoResponse> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "false") boolean important) {
        return service.list(keyword, important);
    }

    /** 件数（F2）。全件数と重要の件数。 */
    @GetMapping("/counts")
    public MemoCounts counts() {
        return service.counts();
    }

    /** 重要の付け外し（F6）。 */
    @PutMapping("/{id}/important")
    public MemoResponse setImportant(@PathVariable Long id, @Valid @RequestBody ImportantRequest request) {
        return service.setImportant(id, request.important());
    }

    /** 登録（F1）。 */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MemoResponse create(@Valid @RequestBody MemoCreateRequest request) {
        return service.create(request);
    }
}
