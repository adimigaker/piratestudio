var API = {
    // ── Helper: Buat Supabase client ─────────────────
    _getClient: function() {
        if (typeof supabase === 'undefined') {
            console.error('Supabase library not loaded!');
            return null;
        }
        return supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    },

    // ── Helper: Konversi data ke format lama ──
    _formatFilm: function(item) {
        return {
            id: item.id,
            title: item.title,
            slug: item.slug,
            type: item.type,
            featured: item.featured,
            popular: item.popular,
            year: item.year,
            genre: item.genre,
            rating: item.rating,
            duration: item.duration,
            director: item.director,
            cast: item.cast,
            poster: item.poster,
            backdrop: item.backdrop,
            synopsis: item.synopsis,
            embed_url: item.embed_url,
            download_url: item.download_url,
            mirror_url: item.mirror_url,
            subtitle_url: item.subtitle_url,
            trailer: item.trailer
        };
    },

    // ── Cache di sessionStorage ──────────────────────
    _getCache: function(key) {
        try {
            var raw = sessionStorage.getItem('ps21_' + key);
            if (!raw) return null;
            var obj = JSON.parse(raw);
            if (Date.now() - obj.ts > 300000) {
                sessionStorage.removeItem('ps21_' + key);
                return null;
            }
            return obj.data;
        } catch(e) { return null; }
    },
    
    _setCache: function(key, data) {
        try {
            sessionStorage.setItem('ps21_' + key, JSON.stringify({ data: data, ts: Date.now() }));
        } catch(e) {}
    },
    
    clearCache: function() {
        try {
            var keys = Object.keys(sessionStorage);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].indexOf('ps21_') === 0) sessionStorage.removeItem(keys[i]);
            }
        } catch(e) {}
    },

    // ── Get Featured (featured = true) ──
    getFeatured: async function() {
        var cached = this._getCache('featured');
        if (cached) return cached;
        
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var { data, error } = await client
            .from('PirateStudio21_DB')
            .select('*')
            .eq('featured', true)
            .limit(6);
        
        if (error) return { status: 'error', message: error.message };
        var films = data.map(this._formatFilm);
        var result = { status: 'success', data: films };
        this._setCache('featured', result);
        return result;
    },

    // ── Get Popular (popular = true) ──
    getPopular: async function() {
        var cached = this._getCache('popular');
        if (cached) return cached;
        
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var { data, error } = await client
            .from('PirateStudio21_DB')
            .select('*')
            .eq('popular', true)
            .limit(CONFIG.POPULAR_LIMIT || 6);
        
        if (error) return { status: 'error', message: error.message };
        var films = data.map(this._formatFilm);
        var result = { status: 'success', data: films };
        this._setCache('popular', result);
        return result;
    },

    // ── Get Genres (ambil semua genre unik) ──
    getGenres: async function() {
        var cached = this._getCache('genres');
        if (cached) return cached;
        
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var { data, error } = await client
            .from('PirateStudio21_DB')
            .select('genre');
        
        if (error) return { status: 'error', message: error.message };
        
        var genreSet = {};
        for (var i = 0; i < data.length; i++) {
            var genreStr = data[i].genre || '';
            var genres = genreStr.split(',').map(function(g) { return g.trim(); });
            for (var j = 0; j < genres.length; j++) {
                if (genres[j]) genreSet[genres[j]] = true;
            }
        }
        var genreList = Object.keys(genreSet).sort();
        var result = { status: 'success', data: genreList };
        this._setCache('genres', result);
        return result;
    },

    // ── Get Latest dengan pagination ──
    getLatest: async function(limit, offset) {
        var limitVal = limit || CONFIG.LATEST_LIMIT || 9;
        var offsetVal = offset || 0;
        
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var { data, error } = await client
            .from('PirateStudio21_DB')
            .select('*')
            .order('year', { ascending: false })
            .range(offsetVal, offsetVal + limitVal - 1);
        
        if (error) return { status: 'error', message: error.message };
        var films = data.map(this._formatFilm);
        return { status: 'success', data: films };
    },

    // ── Get All (untuk genre page) ──
    getAll: async function() {
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var { data, error } = await client
            .from('PirateStudio21_DB')
            .select('*')
            .order('year', { ascending: false });
        
        if (error) return { status: 'error', message: error.message };
        var films = data.map(this._formatFilm);
        return { status: 'success', data: films };
    },

    // ── Get by ID ──
    getById: async function(id) {
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var { data, error } = await client
            .from('PirateStudio21_DB')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) return { status: 'error', message: error.message };
        var film = this._formatFilm(data);
        return { status: 'success', data: film };
    },

    // ── Search ──
    search: async function(q) {
        if (!q || q.trim() === '') return { status: 'success', data: [] };
        
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var searchTerm = '%' + q.toLowerCase() + '%';
        
        var { data, error } = await client
            .from('PirateStudio21_DB')
            .select('*')
            .or(`title.ilike.${searchTerm},synopsis.ilike.${searchTerm},genre.ilike.${searchTerm}`);
        
        if (error) return { status: 'error', message: error.message };
        var films = data.map(this._formatFilm);
        return { status: 'success', data: films };
    },

    // ── CRUD untuk Dashboard ──
    add: async function(data) {
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var { error } = await client
            .from('PirateStudio21_DB')
            .insert([data]);
        
        if (error) return { status: 'error', message: error.message };
        this.clearCache();
        return { status: 'success', message: 'Film berhasil ditambahkan' };
    },

    update: async function(data) {
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var { error } = await client
            .from('PirateStudio21_DB')
            .update(data)
            .eq('id', data.id);
        
        if (error) return { status: 'error', message: error.message };
        this.clearCache();
        return { status: 'success', message: 'Film berhasil diupdate' };
    },

    delete: async function(id) {
        var client = this._getClient();
        if (!client) return { status: 'error', message: 'Supabase client error' };
        
        var { error } = await client
            .from('PirateStudio21_DB')
            .delete()
            .eq('id', id);
        
        if (error) return { status: 'error', message: error.message };
        this.clearCache();
        return { status: 'success', message: 'Film berhasil dihapus' };
    }
};