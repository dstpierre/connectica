google.load("feeds", "1");

var addNewFeed = null;

// helpers from Todd Motto: http://toddmotto.com/creating-jquery-style-functions-in-javascript-hasclass-addclass-removeclass-toggleclass/
var hasClass = function (elem, className) {
    return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
}

var addClass = function (elem, className) {
    if (!hasClass(elem, className)) {
        elem.className += ' ' + className;
    }
}

var removeClass = function (elem, className) {
    var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
    if (hasClass(elem, className)) {
        while (newClass.indexOf(' ' + className + ' ') >= 0) {
            newClass = newClass.replace(' ' + className + ' ', ' ');
        }
        elem.className = newClass.replace(/^\s+|\s+$/g, '');
    }
}

// my own helper functions
function isModern() {
    if ('querySelector' in document && 'addEventListener' in window && Array.prototype.forEach)
        return true;
    else
        return false;
}

var setVisibility = function (elm, visible) {
    elm.style.display = visible ? 'block' : 'none';
}

var changeInputColor = function (color) {
    var allInputs = document.querySelectorAll('input[type="text"]');
    [].forEach.call(allInputs, function (i) {
        i.style.backgroundcolor = color;
    });
}

var resetInputText = function () {
    var allInputs = document.querySelectorAll('input[type="text"]');
    [].forEach.call(allInputs, function (i) {
        i.value = '';
    });
}

window.onload = function () {
    if (!isModern()) {
        return alert('Your browser cannot run this app.');
    }
    addNewFeed = document.querySelector('#add-new-feed');

    setVisibility(addNewFeed, false);

    var newFeed = document.querySelector('#new-feed');
    newFeed.addEventListener('click', function (e) {
        e.preventDefault();

        showAddFeedForm();
    });

    var addFeed = document.querySelector('#add-feed');
    addFeed.addEventListener('click', function (e) {
        e.preventDefault();

        changeInputColor('white');

        var name = document.querySelector('input[name="feed-name"]').value;
        var url = document.querySelector('input[name=feed-url').value;

        if ((name == undefined || name == '') ||
            (url == undefined || url == '')) {

            changeInputColor('yellow');
            return;
        }

        var feeds = JSON.parse(localStorage.getItem('feeds'));
        if (feeds == undefined || feeds == null) {
            feeds = [];
        }

        feeds.push({ name: name, url: url });

        localStorage.setItem('feeds', JSON.stringify(feeds));

        setVisibility(addNewFeed, false);
        resetInputText();

        loadFeeds();
    });

    var hideFeed = document.querySelector('#hide-feed-form');
    hideFeed.addEventListener('click', function (e) {
        e.preventDefault();

        setVisibility(addNewFeed, false);
    });

    loadFeeds();
};

function showAddFeedForm() {
    setVisibility(addNewFeed, true);
    document.querySelector('input[name=feed-name').focus();
}

function loadFeeds() {
    var list = document.querySelector('#feed-list');

    list.innerText = '';

    var feeds = JSON.parse(localStorage.getItem('feeds'));
    if (feeds == undefined || feeds == null || feeds.length == 0) {
        showAddFeedForm();
    } else {
        var toRemove = document.querySelectorAll('.switch-feed');
        if (toRemove != undefined && toRemove != null && toRemove.length > 0) {
            [].forEach.call(toRemove, function (l) {
                l.removeEventListener('click');
            });
        }

        toRemove = document.querySelectorAll('.delete-feed');
        if (toRemove != undefined && toRemove != null && toRemove.length > 0) {
            [].forEach.call(toRemove, function (l) {
                l.removeEventListener('click');
            });
        }

        var buffer = '<ul>';
        feeds.forEach(function (f) {
            buffer +=
                '<li class="feed" data-url="' + f.url + '">' +
                '  <a href="#" class="delete-feed" title="Delete this feed">[x]</a>' +
                '  <a href="#" class="switch-feed"><span class="unread-posts"></span> ' + f.name + '</a>' +
                '</li>';
        });

        buffer += '</ul>';
        list.innerHTML = buffer;

        var items = document.querySelectorAll('.switch-feed');
        if (items != undefined && items != null && items.length > 0) {
            [].forEach.call(items, function (l) {
                loadFeed(l.parentNode, false);

                l.addEventListener('click', function (e) {
                    e.preventDefault();

                    loadFeed(this.parentNode, true);
                });
            });

            setTimeout(function () { calculateUnRead(); }, 4321);
        }

        items = document.querySelectorAll('.delete-feed');
        if (items != undefined && items != null && items.length > 0) {
            [].forEach.call(items, function (l) {
                l.addEventListener('click', function (e) {
                    e.preventDefault();

                    var parent = this.parentNode;

                    var url = parent.getAttribute('data-url');

                    parent.parentNode.removeChild(parent);

                    var feeds = JSON.parse(localStorage.getItem('feeds'));
                    if (feeds != undefined && feeds != null) {
                        var newFeeds = [];
                        feeds.forEach(function (f) {
                            if (f.url != url)
                                newFeeds.push(f);
                        });

                        localStorage.setItem('feeds', JSON.stringify(newFeeds));
                    }

                });
            });
        }
    }
}

function calculateUnRead() {
    var feeds = document.querySelectorAll('.switch-feed');
    if (feeds != undefined && feeds != null && feeds.length > 0) {
        [].forEach.call(feeds, function (f) {
            var li = f.parentNode;
            var posts = sessionStorage.getItem(li.getAttribute('data-url'));
            if (posts != undefined && posts != null) {
                var data = JSON.parse(posts);
                var count = 0;
                data.entries.forEach(function (p) {
                    if (!hasRead(p.link))
                        count++;
                });
                if (count > 0) {
                    var span = f.querySelector('.unread-posts');
                    if (span)
                        span.innerHTML = '(' + count + ')';
                }
            }
        });
    }
}
function loadFeed(li, displayPosts) {
    var active = document.querySelector('.active');
    if (active != undefined && active != null) {
        removeClass(active, 'active');
    }

    addClass(li, 'active');
    var url = li.getAttribute('data-url');
    var feed = sessionStorage.getItem(url);
    if (feed == undefined || feed == null) {
        parseRSS(url, function (data) {
            sessionStorage.setItem(url, JSON.stringify(data.feed));
            if(displayPosts)
                showPosts(data.feed);
        });
    } else {
        console.log('cached');
        var data = JSON.parse(feed);
        if(displayPosts)
            showPosts(data);
    }
}

function showPosts(feed) {
    var blogs = document.querySelector('#blogs');

    var posts = document.querySelectorAll('.show-post');
    if (posts != undefined && posts != null && posts.length > 0) {
        [].forEach.call(posts, function (p) {
            p.removeEventListener('click');
        });
    }

    blogs.innerText = '';

    var buffer = '';

    [].forEach.call(feed.entries, function (f) {
        var d = new Date(f.publishedDate);
        buffer +=
            '<div class="blog">' +
            '  <div class="show-post ' + (hasRead(f.link) ? 'old-post' : 'new-post') + '" data-url="' + f.link + '">' +
                d.toDateString() + ' - ' + f.title +
            '</div>' +
            '<p class="snippet">' + f.contentSnippet + '</p>' +
            '<div class="content" style="display: none;">' + f.content + '</div>' +
            '</div>';
    });

    blogs.innerHTML = buffer;

    posts = document.querySelectorAll('.show-post');
    if (posts != undefined && posts != null && posts.length > 0) {
        [].forEach.call(posts, function (p) {
            p.addEventListener('click', function (e) {
                e.preventDefault();

                var contents = document.querySelectorAll('.content');
                [].forEach.call(contents, function (c) {
                    setVisibility(c, false);
                });

                var parent = this.parentNode;
                var snippet = parent.querySelector('.snippet');
                var content = parent.querySelector('.content');

                if (hasClass(parent, 'active')) {
                    setVisibility(snippet, true);
                    setVisibility(content, false);
                    removeClass(parent, 'active');
                } else {
                    setVisibility(snippet, false);
                    setVisibility(content, true);
                    addClass(parent, 'active');

                    var url = this.getAttribute('data-url');

                    if (hasClass(this, 'new-post')) {
                        flagAsRead(url);
                        removeClass(this, 'new-post');
                        addClass(this, 'old-post');
                    }
                }
            });
        });
    }
}

function flagAsRead(url) {
    var read = JSON.parse(localStorage.getItem('read'));
    if (read == undefined || read == null) {
        read = [];
    }

    read.push(url);

    localStorage.setItem('read', JSON.stringify(read));

    calculateUnRead();
}

function hasRead(url) {
    var read = JSON.parse(localStorage.getItem('read'));
    if (read == undefined || read == null) {
        return false;
    }
    var found = false;
    for (var i = 0; i < read.length; i++) {
        if (read[i] === url) {
            found = true;
            break;
        }
    }

    return found;
}

function parseRSS(url, callback) {
    var feed = new google.feeds.Feed(url);
    feed.load(callback);
}

function debugObject(obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
        console.log(keys[i]);
    }
}