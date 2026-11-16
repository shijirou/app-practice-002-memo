package com.example.memo;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.type.LogicalType;

@Configuration
class JacksonConfig {

    /**
     * 文字の項目（本文など）に、数字や true/false が送られてきたら、文字に変えて受け付けず、エラー（400）にする。
     * 標準では {"body": 123} が "123" として登録されてしまうため。
     */
    @Bean
    JsonMapperBuilderCustomizer strictTextCustomizer() {
        return builder -> builder.withCoercionConfig(LogicalType.Textual, config -> {
            config.setCoercion(CoercionInputShape.Integer, CoercionAction.Fail);
            config.setCoercion(CoercionInputShape.Float, CoercionAction.Fail);
            config.setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail);
        });
    }
}
