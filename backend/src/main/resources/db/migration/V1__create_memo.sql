-- メモの表（docs/data-design.md の ER 図どおり）
CREATE TABLE memo (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    body       VARCHAR(1000) NOT NULL,
    important  BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 一覧は作成日時の新しい順に読むので、索引を付ける
CREATE INDEX memo_created_at_idx ON memo (created_at DESC, id DESC);
