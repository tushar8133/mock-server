const PORT = 3000;

const HAR_FILE = "8888";

const ALLOW_MERGE = true;

const VERBOSE = true;

const DEFAULT_PATH = "./";

const RESPONSE_DELAY = 0;

const ALLOWED_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE'
]

const FILTER_MIMES = [
    // 'application/json'
]

module.exports = {
    PORT,
    HAR_FILE,
    ALLOW_MERGE,
    VERBOSE,
    DEFAULT_PATH,
    RESPONSE_DELAY,
    ALLOWED_METHODS,
    FILTER_MIMES
}