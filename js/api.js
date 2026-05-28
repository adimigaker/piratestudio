var API = {
    _cache: {},

    fetch: async function(action, params) {
        params = params || {};
        var cacheKey = action + '_' + JSON.stringify(params);
        var cached = this._cache[cacheKey];
        if (cached && Date.now() - cached.timestamp < 300000) {
            console.log('📦 Cache:', action);
            return cached.data;
        }
        var url = CONFIG.API_URL + '?action=' + encodeURIComponent(action);
        for (var key in params) {
            if (params[key]) url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }
        try {
            console.log('🌐 GET:', action);
            var response = await fetch(url);
            var data = await response.json();
            this._cache[cacheKey] = { data: data, timestamp: Date.now() };
            return data;
        } catch (error) {
            console.error('❌ GET Error:', error);
            return { status: 'error', message: 'Gagal terhubung' };
        }
    },

    post: async function(action, data) {
        try {
            console.log('📤 POST:', action, data);
            var formData = new FormData();
            formData.append('action', action);
            formData.append('data', JSON.stringify(data));
            var response = await fetch(CONFIG.API_URL, { method: 'POST', body: formData });
            var result = await response.json();
            this.clearCache();
            return result;
        } catch (error) {
            console.error('❌ POST Error:', error);
            return { status: 'error', message: 'Gagal terhubung' };
        }
    },

    getAll: function() { return this.fetch('getAll'); },
    getFeatured: function() { return this.fetch('getFeatured'); },
    getPopular: function() { return this.fetch('getPopular'); },
    getLatest: function() { return this.fetch('getLatest'); },
    getGenres: function() { return this.fetch('getGenres'); },
    getById: function(id) { return this.fetch('getById', { id: id }); },
    search: function(q) { return this.fetch('search', { q: q }); },
    add: function(data) { return this.post('add', data); },
    update: function(data) { return this.post('update', data); },
    delete: function(id) { return this.post('delete', { id: id }); },

    clearCache: function() {
        this._cache = {};
        console.log('🗑️ Cache cleared');
    }
};