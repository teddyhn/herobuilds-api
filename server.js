require('dotenv').config();
const puppeteer = require('puppeteer')
const express = require('express')
const db = require('./database')
const cron = require('node-cron')
const app = express();
const cors = require('cors')

const URL = process.env.URL

const port = process.env.PORT || 5000;

app.use(cors())

app.listen(port, async () => {
  console.log('Running server startup task.')
  let heroes = require('./Heroes.json');

  for (let i = 0; i < heroes.length; i++) {
    const heroName = heroes[i].PrimaryName
    await cacheHeroData(heroName)
  }
})

app.get("/", (req, res) => {
    res.send('HeroBuilds API is online! 🌊')
})

app.get("/api/heroes/", async (req, res) => {

  let lastData = await db.fetchFromDB("heroes", "");
  
  // If the last update is more than 12h old, update the file
  if (lastData == null || Date.now() - lastData.lastUpdate > 1000*60*60*12) {

      // Scrape from site that attempts to profit off data not owned by them by charging for API access
      var browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
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
                  hero.img = el.querySelector('.hero-picture img').getAttribute('src').slice(24)

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

app.get("/api/heroes/:role", async (req, res) => {

    let role;
    req.params.role ? role = req.params.role : role = "";

    let lastData = await db.fetchFromDB(role, "");
    
    // If the last update is more than 12h old, update the file
    if (lastData == null || Date.now() - lastData.lastUpdate > 1000*60*60*12) {
  
        // Scrape from site that attempts to profit off data not owned by them by charging for API access
        var browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
        var page = await browser.newPage();

        await page.goto(
            URL + "Global/Hero/" + `?role=${role}`,
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
                    hero.img = el.querySelector('.hero-picture img').getAttribute('src').slice(24)

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

        // If no data is recorded, error out
        if (data.heroes.length == 0) {
          res.status(404).send("We couldn't find any data! 😂👌")
        } else {
          // Return the data in plain JSON
          res.send(JSON.stringify(data))
          // and save a copy to db
          db.saveToDB(role, "", data)
        }

    } else {
      res.send(lastData)
    }
})

app.get("/api/hero/:name", async (req, res) => {
  
    // NOTE: Hero names need to be properly capitalized/spelled/punctuated! e.g. "Lúcio" not "lucio"
    const heroName = req.params.name
    
    let lastData = await db.fetchFromDB(heroName, "heroes/")
    // If the last update is more than 12h old, update the file
    if (lastData == null || Date.now() - lastData.lastUpdate > 1000*60*60*12) {
  
      var browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
      var page = await browser.newPage();
      await page.goto(
        URL + process.env.URL_HERO + heroName,
        { waitUntil: 'networkidle0' }
      );
  
      let data = {}
  
      const getData = async() => {
        return await page.evaluate(async () => {
          let resObj = {
            lastUpdate: Date.now(),
            talents: [],
            builds: []
          }

          tables = document.querySelectorAll('table.single-talent-table')
    
          tables.forEach(el => {
            let tierArr = []
            talents = document.querySelectorAll(`#${el.id} > tbody tr`)
            talents.forEach(el => {
              let talent = {}
    
              talent.name = el.querySelector('.talent-name').textContent
              talent.description = el.querySelector('.talent-description').textContent
              talent.keybinding = el.querySelector('.talent-keybinding').textContent
              talent.winrate = el.querySelector('.win_rate_cell').textContent
              talent.popularity = el.querySelector('.popularity_cell').textContent
              talent.gamesPlayed = el.querySelector('.games_played_cell').textContent
              talent.wins = el.querySelector('.wins_cell').textContent
              talent.losses = el.querySelector('.losses_cell').textContent
              talent.img = el.querySelector('.talent-image img').getAttribute('src').slice(25)
  
              tierArr.push(talent)
            })
    
            resObj.talents.push(tierArr)
          })

          builds = document.querySelectorAll('table#popularbuilds tbody tr')

          builds.forEach(el => {
            let build = {}

            build.talents = []

            talents = el.querySelectorAll('div.talent-name')

            talents.forEach(el => {
              build.talents.push(el.textContent)
            })

            build.code = el.querySelector('.build-code').textContent
            build.gamesPlayed = el.querySelector('.games_played_column').textContent
            build.wins = el.querySelector('td:nth-of-type(4)').textContent
            build.losses = el.querySelector('td:nth-of-type(5)').textContent
            build.winrate = el.querySelector('td:nth-of-type(6)').textContent

            resObj.builds.push(build)
          })
  
          return new Promise(resolve => {
            resolve(resObj);
          })
        })
      }
  
      data = await getData();

      await browser.close();
  
      // If no data is recorded, error out
      if (data.talents[0].length == 0) {
        res.status(404).send("We couldn't find any data! 😂👌")
      } else {
        // Return the data in plain JSON
        res.send(JSON.stringify(data))
        // and save a copy to db
        db.saveToDB(heroName, "heroes/", data)
      }
  
    } else {
      // Send cached data
      res.send(lastData)
    }
})

// schedule tasks to be run on the server
cron.schedule("0 0 */3 * * *", async () => {
  console.log('Running task scheduled for every 3 hours.')
  let heroes = require('./Heroes.json');

  for (let i = 0; i < heroes.length; i++) {
    const heroName = heroes[i].PrimaryName
    await cacheHeroData(heroName)
  }
});
  

const cacheHeroData = async (heroName) => {
  let lastData = await db.fetchFromDB(heroName, "heroes/")
    // If the last update is more than 2h old, update the file
    if (lastData == null || Date.now() - lastData.lastUpdate > 1000*60*60*2) {
  
      var browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
      var page = await browser.newPage();
      await page.goto(
        URL + process.env.URL_HERO + heroName,
        { waitUntil: 'networkidle0' }
      );
  
      let data = {}
  
      const getData = async() => {
        return await page.evaluate(async () => {
          let resObj = {
            lastUpdate: Date.now(),
            talents: [],
            builds: []
          }

          tables = document.querySelectorAll('table.single-talent-table')
    
          tables.forEach(el => {
            let tierArr = []
            talents = document.querySelectorAll(`#${el.id} > tbody tr`)
            talents.forEach(el => {
              let talent = {}
    
              talent.name = el.querySelector('.talent-name').textContent
              talent.description = el.querySelector('.talent-description').textContent
              talent.keybinding = el.querySelector('.talent-keybinding').textContent
              talent.winrate = el.querySelector('.win_rate_cell').textContent
              talent.popularity = el.querySelector('.popularity_cell').textContent
              talent.gamesPlayed = el.querySelector('.games_played_cell').textContent
              talent.wins = el.querySelector('.wins_cell').textContent
              talent.losses = el.querySelector('.losses_cell').textContent
              talent.img = el.querySelector('.talent-image img').getAttribute('src').slice(25)
  
              tierArr.push(talent)
            })
    
            resObj.talents.push(tierArr)
          })

          builds = document.querySelectorAll('table#popularbuilds tbody tr')

          builds.forEach(el => {
            let build = {}

            build.talents = []

            talents = el.querySelectorAll('div.talent-name')

            talents.forEach(el => {
              build.talents.push(el.textContent)
            })

            build.code = el.querySelector('.build-code').textContent
            build.gamesPlayed = el.querySelector('.games_played_column').textContent
            build.wins = el.querySelector('td:nth-of-type(4)').textContent
            build.losses = el.querySelector('td:nth-of-type(5)').textContent
            build.winrate = el.querySelector('td:nth-of-type(6)').textContent

            resObj.builds.push(build)
          })
  
          return new Promise(resolve => {
            resolve(resObj);
          })
        })
      }
  
      data = await getData();

      await browser.close();
      
      db.saveToDB(heroName, "heroes/", data)
  
    } else console.log("Hero data already cached.")
  }