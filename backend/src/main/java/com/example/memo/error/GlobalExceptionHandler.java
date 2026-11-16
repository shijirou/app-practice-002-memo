package com.example.memo.error;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * 失敗の返し方を 1 つの形にそろえる。
 * 入力の誤り・壊れた JSON・存在しない宛先などの標準の例外は、土台のクラスが拾い、
 * {"message": "..."} の形で返す。想定外のエラーは 500 にして、内部の詳細は返さない。
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getDefaultMessage())
                .findFirst()
                .orElse("入力が正しくありません");
        return ResponseEntity.status(status).headers(headers).body(new ErrorResponse(message));
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        String message = switch (statusCode.value()) {
            case 404 -> "見つかりません";
            case 405 -> "この操作はできません";
            default -> statusCode.is4xxClientError() ? "リクエストが正しくありません" : "エラーが起きました";
        };
        if (statusCode.is5xxServerError()) {
            log.error("サーバー側のエラー", ex);
        }
        return ResponseEntity.status(statusCode).headers(headers).body(new ErrorResponse(message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("想定外のエラー", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse("エラーが起きました"));
    }
}
