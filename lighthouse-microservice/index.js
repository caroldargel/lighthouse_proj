const express = require('express');
const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer-core');
const { URL } = require('url');

const port = process.env.SERVER_PORT || 4000;

const app = express();
const router = express.Router();

// Lighthouse
async function lh(url, output) {
    try {
        const browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            args: [
                "--headless",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--remote-debugging-port=9222",
                "--remote-debugging-address=0.0.0.0"
            ]
        });

        const outputOption = output || 'json';

        const options = {
            logLevel: 'info',
            output: outputOption,
            port: (new URL(browser.wsEndpoint())).port
        };

        const { lhr, report } = await lighthouse(url, options);

        browser.close();

        console.log('dentro da função lighthouse: ' + outputOption);

        console.log(Object.values(lhr.categories).map(c => c.title + ' (' + c.score * 100 + ')').join(', '));

        if (outputOption === 'html') {
            return report;
        }

        return {
            result: lhr,
            score: Object.values(lhr.categories).map(c => c.title + ' (' + c.score * 100 + ')').join(', '),
            report: JSON.parse(report)
        }


    } catch (err) {
        throw err;
    }
};

// Funcao que valida URL
function validateUrl(value) {
    return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
}

//Rotas
router.post('/lighthouse', async(req, res) => {
    try {

        const payload = req.body.payload;

        const payloadUrlArr = Array.isArray(payload) ? payload : [payload];

        const validUrlArr = payloadUrlArr.filter(item => validateUrl(item));

        let response = [];

        for (let i = 0; i < validUrlArr.length; i++) {
            const result = await lh(validUrlArr[i]);

            response.push(result);
        }

        // And forward to success page
        res.json({
            message: "Ok",
            result: response
        });

    } catch (err) {
        console.log(err);
        res.json({
            status: 500,
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
        res.send(result);
    } catch (err) {
        res.statusCode = 500;
        res.send(err);
    }

    res.end();
});

router.get('/', async(req, res) => {
    res.send({ message: "Ok" });
});

// Parse application/json
app.use(express.json());
app.use('/', router);

app.listen(port, '0.0.0.0', () => {
    console.log(`Server started on PORT ${port}`);
});