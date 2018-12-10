const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const rp = require('request-promise');
const cheerio = require('cheerio');

const fs = require('fs');
const credentials = JSON.parse(fs.readFileSync('./credentials.json'));

const options = {
    uri: "",
    auth: {
        user: credentials.user_camera,
        pass: credentials.pass_camera,
        sendImmediately: false
    },
    transform: function (body) {
        return cheerio.load(body);
    }
};

const cors = require('cors');

function nocache(req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
}

app.use(cors());
app.use(express.static(__dirname + '/public'));

app.get('/proxy', (req, res) => {
    res.send("proxy")
});

app.get('/status/:ip', nocache, (req, res) => {
    const ip = req.params.ip;
    var date;
    var obj = {
        date: "-",
        status: "-",
        style: ""
    };

    options.uri = `http://${ip}:8081/ISAPI/system/IO/outputs/1/status`;
    options.timeout = 5000;

    var optionsCopy = Object.assign({}, options);
    optionsCopy.uri = `http://${ip}:8081/ISAPI/system/IO/inputs/1/status`;
    optionsCopy.timeout = 5000;

    rp(optionsCopy)
        .then(function ($) {
            date = new Date();
            date.setHours(date.getHours() + 2);

            var dateStart = date.getFullYear() + '-' + ('0' + (date.getMonth()+1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);

            date = dateStart + " " + date.toLocaleTimeString("lt");
            obj.date = date.toString();

            // console.log(ip, "  ", $('body ioState').text());

            // tikrinam ar kamera pajungta
            if ("inactive" === $('body ioState').text()) {
                rp(options)
                    .then(function ($) {
                        if ($('body').text().includes("inactive", 9)) {
                            obj.status = "PLOVYKLA LAISVA";
                            obj.style = "<style> body { background-color: green; } </style>";
                        } else {
                            obj.status = "PLOVYKLA UŽIMTA";
                            obj.style = "<style> body { background-color: red; } </style>";
                        }

                        res.send(obj);
                    })
                    .catch(function (err) {
                        console.error(err);
                        res.send('eb002');
                    });
            } else {
                obj.status = "PLOVYKLA NEVEIKIA";
                obj.style = "<style> body { background-color: red; } </style>";
                res.send(obj);
            }
        })
        .catch(function (err) {
            console.error(err);
            res.send('eb003');
        });
});

app.post("/logmsg", (req, res) => {
    var body = "";

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        console.log(body);
        res.end('ok');
    });
});

app.get('/*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => console.log(`CircelK app listening on port ${port}...`));