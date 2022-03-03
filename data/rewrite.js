const THE_PHRASE = 'Данное сообщение (материал) создано ' +
    'и (или) распространено иностранным ' +
    'средством массовой информации, ' +
    'выполняющим функции иностранного агента, ' +
    'и (или) российским юридическим лицом, ' +
    'выполняющим функции иностранного агента'  // intentionally no dot in the end!

    
const api = chrome;

const NODE_LIMIT = 50000;

// Return regexp for the replacement.
function makeRegexp(rep) {
    const ign = (rep.ic) ? "i" : "",
        start = (rep.mw) ? "\\b" : "",
        end = (rep.mw) ? "\\b" : "";
    return new RegExp(start + rep.from + end, "g" + ign);
}


// Recursively replace all the Text nodes in the DOM subtree rooted at target.
function treeReplace(target, regexp, replacement_phrase, visitSet) {
    const tree = document.createNodeIterator(target, NodeFilter.SHOW_TEXT);
    let cur;
    let nvisited = 0;
    while ((cur = tree.nextNode()) != null && nvisited < NODE_LIMIT) {
        if (visitSet != null) {
            if (visitSet.has(cur)) {
                continue;
            } else {
                visitSet.add(cur);
            }
        }
        // Skip replacing under the active element if it's not the body, since it may interfere with typing.
        if (!document.activeElement.contains(document.body) && document.activeElement.contains(cur)) { //FIXME
            continue;
        }
        text = cur.nodeValue
        if (regexp.test(text)) {

            text = text.replaceAll(regexp, replacement_phrase);
            cur.nodeValue = text;
        }
        nvisited++;
    }
    return {nvisited};
}

function attachChangeObserver(node, regexp, replacement_phrase, dynamic_timeout_value) {
    // Attach the mutation observer after we've finished our initial replacements.
    const observeParams = { characterData: true, childList: true, subtree: true };
    let mutationTargets = [];
    let flushReplacementsInCooldown = false;
    let scheduleFlush = false;

    // The observer just records all the nodes that are changing.
    const observer = new MutationObserver(function (mutations) {
        for (let i = 0; i < mutations.length; i++) {
            if (mutationTargets.length < NODE_LIMIT) {
                mutationTargets.push(mutations[i]);
            }
        }
        if (mutationTargets.length > 0) {
            // If we just did a replacement, then schedule the next one
            if (flushReplacementsInCooldown) {
                scheduleFlush = true;
            } else {
                flushReplacements();
            }
        }
    });
    observer.observe(node, observeParams);

    function flushReplacements() {
        // Make sure the changes the observer makes don't re-trigger itself.
        observer.disconnect();
        scheduleFlush = false;
        flushReplacementsInCooldown = true;
        // Keep a map of visited nodes so we don't rewrite same one multiple times.
        const visitSet = new WeakSet();
        for (const target of mutationTargets) {
            treeReplace(target.target, regexp, replacement_phrase, visitSet);
        }
  
        mutationTargets = [];

        // Reattach observer once we're done.
        requestIdleCallback(() => {
            observer.observe(node, observeParams);
        });

        setTimeout(function () {
            flushReplacementsInCooldown = false;
            // If a replacement was scheduled during the interval, now we can run it
            if (scheduleFlush) {
                flushReplacements();
            }
        }, dynamic_timeout_value);
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Tell the background script a content page has loaded.
api.runtime.sendMessage({ event: "pageLoad" });

api.runtime.onMessage.addListener(function (message) {
    const { event } = message;
    if (event === "inoagentRewriter") {
        console.time(event);
        const { replacement_phrase, dynamic_timeout_value } = message;

        phrase = escapeRegExp(THE_PHRASE);
        phrase = phrase.replaceAll(' ', '\\s+');
        phrase += '\\.?';  // optional dot in the end
        regexp = new RegExp(phrase, "gi")

        const { visited } = treeReplace(document.body, regexp, replacement_phrase);
        console.timeEnd(event);
        console.info(visited, "nodes visited");

        requestIdleCallback(() => {
            attachChangeObserver(document.body, regexp, replacement_phrase, dynamic_timeout_value);
        });
    }
});
