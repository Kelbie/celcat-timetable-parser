var request = require("request-promise");
var async = require("async");
var cheerio = require("cheerio");

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
    url: "http://celcat.rgu.ac.uk/RGU_MAIN_TIMETABLE/finder2.html",
    headers: headers,
    transform: function(body) {
      const data = {
        staff: [

        ],
        rooms: [

        ],
        groups: [

        ],
        modules: [

        ]
      }
      const tds = cheerio(body).find('td');
      for (let i = 0; i < tds.length; i++) {
        const td = tds[i];
        const link = td.children.href;
        if (td.children[0].children != undefined) {
          const text = td.children[0].children[0].data;
          if (text.substring(0,5) == "Group") {
            data.groups.push(text.split("Group:  ")[1])
          } else if (text.substring(0,5) == "Staff") {
            var raw = text.split("Staff:  ")[1];
            if (raw.includes(",")) {
              var [last, first] = raw.split(",");
              data.staff.push({
                first: first.replace(/^\s+|\s+$/g, ''),
                last: last,
                raw: raw
              })
            } else if (raw.includes("(") && raw.includes(")")) {
              const tag = raw.match(/\(.+\)/g);
              data.staff.push({
                tag: tag[0],
                first: first,
                last: last,
                raw: raw
              })
            } else {
              data.staff.push({
                raw: raw
              })
            }
            
          } else if (text.substring(0,4) == "Room") {
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
              data.rooms.push({
                id: id.replace(/^\s+|\s+$/g, ''),
                name: name,
                building: building,
                raw: raw
              })
            } else {
              data.rooms.push({
                raw: raw
              })
            }
          } else if (text.substring(0,6) == "Module") {
            var raw = text.split("Module:  ")[1];
            var [id, name] = raw.split(",");
            name = name.replace(/^\s+|\s+$/g, '');
            data.modules.push({
              id: id.replace(/^\s+|\s+$/g, ''),
              name: name,
              raw: raw
            })
          }
        }
      }
      return data;
    }
  };
  
  

  return await request(options);
}

module.exports = {
  all: async function() {
    return await download();
  }
}