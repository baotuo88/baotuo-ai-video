package com.stonewu.fusion.service.generation;

import com.stonewu.fusion.entity.ai.ApiConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class ProviderMediaAuthorizationTests {
    @ParameterizedTest
    @CsvSource({
            "https://provider.example/v1/content, https://provider.example/v1, true",
            "https://provider.example:443/content, https://PROVIDER.example/v1, true",
            "https://cdn.example/content, https://provider.example/v1, false",
            "http://provider.example/content, https://provider.example/v1, false",
            "https://provider.example:8443/content, https://provider.example/v1, false"
    })
    void forwardsCredentialsOnlyToTheSameOrigin(String media, String api, boolean expected) {
        ApiConfig config = ApiConfig.builder().apiUrl(api).apiKey("test-key").build();
        assertThat(ProviderMediaAuthorization.shouldAuthorize(media, config, null)).isEqualTo(expected);
    }

    @Test
    void normalizedDefaultAddressStillAuthenticatesOfficialMedia() {
        ApiConfig config = ApiConfig.builder().platform("openai").apiKey("test-key").build();
        assertThat(ProviderMediaAuthorization.shouldAuthorize(
                "https://api.openai.com/v1/videos/task/content", config, "https://api.openai.com")).isTrue();
        assertThat(ProviderMediaAuthorization.shouldAuthorize(
                "https://cdn.example/content", config, "https://api.openai.com")).isFalse();
    }

    @Test
    void missingProviderCredentialsOrAddressNeverAuthenticates() {
        assertThat(ProviderMediaAuthorization.shouldAuthorize(
                "https://api.openai.com/content", ApiConfig.builder().build(), "https://api.openai.com")).isFalse();
        assertThat(ProviderMediaAuthorization.shouldAuthorize(
                "https://api.openai.com/content", ApiConfig.builder().apiKey("key").build(), null)).isFalse();
    }
}
