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
    // pasiimamas 192.xxx.x.xxx ip, kas nėr gerai..
    var ip_query = req.params.ip;

    // bandom taip:

    console.log("BE atejo IP: ", ip_query);

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log("BE ip 1: ", req.headers['x-forwarded-for']);
    console.log("BE ip 2: ", req.connection.remoteAddress);

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
                            obj.style = "<style> body { background-color: #339900; } </style>";
                        } else {
                            obj.status = "PLOVYKLA UŽIMTA";
                            obj.style = "<style> body { background-color: #cc0000; } </style>";
                        }

                        console.error("It is a great success for: ", ip);
                        res.send(obj);
                    })
                    .catch(function (err) {
                        console.error(JSON.stringify(err));
                        res.send('eb002');
                    });
            } else {
                obj.status = "PLOVYKLA NEVEIKIA";
                obj.style = "<style> body { background-color: #cc0000; } </style>";
                res.send(obj);
            }
        })
        .catch(function (err) {
            console.error(JSON.stringify(err));
            res.send('eb003 huh?');
        });
});

app.post("/logmsg", (req, res) => {
    var body = "";
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log("ip --------------------> ", JSON.stringify(ip));

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        console.log('chunked body --------------------> ', JSON.stringify(body));
        res.end('ok');
    });
});
    
app.get("/logmsgTEST/:data", nocache, (req, res) => {
    const data = req.params.data;

    console.log("BE QUERY DATA: ", JSON.stringify(data));
    res.send('BE gavo zinute');
});

app.get('/*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => console.log(`CircelK app listening on port ${port}...`));