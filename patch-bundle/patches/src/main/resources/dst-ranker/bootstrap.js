(function () {
  window.__DST_COMMENT_RANKER_ANDROID__ = true;

  if (!window.chrome) window.chrome = {};
  if (!window.chrome.storage) window.chrome.storage = {};
  if (!window.chrome.storage.sync) {
    window.chrome.storage.sync = {
      get: function (keys, callback) {
        var result = {};
        var read = function (key) {
          var raw = window.localStorage.getItem("dstRanker:" + key);
          if (raw !== null) {
            try {
              result[key] = JSON.parse(raw);
            } catch (_) {
              result[key] = raw;
            }
          }
        };

        if (Array.isArray(keys)) {
          keys.forEach(read);
        } else if (typeof keys === "string") {
          read(keys);
        } else if (keys && typeof keys === "object") {
          Object.keys(keys).forEach(function (key) {
            read(key);
            if (result[key] === undefined) result[key] = keys[key];
          });
        }

        if (typeof callback === "function") callback(result);
      },
      set: function (items, callback) {
        Object.keys(items || {}).forEach(function (key) {
          window.localStorage.setItem("dstRanker:" + key, JSON.stringify(items[key]));
        });
        if (typeof callback === "function") callback();
      }
    };
  }

  if (!window.chrome.runtime) {
    window.chrome.runtime = { onMessage: { addListener: function () {} } };
  }
})();
