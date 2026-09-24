package com.metatwinwear.monitoring.config;

import org.apache.ibatis.session.ExecutorType;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Configures MyBatis execution for transactional batch writes. */
@Configuration
public class MyBatisConfiguration {

    /** Creates the shared mapper template with MyBatis {@link ExecutorType#BATCH}.
     *
     * @param sqlSessionFactory configured MyBatis session factory
     * @return mapper session template
     */
    @Bean
    public SqlSessionTemplate sqlSessionTemplate(SqlSessionFactory sqlSessionFactory) {
        return new SqlSessionTemplate(sqlSessionFactory, ExecutorType.BATCH);
    }
}
