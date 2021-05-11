const express = require('express');
const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const deepMapKeys = require('deep-map-keys');

const app = express();
const router = express.Router();
const port = process.env.port || 4000;

// New Code
var monk = require('monk');
// var db = monk('localhost:27017/lighthouse_db');
var db = monk('mongodb://appUser:appUserPassword@localhost:27017/lighthouse');

// Make our db accessible to our router
app.use(function(req, res, next) {
    req.db = db;
    next();
});

// Lighthouse
async function lh(url, output) {
    try {
        const outputOption = output || 'json';
        const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
        const options = {
            logLevel: 'info',
            output: outputOption,
            onlyCategories: ['performance'],
            port: chrome.port
        };

        const runnerResult = await lighthouse(url, options);

        await chrome.kill();

        console.log('dentro da função lighthouse: ' + outputOption);

        return {
            result: runnerResult.lhr,
            score: runnerResult.lhr.categories.performance.score * 100,
            report: outputOption === 'json' ? JSON.parse(runnerResult.report) : runnerResult.report
        }
    } catch (err) {
        console.log(err);
    }
};

// Funcao que valida URL
function validateUrl(value) {
    return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
}

// Funcao que exibe data e hora

function currentData() {
    // Obtém a data/hora atual
    var data = new Date();

    // Guarda cada pedaço em uma variável
    var dia = data.getDate(); // 1-31
    var dia_sem = data.getDay(); // 0-6 (zero=domingo)
    var mes = data.getMonth(); // 0-11 (zero=janeiro)
    var ano2 = data.getYear(); // 2 dígitos
    var ano4 = data.getFullYear(); // 4 dígitos
    var hora = data.getHours(); // 0-23
    var min = data.getMinutes(); // 0-59
    var seg = data.getSeconds(); // 0-59
    var mseg = data.getMilliseconds(); // 0-999
    var tz = data.getTimezoneOffset(); // em minutos

    // Formata a data e a hora (note o mês + 1)
    var str_data = dia + '/' + (mes + 1) + '/' + ano4;
    var str_hora = hora + ':' + min + ':' + seg;

    // Mostra o resultado
    return (str_data + " " + str_hora)
}

//Funcao que remove as chaves com dot
function unescape(str) {
    return str.replace(".", '-')
}

//Rotas
router.post('/lighthouse', async(req, res) => {

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('reports');

    var data = new Date();

    try {

        const payload = req.body.payload;

        const payloadUrlArr = Array.isArray(payload) ? payload : [payload];

        const validUrlArr = payloadUrlArr.filter(item => validateUrl(item));

        let response = [];

        for (let i = 0; i < validUrlArr.length; i++) {
            const result = await lh(validUrlArr[i]);

            response.push(result);

        }


        response = response.map(item => deepMapKeys(item, unescape));


        //Submit to the DB
        for (let i = 0; i < response.length; i++) {



            //console.log(response[i].report.audits)
            console.log(response[i])
            await collection.insert({
                "url": response[i].result.finalUrl,
                "score": response[i].score,
                "fetchTime": currentData()
                    // "report": response[i].report
            });
        }

        // And forward to success page
        res.json({ message: "data saved in db" });

    } catch (err) {
        console.log(err);
        res.status = 500;
        res.json({
            message: "Error",
            error: err
        });
    }
});


router.get('/lighthouse/:payload', async(req, res) => {
    try {
        let url = req.params.payload;

        if (!url)
            throw new Error("Requer url");

        url = `https://${url}`;

        if (!validateUrl(url))
            throw new Error("Url inválida");

        const result = await lh(url, 'html');

        res.setHeader('content-type', 'text/html');
        res.send(result.report);
    } catch (err) {
        res.statusCode = 500;
        res.send(err);
    }

    res.end();
});

// Parse application/json
app.use(express.json());
app.use('/', router);

app.listen(port, () => {
    console.log(`Server started on PORT ${port}`);
});