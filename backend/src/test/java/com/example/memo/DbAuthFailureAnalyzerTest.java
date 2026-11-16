package com.example.memo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import java.sql.SQLException;
import org.springframework.boot.diagnostics.FailureAnalysis;

class DbAuthFailureAnalyzerTest {

	private final DbAuthFailureAnalyzer analyzer = new DbAuthFailureAnalyzer();

	@Test
	void パスワードが違うときは_直し方を案内する() {
		SQLException error = new SQLException("password authentication failed", "28P01");

		FailureAnalysis analysis = analyzer.analyze(new RuntimeException(error));

		assertThat(analysis).isNotNull();
		assertThat(analysis.getDescription()).contains("ユーザー名かパスワード");
		assertThat(analysis.getAction()).contains(".env").contains("DB_PASSWORD");
	}

	@Test
	void ほかのDBエラーは扱わない() {
		SQLException error = new SQLException("connection refused", "08004");

		assertThat(analyzer.analyze(new RuntimeException(error))).isNull();
	}
}
