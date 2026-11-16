package com.example.memo.memo;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/memos")
public class MemoController {

    private final MemoService service;

    public MemoController(MemoService service) {
        this.service = service;
    }

    /** 一覧（F2）。作成日時の新しい順。 */
    @GetMapping
    public List<MemoResponse> list() {
        return service.list();
    }

    /** 登録（F1）。 */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MemoResponse create(@Valid @RequestBody MemoCreateRequest request) {
        return service.create(request);
    }
}
