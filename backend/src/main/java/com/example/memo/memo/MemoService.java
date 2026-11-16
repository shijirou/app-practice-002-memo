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

    @Transactional(readOnly = true)
    public List<MemoResponse> list() {
        return repository.findAllByOrderByCreatedAtDescIdDesc().stream().map(MemoResponse::from).toList();
    }

    @Transactional
    public MemoResponse create(MemoCreateRequest request) {
        return MemoResponse.from(repository.save(new Memo(request.body())));
    }
}
