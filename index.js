const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const { json } = require('body-parser');
var app = express();

const english = /^[A-Za-z0-9]*$/;
const port = process.env.PORT || 80;
const headTag = '<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" type="image/png" href="https://i.imgur.com/3Vr8MdI.png"><link rel="stylesheet" type="text/css" href="/style.css"><img src="https://i.imgur.com/OIBEwul.png"/><title>בנק יותם בוץ ושות</title></head>';

// all data from DB
var USERS = []; // list of: {userid: id, hash: hash}

// DB
const db = mysql.createPool({
    host: "eu-cdbr-west-01.cleardb.com",
    user: "b02940b823a21c",
    password: "2448401c",
    database: "heroku_703457e09fdd844"
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}));

/*
function isValidUsername(username)
{
    return english.test(username);
}
*/

// favicon
app.get('/favicon.ico', (req, res)=>{
    res.sendFile(__dirname + "/favicon.ico");
});

// css
app.get('/style.css', (req, res)=>{
    res.sendFile(__dirname + "/style.css");
});

// main page
app.get('/', (req, res)=>{
    res.sendFile(__dirname + "/login.html");
});

// REQUESTS

// register
app.get('/register', (req, res)=>{
    res.sendFile(__dirname + '/register.html');
});

// register api
app.get('/registerUser/:username/:password', (req, res)=>{
    let username = req.params.username.toLowerCase();
    let password = req.params.password;

    // delete @ from username
    if (username.startsWith('@'))
    {
        username = username.substr(1);
    }

    // check if this username is already taken
    let sql = 'SELECT COUNT(id) AS "count" FROM users WHERE username LIKE "' + username + '"';
    db.query(sql, (err, result)=>{
        if (err)
            throw err;
        
        let obj = result[0];

        if (obj.count == 0)
        {
            // username isnt taken!
            // create user in DB
            let secSql = 'INSERT INTO users (username, password) VALUES ("' + username + '", "' + password + '")';
            db.query(secSql, (err, result)=>{
                if (err)
                    throw err;
            });
            res.sendFile(__dirname + '/login.html');
            console.log('New register! ' + username);
        }
        else{
            res.sendFile(__dirname + '/userTaken.html');
        }
    });
});

// user page
app.get('/user/:hash', (req, res)=>{
    // if hash exists
    let hash = req.params.hash;
    let userLoggedIn = false;
    let userId = -1;
    for (let i = 0; i < USERS.length; i++)
    {
        let user = USERS[i];

        if (user.hash == hash)
        {
            userLoggedIn = true;
            userId = user.id;
        }
    }

    if (userLoggedIn == false)
    {
        // send user to main page
        res.send('<!DOCTYPE html><html>' + headTag + 'loading...<script>window.location.href = "http://" + window.location.hostname + "/";</script></html>');
    }
    else{
        // user IS LOGGEDIN!
        // get info on him!
        let sql = ("SELECT * FROM users WHERE id = " + userId);
        db.query(sql, (err, result)=>{
            if (err)
                throw err;
            
            let obj = result[0];

            // user page
            res.send(headTag + "<h3>1 B = 0.2 ₪</h3>Username: @" + obj.username + "<br>You have: " + obj.botz + ' B<br><br>transfer to:<br><input id="username" type="text" placeholder="user to transfer to" /><br><input id="amount" type="number" placeholder="amount to transfer" /> B <br><button onclick="transfer()">trasfer!</button><script>function transfer() {let username = document.getElementById("username").value; let amount = document.getElementById("amount").value; window.location.href = "http://" + window.location.hostname + "/transfer/' + hash + '/" + username + "/" + amount; }</script>');
        });
    }
});

// login api
app.get('/login/:username/:password', (req, res)=>{
    let username = req.params.username.toLowerCase();
    let password = req.params.password;

    // delete @ from username
    if (username.startsWith('@'))
    {
        username = username.substr(1);
    }

    // check if login info is valid
    let sql = 'SELECT id, COUNT(id) AS "count" FROM users WHERE username LIKE "' + username + '" AND password LIKE "' + password + '" LIMIT 1';
    db.query(sql, (err, result)=>{
        
        if (err)
            throw err;
        
        let validity = false;
        let userHash = 'unvalid';

        let obj = result[0]
        // if user exists and password match
        if (obj.count >= 1)
        {
            validity = true;

            let hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            // make sure there are no / in the hash
            while (hash.includes('/'))
            {
                hash = hash.replace('/', 'N');
            }

            let userLoggesInAlready = false;
            for (user in USERS)
            {
                if (user.id == obj.id)
                {
                    userLoggesInAlready = true;
                    user.hash = hash;
                    userHash = hash;
                }
            }

            // if user isnt already loged in
            if (userLoggesInAlready == false)
            {
                USERS.push({id: obj.id, hash: hash}); // push user login

                userHash = hash;
            }
        }

        let whatToSend;
        if (validity == true && userHash != 'unvalid')
        {
            // send user to his page
            whatToSend = headTag + "loading...<script>window.location.href = 'http://' + window.location.hostname + '/user/' + '" + userHash + "';</script>";
        }
        else{
            // go to main page
            whatToSend = headTag + "loading...<script>window.location.href = 'http://' + window.location.hostname + '/';</script>";
        }
        res.send(whatToSend);

    });
});

// transfer botz
app.get('/transfer/:hash/:username/:amount', (req, res)=>{
    let hash = req.params.hash;
    let username = req.params.username.toLowerCase();
    let amonut = req.params.amount;
    let userId = -1;

    // delete @ from username
    if (username.startsWith('@'))
    {
        username = username.substr(1);
    }
    
    // check if hash exists
    let hashExists = false;
    for (let i = 0; i < USERS.length; i++)
    {
        let user = USERS[i];

        if (user.hash == hash)
        {
            hashExists = true;
            userId = user.id;
        }
    }

    if (hashExists == true)
    {
        // check if user has that much
        let userHaveTranfserAmount = false;
        let sql = 'SELECT botz FROM users WHERE id = ' + userId;
        db.query(sql, (err, result)=>{
            if (err)
                throw err;
            
            let obj = result[0];
            if (parseFloat(obj.botz) >= parseFloat(amonut))
            {
                // have that much!
                userHaveTranfserAmount = true;
            }
            else{
                userHaveTranfserAmount = false;
            }

            // check that target user exists
            let targetUserExists = false;
            sql = 'SELECT COUNT(id) AS "count" FROM users WHERE username LIKE "' + username + '"';
            db.query(sql, (err, result)=>{
                if (err)
                    throw err;

                let obj = result[0];
                let count = obj.count;

                if (parseInt(count) == 1)
                {
                    // target user exists
                    targetUserExists = true;
                }
                else{
                    targetUserExists = false;
                }

                // check that all requirement are filled
                if (hashExists == true &&
                    userHaveTranfserAmount == true &&
                    targetUserExists == true)
                {
                    // make the transfer
                    // take money
                    sql = 'UPDATE users SET botz = (botz - ' + amonut + ') WHERE id = ' + userId;
                    db.query(sql, (err, result)=>{
                        if (err)
                            throw err;
                    });

                    // add money
                    sql = 'UPDATE users SET botz = (botz + ' + amonut + ') WHERE username LIKE "' + username + '"';
                    db.query(sql, (err, result)=>{
                        if (err)
                            throw err;
                    });


                    // send res
                    res.sendFile(__dirname + '/validTransfer.html');
                }
                else{
                    // ERROR: INVALID TRANSFER
                    res.sendFile(__dirname + '/invalidTransfer.html');
                }
            });
        });
    }
    else
    {
        // ERROR: INVALID TRANSFER
        res.sendFile(__dirname + '/invalidTransfer.html');
    }

});

// start server
app.listen(port, function(err){
    if (err)
    {
        throw err;
    }
    console.log("Server is ACTIVE");
})