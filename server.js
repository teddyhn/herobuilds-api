require('dotenv').config();
const puppeteer = require('puppeteer')
const express = require('express')
const db = require('./database')
const app = express();

const URL = process.env.URL

const hostname = '127.0.0.1';
const port = 3000;

app.listen(port, hostname, () => console.log('Server live 👌'))

app.get("/", (req, res) => {
    res.send('HeroBuilds API is online! 🌊')
})

app.get("/api/heroes", async (req, res) => {

    let lastData = await db.fetchFromDB("heroes", "");
    
    // If the last update is more than 12h old, update the file
    if (lastData == null || Date.now() - lastData.lastUpdate > 1000*60*60*12) {
  
        // Scrape from site that attempts to profit off data not owned by them by charging for API access
        var browser = await puppeteer.launch({ headless: true })
        var page = await browser.newPage();
        await page.goto(
            URL + "Global/Hero/",
            { waitUntil: 'networkidle0' }
        );

        let data = {}

        const getData = async() => {
            return await page.evaluate(async () => {
                let resObj = {
                    lastUpdate: Date.now(),
                    heroes: []
                }

                heroes = document.querySelectorAll('tbody#hero-stat-data > tr:nth-of-type(odd)')
        
                heroes.forEach(el => {
                    let hero = {}

                    hero.name = el.querySelector('td:nth-child(1) a.vertically-aligned').textContent
                    hero.winrate = el.querySelector('td:nth-child(2)').textContent
                    hero.deltaWinrate = el.querySelector('td:nth-child(3)').textContent
                    hero.popularity = el.querySelector('td:nth-child(4)').textContent
                    hero.pickrate = el.querySelector('td:nth-child(5)').textContent
                    hero.banrate = el.querySelector('td:nth-child(6)').textContent
                    hero.gamesPlayed = el.querySelector('td:nth-child(8)').textContent

                    // Save stats in object
                    resObj.heroes.push(hero)
                })

                return new Promise(resolve => {
                    resolve(resObj);
                })
            })
        }

        data = await getData();

        await browser.close();

        // Return the data in plain JSON
        res.send(JSON.stringify(data))
        // and save a copy to db
        db.saveToDB("heroes", "", data)

    } else {
      res.send(lastData)
    }
})
  