const https = require('https');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Status Code: ${res.statusCode} | Data: ${data}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function httpsPost(url, payload) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`Status Code: ${res.statusCode} | Data: ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(payload);
        req.end();
    });
}

module.exports = async (req, res) => {
    const testUrl = "https://kvdb.io/MwaQM3fZ1UWw1ae78w3NbM/test_key";
    let results = {};
    
    try {
        await httpsPost(testUrl, JSON.stringify({ hello: "world_from_vercel" }));
        results.post = "success";
    } catch(e) {
        results.post_error = e.message;
    }
    
    try {
        const readData = await httpsGet(testUrl);
        results.get = "success";
        results.get_data = readData;
    } catch(e) {
        results.get_error = e.message;
    }
    
    res.status(200).json(results);
};
