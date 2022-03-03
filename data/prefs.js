(function() {

const api = chrome;
const storage = api.storage.local;

const the_phrase_p = document.getElementById("the_phrase");
const replacement_phrase_text = document.getElementById("replacement_phrase");

const wl_table = document.getElementById("whitelist_table"),
    wl_save_btn = document.getElementById("whitelist_save_button"),
    wl_clear_btn = document.getElementById("whitelist_clear_button"),
    wl_add_btn = document.getElementById("whitelist_add_button");

// #TODO: use <template>

// Make a span element with the given text and class.
function makeSpan(cl, text) {
    const sp = document.createElement('span');
    sp.appendChild(document.createTextNode(text));
    sp.classList.add(cl);
    return sp;
}

// Make a span element with the given value
function makeTD(type, value) {
    const td = document.createElement('td'),
        inp = document.createElement('input');
    inp.type = type;
    if (value)
        inp.value = value;
    td.insertBefore(inp, td.firstChild)
    return td;
}

// Append a row to the table
function appendWhitelist(text) {
    const tr = document.createElement("tr"),
        rule = makeTD("text", text),
        delrow = makeSpan('delrow', 'x');
    delrow.style.float = 'right';
    rule.appendChild(delrow);
    tr.appendChild(rule);
    wl_table.appendChild(tr);
    attachDelRowListener(tr.querySelector(".delrow"));
}

// Append an empty row to the table.
function appendEmptyRow() {
    appendWhitelist("");
}

// Call func(elem) on each element of arr.
function forEach(arr, func) {
    for (let i = 0; i < arr.length; i++)
        func(arr[i]);
}

// Delete row.
function attachDelRowListener(itm) {
    (function(e) {
        e.addEventListener('click', function() {
            wl_table.deleteRow(e.parentNode.parentNode.rowIndex);
        });
    })(itm);
}

function appendFromData(whitelist) {
    forEach(whitelist, appendWhitelist);
    // at least one row in the table
    if(wl_table.children.length <= 1) { // 1 - header only
        appendEmptyRow();
    }
}

let saveTimeout;

document.addEventListener('DOMContentLoaded', function () {
    storage.get({
        whitelist: DEFAULT_WHITELIST,
        replacement_phrase: DEFAULT_REPLACEMENT_PHRASE
    }, function (data) {
        the_phrase_p.innerText = THE_PHRASE;
        replacement_phrase_text.value = data.replacement_phrase;
        appendFromData(data.whitelist);
    });

    replacement_phrase_text.addEventListener('change', function(event) {
        val = event.target.value;
        if (!!val) { // not empty 
            storage.set({replacement_phrase: val});
        } 
        else {
            storage.remove('replacement_phrase');
        }
    });

    wl_save_btn.addEventListener('click', function () {
        // Collect all row data and save to local storage.
        const data = [],
            children = wl_table.children;
        for (let i = 1; i < children.length; i++) {
            const value = children[i].querySelectorAll("input")[0].value;
            if (value.length === 0)
                continue;
            data.push(value);
        }
        if (saveTimeout) {
            window.clearTimeout(saveTimeout);
        }
        storage.set({
            whitelist: data,
        }, function () {
            document.querySelector("#whitelist_saved_msg").style.display = 'inline';
            saveTimeout = window.setTimeout(function () {
                document.querySelector("#whitelist_saved_msg").style.display = 'none';
            }, 800);
        });
    });

    wl_clear_btn.addEventListener('click', function () {
        // the first row is the header, so delete up to that point
        for (let row = wl_table.rows.length - 1; row > 0; row--) {
            wl_table.deleteRow(row);
        }
        appendFromData(DEFAULT_WHITELIST || []);
        // don't save immediately in case it's an accident
    });

    wl_add_btn.addEventListener('click', appendEmptyRow);
});

})();