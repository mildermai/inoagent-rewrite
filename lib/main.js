// TODO: convert to worker
// TODO: move constants to separate file


const THE_PHRASE = 'Данное сообщение (материал) создано ' +
'и (или) распространено иностранным ' +
'средством массовой информации, ' +
'выполняющим функции иностранного агента, ' +
'и (или) российским юридическим лицом, ' +
'выполняющим функции иностранного агента'  // intentionally no dot in the end!

const DEFAULT_REPLACEMENT_PHRASE = '《 ✅ источник заслуживает доверия 》'

const DEFAULT_WHITELIST = [
'*.google.com',
'*.office.com',
'*.myoffice.ru',
'*.wikipedia.org',
'*.yandex.ru'
]

const api = chrome;

const storage = api.storage.local;

// Prevent infinite loop with other page mutation extensions:
// The minimum time since the last observer event that the next one is allowed to run.
// The way it works is that instead of mutating directly in the observer, we add
// changed nodes to a list and then go through that every Interval time.
const DEFAULT_DYNAMIC_REPLACE_INTERVAL_MS = 1900;

// Send replacement prefs to the given tab id.
function updateTab(id) {
    storage.get({
        replacement_phrase: DEFAULT_REPLACEMENT_PHRASE,
        dynamic_timeout_value: DEFAULT_DYNAMIC_REPLACE_INTERVAL_MS,
    }, function (data) {
        data.event = "inoagentRewriter";
        data.tabId = id;
        api.tabs.sendMessage(id, data);
    });
}

function matchWildcard(str, rule) {
    // Replace wildcards * with regex .* and test.
    // https://stackoverflow.com/questions/26246601/wildcard-string-comparison-in-javascript
    var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    return new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);
}

function isWhitelisted(whitelist, url) {
    host = (new URL(url)).host
    for (const rule of whitelist) {
        if (matchWildcard(host, rule)) {
            return true;
        }
    }
}

// Listen to messages from content scripts.
api.runtime.onMessage.addListener(function (message, sender) {
    const { event } = message;
    if (event === "pageLoad") {
        storage.get({ whitelist: DEFAULT_WHITELIST }, function (data) {
            const { url } = sender.tab;
            if (!isWhitelisted(data.whitelist, url)) {
                updateTab(sender.tab.id);
            }
            else {
                console.info(url, 'whitelisted')
            }
        });
    }
});
