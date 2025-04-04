const axios = require("axios");
const { stop } = require("../index");
const {
    ACCESS_TOKEN_NAME,
    REFRESH_TOKEN_NAME,
    AUTH_HOST,
    LONG_LIVED_TOKENS,
    LONG_LIVED_TOKENS_NUMBER,
} = require("../src/app/utils/constants");
const { generateAccessToken, generateRefreshToken } = require("../src/app/utils/jwt");

describe("Authentication Proxy Tests", () => {
    describe("Application Routes", () => {
        it("should return OK for the health check route", async () => {
            const response = await axios.get("http://localhost:3000/healthz");

            expect(response.status).toBe(200);
            expect(response.data).toBe("OK");
        });

        it("should allow authenticated users on GET routes", async () => {
            const accessToken = generateAccessToken({ user: "test" });
            const refreshToken = generateRefreshToken({ user: "test" });

            const response = await axios.get("http://localhost:3000/", {
                headers: {
                    Cookie: `${ACCESS_TOKEN_NAME}=${accessToken}; ${REFRESH_TOKEN_NAME}=${refreshToken}`,
                },
                maxRedirects: 0,
                validateStatus: function () {
                    return true;
                },
            });

            expect(response.status).toBe(200);
        });

        it("should allow authenticated users on POST routes", async () => {
            const accessToken = generateAccessToken({ user: "test" });
            const refreshToken = generateRefreshToken({ user: "test" });

            const response = await axios.post(
                "http://localhost:3000/",
                {},
                {
                    headers: {
                        Cookie: `${ACCESS_TOKEN_NAME}=${accessToken}; ${REFRESH_TOKEN_NAME}=${refreshToken}`,
                    },
                    maxRedirects: 0,
                    validateStatus: function () {
                        return true;
                    },
                }
            );

            expect(response.status).toBe(200);
        });

        it("should allow authenticated users on PUT routes", async () => {
            const accessToken = generateAccessToken({ user: "test" });
            const refreshToken = generateRefreshToken({ user: "test" });

            const response = await axios.put(
                "http://localhost:3000/",
                {},
                {
                    headers: {
                        Cookie: `${ACCESS_TOKEN_NAME}=${accessToken}; ${REFRESH_TOKEN_NAME}=${refreshToken}`,
                    },
                    maxRedirects: 0,
                    validateStatus: function () {
                        return true;
                    },
                }
            );

            expect(response.status).toBe(200);
        });

        it("should allow authenticated users on DELETE routes", async () => {
            const accessToken = generateAccessToken({ user: "test" });
            const refreshToken = generateRefreshToken({ user: "test" });

            const response = await axios.delete("http://localhost:3000/", {
                headers: {
                    Cookie: `${ACCESS_TOKEN_NAME}=${accessToken}; ${REFRESH_TOKEN_NAME}=${refreshToken}`,
                },
                maxRedirects: 0,
                validateStatus: function () {
                    return true;
                },
            });

            expect(response.status).toBe(200);
        });

        it("should redirect expired access tokens to refresh", async () => {
            const refreshToken = generateRefreshToken({ user: "test" });

            const response = await axios.get("http://localhost:3000/", {
                headers: {
                    Cookie: `${REFRESH_TOKEN_NAME}=${refreshToken}`,
                },
                maxRedirects: 0,
                validateStatus: function () {
                    return true;
                },
            });

            expect(response.status).toBe(302);
            expect(response.data).toContain(`${AUTH_HOST}/refresh`);
        });

        it("should redirect unauthenticated users to login", async () => {
            const response = await axios.get("http://localhost:3000/", {
                maxRedirects: 0,
                validateStatus: function () {
                    return true;
                },
            });
            expect(response.status).toBe(302);
        });

        it("should return a 401 for all request that cannot be authenticated or properly redirected", async () => {
            const response = await axios.get("http://localhost:3000/bad-route", {
                maxRedirects: 0,
                validateStatus: function () {
                    return true;
                },
            });
            expect(response.status).toBe(401);

            const response2 = await axios.post(
                "http://localhost:3000/bad-route",
                {},
                {
                    maxRedirects: 0,
                    validateStatus: function () {
                        return true;
                    },
                }
            );
            expect(response2.status).toBe(401);

            const response3 = await axios.put(
                "http://localhost:3000/bad-route",
                {},
                {
                    maxRedirects: 0,
                    validateStatus: function () {
                        return true;
                    },
                }
            );
            expect(response3.status).toBe(401);

            const response4 = await axios.delete("http://localhost:3000/bad-route", {
                maxRedirects: 0,
                validateStatus: function () {
                    return true;
                },
            });
            expect(response4.status).toBe(401);
        });

        it("should generate the appropriate amount of long lived tokens", async () => {
            expect(Object.keys(LONG_LIVED_TOKENS).length).toBe(
                LONG_LIVED_TOKENS_NUMBER
            );
        });

        it("should allow request with a long lived token parameter in the request query", async () => {
            const tokens = Object.values(LONG_LIVED_TOKENS);
            for (const token of tokens) {
                const response = await axios.get(
                    "http://localhost:3000/bad-route?tkn=" + token,
                    {
                        maxRedirects: 0,
                        validateStatus: function () {
                            return true;
                        },
                    }
                );

                expect(response.status).toBe(200);

            }
        });

        it("should allow request with a long lived token in the request body", async () => {
            const tokens = Object.values(LONG_LIVED_TOKENS);
            for (const token of tokens) {
                const response = await axios.post(
                    "http://localhost:3000/bad-route",
                    { token: token },
                    {
                        maxRedirects: 0,
                        validateStatus: function () {
                            return true;
                        },
                    }
                );
                expect(response.status).toBe(200);
            }
        });

        it("should allow request with a long lived token in the request header", async () => {
            const tokens = Object.values(LONG_LIVED_TOKENS);
            for (const token of tokens) {
                const response = await axios.get("http://localhost:3000/bad-route", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    maxRedirects: 0,
                    validateStatus: function () {
                        return true;
                    },
                });
                expect(response.status).toBe(200);
            }
        });
    });
});

afterAll(() => {
    stop();
});
