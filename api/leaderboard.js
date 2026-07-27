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
                } else if (res.statusCode === 404) {
                    resolve(null);
                } else {
                    reject(new Error(`Status Code: ${res.statusCode}`));
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
                    reject(new Error(`Status Code: ${res.statusCode}`));
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

async function getBody(req) {
    if (req.body) {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        return body;
    }
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve(body);
            }
        });
    });
}

module.exports = async (req, res) => {
    const bucketUrl = "https://kvdb.io/MwaQM3fZ1UWw1ae78w3NbM/leaderboard";
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            const data = await httpsGet(bucketUrl);
            return res.status(200).json(data || []);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const list = await getBody(req);
            await httpsPost(bucketUrl, JSON.stringify(list || []));
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    res.status(405).json({ error: "Method not allowed" });
};
