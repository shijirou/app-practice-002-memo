package com.example.memo;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.memo.memo.MemoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** 登録（F1）と一覧（F2）の API を、本物の PostgreSQL につないで確かめる。 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class MemoApiTest {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	MemoRepository repository;

	@BeforeEach
	void clean() {
		repository.deleteAll();
	}

	private ResultActions postBody(String json) throws Exception {
		return mockMvc.perform(post("/api/memos").contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private ResultActions postMemo(String body) throws Exception {
		return postBody("{\"body\":\"" + body + "\"}");
	}

	@Test
	void 最初の一覧は空() throws Exception {
		mockMvc.perform(get("/api/memos")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void 登録すると201で返り_前後の空白は取り除かれ_重要は初期値false() throws Exception {
		postMemo("  架空商事の架空さんから電話  ")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id", notNullValue()))
				.andExpect(jsonPath("$.body").value("架空商事の架空さんから電話"))
				.andExpect(jsonPath("$.important").value(false))
				.andExpect(jsonPath("$.createdAt", notNullValue()));
	}

	@Test
	void 一覧は新しい順() throws Exception {
		postMemo("1つ目").andExpect(status().isCreated());
		postMemo("2つ目").andExpect(status().isCreated());
		postMemo("3つ目").andExpect(status().isCreated());

		mockMvc.perform(get("/api/memos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(3)))
				.andExpect(jsonPath("$[0].body").value("3つ目"))
				.andExpect(jsonPath("$[2].body").value("1つ目"));
	}

	@Test
	void 本文が空白だけなら400() throws Exception {
		postMemo("   ").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("本文を入力してください"));
	}

	@Test
	void 本文が無ければ400() throws Exception {
		postBody("{}").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("本文を入力してください"));
	}

	@Test
	void 本文が1001文字なら400() throws Exception {
		postMemo("あ".repeat(1001)).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("本文は 1000 文字以内で入力してください"));
	}

	@Test
	void 本文が1000文字ちょうどなら登録できる() throws Exception {
		postMemo("あ".repeat(1000)).andExpect(status().isCreated());
	}

	@Test
	void 絵文字は1文字と数える() throws Exception {
		// 絵文字 1000 個は、Java の length() では 2000。見た目の文字数 1000 なので、登録できる
		postMemo("😀".repeat(1000)).andExpect(status().isCreated());
		postMemo("😀".repeat(1001)).andExpect(status().isBadRequest());
	}

	@Test
	void 壊れたJSONは400で同じ形のエラー() throws Exception {
		postBody("{body:").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("リクエストが正しくありません"));
	}

	@Test
	void 存在しない宛先は404で同じ形のエラー() throws Exception {
		mockMvc.perform(get("/api/nothing")).andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("見つかりません"));
	}

	@Test
	void 使えない操作は405で同じ形のエラー() throws Exception {
		mockMvc.perform(delete("/api/memos")).andExpect(status().isMethodNotAllowed())
				.andExpect(jsonPath("$.message").value("この操作はできません"));
	}
}
