module.exports = {
    PORT: 3000,
    HAR_FILE: "8888",
    ALLOW_MERGE: true,
    VERBOSE: true,
    DEFAULT_PATH: "./",
    RESPONSE_DELAY: 0,
    ALLOWED_METHODS: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE'
    ],
    ALLOWED_PROTOCOL: [
        'HTTP',
        'HTTPS'
    ],
    FILTER_MIMES: [
        // 'application/json',
        // 'application/javascript',
        // 'application/x-javascript',
        // 'image/svg+xml',
        // 'text/css',
        // 'text/html',
        // 'text/javascript',
        // 'text/plain'
    ]
};
