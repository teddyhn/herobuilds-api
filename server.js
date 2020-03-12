const express = require('express')
const app = express();

const hostname = '127.0.0.1';
const port = 3000;

app.listen(port, hostname, () => console.log('Server live 👌'))

app.get("/", (req, res) => {
    res.send('HeroBuilds API is online! 🌊')
})