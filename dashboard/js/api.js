var API_URL = 'https://script.google.com/macros/s/AKfycbxNamdlH6zSVDK_-eC6KWYjb6E2Ob3ivI2kcZRD9XkwxKleb0bTZbKT8xXhQPVsgv0P/exec';

var DASHBOARD_API = {
    fetchGET: async function(action, params) {
        params = params || {};
        var url = API_URL + '?action=' + encodeURIComponent(action);
        for (var key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
            }
        }
        console.log('🌐 GET:', url);
        try {
            var response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('❌ GET Error:', error);
            return { status: 'error', message: 'Gagal terhubung ke server' };
        }
    },

    // FIX: Dulu pakai FormData — AppScript ga bisa baca itu di postData.contents.
    // Sekarang: action lewat URL param, data dikirim sebagai raw JSON string di body.
    fetchPOST: async function(action, data) {
        var url = API_URL + '?action=' + encodeURIComponent(action);
        console.log('📤 POST:', url, data);
        try {
            var response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, // text/plain biar ga trigger CORS preflight
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('❌ POST Error:', error);
            return { status: 'error', message: 'Gagal terhubung ke server' };
        }
    },

    getAll:      function()     { return this.fetchGET('getAll'); },
    getById:     function(id)   { return this.fetchGET('getById', { id: id }); },
    search:      function(q)    { return this.fetchGET('search', { q: q }); },
    add:         function(data) { return this.fetchPOST('add', data); },
    update:      function(data) { return this.fetchPOST('update', data); },
    delete:      function(id)   { return this.fetchPOST('delete', { id: id }); },
    setFeatured: function(id)   { return this.fetchPOST('setFeatured', { id: id }); },
    setPopular:  function(id)   { return this.fetchPOST('setPopular', { id: id }); },

    uploadImage: function(file) {
        return new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = async function() {
                try {
                    var base64 = reader.result.split(',')[1];
                    var ext = (file.name || 'img').split('.').pop() || 'jpg';
                    var fileName = 'ps21_' + Date.now() + '.' + ext;
                    // Ikuti pola Kisah Tabu: action di dalam body, bukan URL param
                    var response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify({
                            action: 'uploadImage',
                            image: base64,
                            fileName: fileName,
                            mimeType: file.type || 'image/jpeg'
                        })
                    });
                    resolve(await response.json());
                } catch (err) {
                    resolve({ status: 'error', message: err.message });
                }
            };
            reader.readAsDataURL(file);
        });
    }
};
