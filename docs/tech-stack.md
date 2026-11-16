# 技術スタック（使っているツールとバージョン）

[要件定義書](requirements.md) の「技術スタック」の詳細。
**使うツールを足したり、バージョンを上げたりしたら、この表も更新する。**
確認日: 2026-11-16（`npm view`・公式の配布情報で、正式公開された安定版の最新を確認）
方針: 正式公開された安定版の最新を使う（β版・RC・SNAPSHOT は使わない）。OS（Windows など）のバージョンは載せない。
状態: スライス 1（登録・一覧）で、画面・API・DB の土台を作り、下の版で動作確認した（画面は `frontend/package.json`、API は `backend/build.gradle`）。

## 実行環境
| 項目 | バージョン | 役割 |
|---|---|---|
| Node.js | 24.22.1 | 画面側の開発の道具を動かす（今の PC に入っている版） |
| npm | 11.19.1 | 画面側の部品（パッケージ）の管理 |
| Java（Temurin） | 25.0.4.1（LTS） | API を動かす。LTS（長く使える版）の最新 |
| Docker | 29.8.1 | PostgreSQL を動かす（`docker compose up -d`）。API のテストでも、使い捨ての PostgreSQL を起動する |

## 画面（React + Vite）
| 名前 | バージョン | 役割 |
|---|---|---|
| React | 19.3.1 | 画面を作る部品 |
| React DOM | 19.3.1 | React の画面をブラウザに表示する |
| Vite | 8.3.8 | 開発用サーバーと、公開用へのまとめ（ビルド） |
| @vitejs/plugin-react | 6.3.0 | Vite で React を使うための追加部品 |
| oxlint | 1.93.0 | コードの書き方をチェックする（lint） |
| Vitest | 5.1.0 | 自動テストを動かす |
| jsdom | 31.0.1 | テストの中で、ブラウザの代わりをする |
| @testing-library/react | 16.3.3 | テストで React の画面を表示して操作する |
| @testing-library/user-event | 14.6.12 | テストで、クリックや入力など人の操作を再現する |
| @testing-library/jest-dom | 7.0.1 | テストの確認（「表示されている」など）を書きやすくする |

## API（Spring Boot）
| 名前 | バージョン | 役割 |
|---|---|---|
| Spring Boot | 4.1.2 | API を作る土台 |
| Gradle | 9.9.1 | ビルドの道具。プロジェクトに付ける Gradle Wrapper で使うので、PC への導入は不要 |
| Spring Web MVC（starter-webmvc） | 4.1.2（Tomcat 11.0.27） | API の窓口（URL）を作る |
| Spring Data JPA（Hibernate） | 4.1.2（Hibernate 7.4.13） | Java から DB を読み書きする |
| Jackson | 3.1.7 | JSON の読み書き |
| Validation | 4.1.2 | 入力のチェック（空・文字数） |
| Flyway | 12.4.0 | 表の作成・変更を、SQL ファイル（`db/migration`）で履歴管理する |
| PostgreSQL JDBC ドライバー | 42.7.14 | Java から PostgreSQL につなぐ |
| Testcontainers | 2.0.5 | テストのときだけ、使い捨ての PostgreSQL を Docker で起動する |
| JUnit | 6.0.3 | API の自動テスト |

Spring Boot が管理する部品（Spring Web・Spring Data JPA・テスト用の部品など）の版は、Spring Boot 4.1.2 に合わせて決まる。足すときは、ここに名前を書く。

## DB
| 名前 | バージョン | 役割 |
|---|---|---|
| PostgreSQL | 18.7（Docker イメージ `postgres:18`） | メモを保存するデータベース。DB の名前・ユーザー・パスワードは `.env` に書く（`.env.example` が見本） |

## 開発の道具
| 名前 | バージョン | 役割 |
|---|---|---|
| Git | 2.55.0 | 変更の記録 |
| GitHub CLI（gh） | 2.100.0 | Issue・PR の作成 |

## ポート
画面 5173、API 8080、DB 5432（固定。[CLAUDE.md](../CLAUDE.md) 参照）。

## メモ
- **Node.js は 24.22.1 のまま使う**。公式の配布情報では、最新の LTS は 26.13.1。画面側の部品（Vite 8.3.8・Vitest 5.1.0）は 24 に対応していて問題ないので、PC の入れ替えは、必要になったときに相談する。
- Spring Boot は 4.2.0 が RC（正式前）の段階なので使わず、正式版の 4.1.2 にした。4.2 が正式になったら上げることを検討する。
- Gradle と PostgreSQL は PC に入れていない。Gradle は Wrapper（`backend/gradlew`）、PostgreSQL は Docker で動かしている。
- Spring Boot が管理する部品（Hibernate・Jackson・Tomcat など）の版は、Spring Boot に合わせて決まる。`./gradlew dependencies` で確認した値を書いている。
- GitHub Actions（CI）を足したら、`actions/checkout` などの版もここに書く。
- 部品の正確なバージョンは、作成後は `package-lock.json` などに固定される。そのとき、この表と食い違っていないか確認する。
