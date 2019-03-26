const http = require('http');
var request = require("request-promise");
var async = require("async");
var cheerio = require("cheerio");
var fs = require("fs");

var db = require("../public/javascripts/db.js");

async function download() {
  var headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:64.0) Gecko/20100101 Firefox/64.0",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    Referer: "https://testnet.demo.btcpayserver.org/",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    TE: "Trailers"
    // 'Cookie': 'mp_96b84420a1a32e448f73e7b9ffccebdb_mixpanel=%7B%22distinct_id%22%3A%20%22167e21a4445114-0677243f7fbef88-4a566b-13c680-167e21a4446371%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%7D; mp_a37bac8664a332481726ae49603f9f63_mixpanel=%7B%22distinct_id%22%3A%20%227a4df678-1858-477f-961d-741c201ec6b1%22%7D; .AspNetCore.Antiforgery.9TtSrW0hzOs=CfDJ8CbxocSCAUFFlXYrlS_uZQkvzgA84P4bix4l1zFSyVWGPukMjtR8G6TxyzWiw3o-2b_XhvkDrANbCXIGL3UasEde-VhiJnMRlvme-B3zsfO7r2eH3UMI70P8jHAYFoN6bdm-qnmjdQIy4chv5t5UaNE'
  };

  var options = {
    url: JSON.parse(fs.readFileSync("public/json/config.json")).source,
    headers: headers,
    transform: function(body) {
      const tds = cheerio(body).find('td');
      for (let i = 0; i < tds.length; i++) {
        const td = tds[i];
        if (td.children[0].children != undefined) {
          var groups = {};
          var link = td.children[0].children[0].parent.attribs.href;
          const text = td.children[0].children[0].data;
          if (text.substring(0,5) == "Group") {
            const [name, identifier] = text.split("Group:  ")[1].split(",");
            group = {
              name: name,
              identifier: identifier,
              raw: text.split("Group:  ")[1],
              link: link 
            }
            db.addGroup(group)
          } else if (text.substring(0,5) == "Staff") {
            var raw = text.split("Staff:  ")[1];
            var staff = {};
            if (raw.includes(",")) {
              var [last, first] = raw.split(",");
              staff = {
                first: first.replace(/^\s+|\s+$/g, ''),
                last: last,
                raw: raw,
                link: link
              }
            } else if (raw.includes("(") && raw.includes(")")) {
              const tag = raw.match(/\(.+\)/g);
              staff = {
                tag: tag[0],
                first: first,
                last: last,
                raw: raw,
                link: link
              }
            } else {
              staff = {
                raw: raw,
                link: link
              }
            }
            db.addStaff(staff)
          } else if (text.substring(0,4) == "Room") {
            var room = {};
            var raw = text.split("Room:  ")[1]
            if (raw.includes("(") && raw.includes(")")) {
              var name = raw.match(/\(.+\)/g);
              var building = raw.split(name).pop().split("-").pop().replace(/^\s+|\s+$/g, '');
              if (name == undefined) {
                name = raw.split("-")[1];
                var id = raw.split(name)[0];
              } else {
                name = name[0];
                var id = raw.split(name)[0];
              }
              room = {
                identifier: id.replace(/^\s+|\s+$/g, ''),
                name: name,
                building: building,
                raw: raw,
                link: link
              }
            } else {
              room = {
                raw: raw,
                link: link
              }
            }
            db.addRoom(room);
          } else if (text.substring(0,6) == "Module") {
            var module = {};
            var raw = text.split("Module:  ")[1];
            var [id, name] = raw.split(",");
            name = name.replace(/^\s+|\s+$/g, '');
            module = {
              identifier: id.replace(/^\s+|\s+$/g, ''),
              name: name,
              raw: raw,
              link: link
            }
            db.addModule(module)
          }
        }
      }
    }
  };
  
  

  return await request(options);
}

async function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

module.exports = {
  all: async function() {
    console.log("Downloading Schema...")
    return await download();
  },
  pdf: async function(callback) {
    const PDFs = await db.getPDFs();
    let start, end;
    if (process.env.NODE_ENV == "development") {
      start = 0;
      end = Math.min(5, PDFs.length);
    } else if (process.env.NODE_ENV == "production") {
      start = 0;
      end = PDFs.length
    }
    
    for (let i = 0; i < end; i++) {
      var PDF = PDFs[i].link;
      console.log(`Scraping ${PDFs[i].link}`)
      var file = fs.createWriteStream(`timetables/${PDF}`);
      await http.get(`http://celcat.rgu.ac.uk/RGU_MAIN_TIMETABLE/${PDF}`, async function(response) {
        let stream = await response.pipe(file);
        stream.on('finish', function() {
          callback(PDF);
        })
      });
      await sleep(30000);
    }
  }
}