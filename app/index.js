const monk = require('monk');
const deepMapKeys = require('deep-map-keys');
const fetch = require('node-fetch');

var db = monk('mongodb://appUser:appUserPassword@localhost:27017/lighthouse');

//Funcao que remove as chaves com dot
function unescape(str) {
    return str.replace(".", '-')
}

(async() => {
    try {
        const fetchResult = await fetch('http://localhost:4000/lighthouse', {
            method: 'POST',
            body: JSON.stringify({ payload: ['https://www.megacurioso.com.br'] }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (fetchResult.status !== 200) throw new Error('Falha ao receber dados do endpoint');

        const { result } = await fetchResult.json();

        console.log('Deu boa');
        console.log(result);

        const result = fetchResult.map(item => deepMapKeys(item, unescape));

        //Submit to the DB
        for (let i = 0; i < response.length; i++) {

            console.log(response[i]);

            await collection.insert({
                "url": response[i].result.finalUrl,
                "audits": response[i].result.audits,
                "score": response[i].score,
                "fetchTime": new Date()
            });
        }

        console.log('data saved in db');
    } catch (err) {
        console.log(err);
    }
})();