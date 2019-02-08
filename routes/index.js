var express = require("express");
var pdf2json = require("pdf2json");
var async = require("async");
var router = express.Router();

const types = [
  "Event- Board",
  "Event- External",
  "Event- Internal",
  "Event- Student/SU",
  "Staff N/A- Non-teaching Time",
  "Staff N/A- Part-time",
  "Staff N/A- Research Time",
  "Teaching- Directed Study",
  "Teaching- Distance Learning",
  "Teaching- Enrolment/Induction",
  "Teaching- Laboratory/Practical",
  "Teaching- Lecture",
  "Teaching- Online",
  "Teaching- Other",
  "Teaching- Placement/Off-site",
  "Teaching- Seminar/Tutorial/Workshop",
  "Teaching- Short Course",
  "z- Ad-hoc Assessment",
  "z- Building Closed",
  "z- Examination Period"
];

var scrape = require("./scrape");
var pdf2txt = require("./pdf2txt");
var db = require("../public/javascripts/db");

function removeWhitespace(str) {
  // Removes all whitespace and newline characters
  return str.replace(/[ \n]/g,'')
}

async function test() {
  await db.init();
  const txt = await pdf2txt.transform();
  await scrape.all();
  const data = {
    modules: await db.getModules(),
    staff: await db.getStaff(),
    groups: await db.getGroups(),
    rooms: await db.getRooms()
  }
  console.log(data.modules);
  pair(txt, data);
}

test();

function contains(target, pattern) {
  // Checks if any pattern element is in target
  var value = 0;
  pattern.forEach(function(word) {
    value = value + target.includes(word);
  });
  return value === 1;
}

function containsRegex(target, pattern) {
  // like contains except for regex
  if (target.match(pattern)) {
    return true
  }
  return false;
}

function reset(class_object, group_reset, i, push) {
  class_object = { raw: "" };
  group_reset = i;
  return [class_object, group_reset];
}

function raw2dict(class_object, data) {
  class_object["staff"] = [];
  class_object["rooms"] = [];
  class_object["groups"] = [];

  for (let j = 0; j < data.staff.length; j++) {
    if (removeWhitespace(class_object["raw"]).includes(removeWhitespace(data.staff[j].raw))) {
      class_object["staff"].push(data.staff[j]);
    }
  }
  
  for (let j = 0; j < data.rooms.length; j++) {
    if (removeWhitespace(class_object["raw"]).includes(removeWhitespace(data.rooms[j].raw))) {
      class_object["rooms"].push(data.rooms[j]);
    }
  }
  
  for (let j = 0; j < data.groups.length; j++) {
    if (removeWhitespace(class_object["raw"]).includes(removeWhitespace(data.groups[j].raw.split(",")[1]))) {
      class_object["groups"].push(data.groups[j]);
    }
  }
  
  for (let j = 0; j < data.modules.length; j++) {
    if (removeWhitespace(class_object["raw"]).includes(removeWhitespace(`${data.modules[j].id}`))) {
      class_object["module"] = data.modules[j];
    }
  }

  return class_object;
}

async function pair(txt, data) {
  const txt_list = txt.split("\r");
  var classes = [];
  [class_object, group_reset] = reset({}, 0, 0);
  var group_by_day = { classes: [] };
  for (let i = 0; i < txt_list.length; i++) {
    const element = txt_list[i];
    
    if (contains(element, [types[10]])) {
      if (contains(class_object.raw, [types[10]])) {
        class_object = raw2dict(class_object, data);
        group_by_day["classes"].push(class_object)
      }

      [class_object, group_reset] = reset(
        class_object,
        group_reset,
        i,
        true
      );
    }

    if (i - 10 < group_reset) {
      if (contains(element, [types[10]])) {
        // If any standard (expected) type
        var [type, time] = element.split(",");
        time = time.match(/[0-9][0-9]:[0-9][0-9]-[0-9][0-9]:[0-9][0-9]/g)[0]
        time = time.replace(/^\s+|\s+$/g, "");
        var [start, end] = time.split("-");

        // class_object["type"] = type.split("\n")[1];
        class_object["time"] = {
          start: start,
          end: end
        };
      }

      class_object["raw"] += element;
    }

    if (contains(element, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])) {
      var day;
      var pattern = /\w*[0-9][0-9]\/[0-9][0-9]\/[0-9][0-9][0-9][0-9]/g
      if (containsRegex(element, pattern)) {

        if (element.includes("Monday")) {
          day = "Monday"
        } else if (element.includes("Tuesday")) {
          day = "Tuesday"
        } else if (element.includes("Wednesday")) {
          day = "Wednesday"
        } else if (element.includes("Thursday")) {
          day = "Thursday"
        } else if (element.includes("Friday")) {
          day = "Friday"
        } else if (element.includes("Saturday")) {
          day = "Saturday"
        } else if (element.includes("Sunday")) {
          day = "Sunday"
        } 
  
        var date = element.match(/[0-9][0-9]\/[0-9][0-9]\/[0-9][0-9][0-9][0-9]/g)[0].split("/");
        date = `${date[2]}-${date[1]}-${date[0]}`


        group_by_day["date"] = date;
        group_by_day["day"] = day;
  
        if (class_object.raw != "" && class_object.raw.includes(types[10])) {
          class_object = raw2dict(class_object, data)
          group_by_day.classes.push(class_object);
        }

        for (let k = 0; k < group_by_day.classes.length; k++) {
          const class_ = group_by_day.classes[k];
          await db.addClass({
            raw: class_.raw,
            module_id: class_.module.id,
            date: date,
            start: class_.time.start,
            finish: class_.time.end,
            staff: class_.staff.map(staff => {return staff.id}),
            rooms: class_.rooms.map(room => {return room.id}),
            groups: class_.groups.map(group => {return group.id})
          }); 
        }

        classes.push(group_by_day);
        group_by_day = { classes: [] };
        [class_object, group_reset] = reset(
          class_object,
          group_reset,
          i,
          false
        );
      }
    }  
  }

  const fs = require("fs");
  fs.writeFile("public/test.json", JSON.stringify(classes), function(err) {
    if (err) {
      return console.log(err);
    }

    console.log("The file was saved!");
  });
  // console.log(classes);
  return {
    year: txt_list[0]
  };
}

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "Express" });
});

module.exports = router;
