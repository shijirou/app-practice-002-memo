package com.example.memo;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.memo.memo.MemoRepository;
import com.jayway.jsonpath.JsonPath;
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
	void 登録の返事と一覧で_日時が同じ() throws Exception {
		// 返事の日時と、DB から読み直した日時がずれないこと（DB はマイクロ秒までしか持てない）
		String created = JsonPath.read(
				postMemo("日時の確認").andReturn().getResponse().getContentAsString(), "$.createdAt");
		mockMvc.perform(get("/api/memos")).andExpect(jsonPath("$[0].createdAt").value(created));
	}

	@Test
	void 改行しないスペースだけの本文は400() throws Exception {
		// 画面（JavaScript の trim）は空白と見なす。API も同じにそろえる
		postBody("{\"body\":\"\\u00a0\\u00a0\"}").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("本文を入力してください"));
		postBody("{\"body\":\"\\ufeff\"}").andExpect(status().isBadRequest());
	}

	@Test
	void 本文の前後の改行しないスペースは取り除かれる() throws Exception {
		postBody("{\"body\":\"\\u00a0本文\\u00a0\"}").andExpect(status().isCreated())
				.andExpect(jsonPath("$.body").value("本文"));
	}

	@Test
	void 本文が数字なら400() throws Exception {
		postBody("{\"body\":123}").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("リクエストが正しくありません"));
	}

	@Test
	void Content_Typeが違うと415で原因が分かる() throws Exception {
		mockMvc.perform(post("/api/memos").contentType(MediaType.TEXT_PLAIN).content("x"))
				.andExpect(status().isUnsupportedMediaType())
				.andExpect(jsonPath("$.message").value("送る形式（Content-Type）が正しくありません。JSON で送ってください"));
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

	// ---- 検索（F3）・重要（F6） ----

	private int postAndGetId(String body) throws Exception {
		return JsonPath.read(postMemo(body).andReturn().getResponse().getContentAsString(), "$.id");
	}

	private ResultActions putImportant(Object id, String json) throws Exception {
		return mockMvc.perform(put("/api/memos/" + id + "/important")
				.contentType(MediaType.APPLICATION_JSON).content(json));
	}

	@Test
	void キーワードを含む本文だけに絞り込み_新しい順は保つ() throws Exception {
		postMemo("見積書を送る");
		postMemo("会議室の予約");
		postMemo("見積書の再送");

		mockMvc.perform(get("/api/memos").param("keyword", "見積書"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(2)))
				.andExpect(jsonPath("$[0].body").value("見積書の再送"))
				.andExpect(jsonPath("$[1].body").value("見積書を送る"));
	}

	@Test
	void 検索は大文字小文字を区別しない() throws Exception {
		postMemo("Order the A4 paper");
		mockMvc.perform(get("/api/memos").param("keyword", "a4 PAPER")).andExpect(jsonPath("$", hasSize(1)));
	}

	@Test
	void 検索語の前後の空白は無視し_空白だけなら全件() throws Exception {
		postMemo("1つ目");
		postMemo("2つ目");
		mockMvc.perform(get("/api/memos").param("keyword", "  1つ目  ")).andExpect(jsonPath("$", hasSize(1)));
		mockMvc.perform(get("/api/memos").param("keyword", "   ")).andExpect(jsonPath("$", hasSize(2)));
		mockMvc.perform(get("/api/memos").param("keyword", "")).andExpect(jsonPath("$", hasSize(2)));
	}

	@Test
	void 検索語の記号_パーセント_アンダースコア_感嘆符は普通の文字として探す() throws Exception {
		postMemo("割引は 50% まで");
		postMemo("file_name の確認");
		postMemo("注意!! 期限");
		postMemo("ふつうのメモ");

		mockMvc.perform(get("/api/memos").param("keyword", "%")).andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].body").value("割引は 50% まで"));
		mockMvc.perform(get("/api/memos").param("keyword", "_")).andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].body").value("file_name の確認"));
		mockMvc.perform(get("/api/memos").param("keyword", "!")).andExpect(jsonPath("$", hasSize(1)));
		mockMvc.perform(get("/api/memos").param("keyword", "!!")).andExpect(jsonPath("$", hasSize(1)));
		mockMvc.perform(get("/api/memos").param("keyword", "e_n")).andExpect(jsonPath("$", hasSize(1)));
		mockMvc.perform(get("/api/memos").param("keyword", "ふ_つ")).andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void SQLの断片を検索語にしても_ただの文字として扱われる() throws Exception {
		postMemo("ふつうのメモ");
		mockMvc.perform(get("/api/memos").param("keyword", "' OR '1'='1")).andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void 一致しなければ空の配列() throws Exception {
		postMemo("ふつうのメモ");
		mockMvc.perform(get("/api/memos").param("keyword", "存在しない語")).andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void 重要を付けると_返事と一覧に反映され_外すと戻る() throws Exception {
		int id = postAndGetId("大事なメモ");

		putImportant(id, "{\"important\":true}").andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id))
				.andExpect(jsonPath("$.important").value(true));
		mockMvc.perform(get("/api/memos")).andExpect(jsonPath("$[0].important").value(true));

		putImportant(id, "{\"important\":false}").andExpect(status().isOk())
				.andExpect(jsonPath("$.important").value(false));
		mockMvc.perform(get("/api/memos")).andExpect(jsonPath("$[0].important").value(false));
	}

	@Test
	void 重要を切り替えても_並び順と更新日時は変わらない() throws Exception {
		int first = postAndGetId("1つ目");
		postMemo("2つ目");
		String before = JsonPath.read(
				mockMvc.perform(get("/api/memos")).andReturn().getResponse().getContentAsString(),
				"$[1].updatedAt");

		putImportant(first, "{\"important\":true}").andExpect(status().isOk());

		mockMvc.perform(get("/api/memos"))
				.andExpect(jsonPath("$[0].body").value("2つ目"))
				.andExpect(jsonPath("$[1].body").value("1つ目"))
				.andExpect(jsonPath("$[1].updatedAt").value(before));
	}

	@Test
	void 重要のみで絞り込み_検索とも組み合わせられる() throws Exception {
		int a = postAndGetId("見積書A");
		postMemo("見積書B");
		int c = postAndGetId("会議室");
		putImportant(a, "{\"important\":true}");
		putImportant(c, "{\"important\":true}");

		mockMvc.perform(get("/api/memos").param("important", "true"))
				.andExpect(jsonPath("$", hasSize(2)))
				.andExpect(jsonPath("$[0].body").value("会議室"))
				.andExpect(jsonPath("$[1].body").value("見積書A"));
		mockMvc.perform(get("/api/memos").param("important", "true").param("keyword", "見積書"))
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].body").value("見積書A"));
		// important=false は「絞り込まない」（重要でないものだけ、ではない）
		mockMvc.perform(get("/api/memos").param("important", "false")).andExpect(jsonPath("$", hasSize(3)));
	}

	@Test
	void 件数は全体の数で_絞り込みに左右されない() throws Exception {
		mockMvc.perform(get("/api/memos/counts")).andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(0)).andExpect(jsonPath("$.important").value(0));

		int a = postAndGetId("1つ目");
		postMemo("2つ目");
		postMemo("3つ目");
		putImportant(a, "{\"important\":true}");

		mockMvc.perform(get("/api/memos/counts"))
				.andExpect(jsonPath("$.total").value(3)).andExpect(jsonPath("$.important").value(1));
	}

	@Test
	void 存在しないidの重要の切り替えは404() throws Exception {
		putImportant(999999, "{\"important\":true}").andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("メモが見つかりません"));
	}

	@Test
	void 重要の切り替えで_idが数字でなければ400() throws Exception {
		putImportant("abc", "{\"important\":true}").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("リクエストが正しくありません"));
	}

	@Test
	void 重要の指定が無い_または真偽でなければ400() throws Exception {
		int id = postAndGetId("メモ");
		putImportant(id, "{}").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("important は true か false で指定してください"));
		putImportant(id, "{\"important\":\"yes\"}").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("リクエストが正しくありません"));
	}

	@Test
	void importantが真偽でない検索は400() throws Exception {
		mockMvc.perform(get("/api/memos").param("important", "maybe")).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("リクエストが正しくありません"));
	}
}
