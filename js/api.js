var API = {
    // ── Cache di sessionStorage (B) ──────────────
    _getCache: function(key) {
        try {
            var raw = sessionStorage.getItem('ps21_' + key);
            if (!raw) return null;
            var obj = JSON.parse(raw);
            // Cache valid 5 menit
            if (Date.now() - obj.ts > 300000) { sessionStorage.removeItem('ps21_' + key); return null; }
            return obj.data;
        } catch(e) { return null; }
    },
    _setCache: function(key, data) {
        try { sessionStorage.setItem('ps21_' + key, JSON.stringify({ data: data, ts: Date.now() })); } catch(e) {}
    },
    clearCache: function() {
        try {
            var keys = Object.keys(sessionStorage);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].indexOf('ps21_') === 0) sessionStorage.removeItem(keys[i]);
            }
        } catch(e) {}
    },

    // ── Fetch helper ─────────────────────────────
    fetch: async function(action, params) {
        params = params || {};
        var url = CONFIG.API_URL + '?action=' + encodeURIComponent(action);
        for (var key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '')
                url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }
        try {
            var response = await fetch(url);
            return await response.json();
        } catch (error) {
            return { status: 'error', message: 'Gagal terhubung' };
        }
    },

    post: async function(action, data) {
        try {
            var url = CONFIG.API_URL + '?action=' + encodeURIComponent(action);
            var response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(data)
            });
            var result = await response.json();
            this.clearCache();
            return result;
        } catch (error) {
            return { status: 'error', message: 'Gagal terhubung' };
        }
    },

    // ── Cached endpoints ─────────────────────────
    getFeatured: async function() {
        var cached = this._getCache('featured');
        if (cached) return cached;
        var res = await this.fetch('getFeatured');
        if (res.status === 'success') this._setCache('featured', res);
        return res;
    },
    getPopular: async function() {
        var cached = this._getCache('popular');
        if (cached) return cached;
        var res = await this.fetch('getPopular');
        if (res.status === 'success') this._setCache('popular', res);
        return res;
    },
    getGenres: async function() {
        var cached = this._getCache('genres');
        if (cached) return cached;
        var res = await this.fetch('getGenres');
        if (res.status === 'success') this._setCache('genres', res);
        return res;
    },

    // ── Paginated (A) — tidak di-cache ───────────
    getLatest: function(limit, offset) {
        return this.fetch('getLatest', {
            limit: limit || CONFIG.LATEST_LIMIT || 9,
            offset: offset || 0
        });
    },

    // ── Lainnya ───────────────────────────────────
    getAll:   function() { return this.fetch('getAll'); },
    getById:  function(id) { return this.fetch('getById', { id: id }); },
    search:   function(q) { return this.fetch('search', { q: q }); },
    add:      function(data) { return this.post('add', data); },
    update:   function(data) { return this.post('update', data); },
    delete:   function(id) { return this.post('delete', { id: id }); }
};
