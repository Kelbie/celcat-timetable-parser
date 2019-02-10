var express = require("express");
var pdf2json = require("pdf2json");
var async = require("async");
var fs = require("fs");
var router = express.Router();

const types_min = {
  "Event- Board": "Board",
  "Event- External": "External",
  "Event- Internal": "Internal",
  "Event- Student/SU": ["Student", "SU"],
  "Staff N/A- Non-teaching Time": "Non-teaching Time",
  "Staff N/A- Part-time": "Part-time",
  "Staff N/A- Research Time": "Research Time",
  "Teaching- Directed Study": "Directed Study",
  "Teaching- Distance Learning": "Distance Learning",
  "Teaching- Enrolment/Induction": ["Enrolment", "Induction"],
  "Teaching- Laboratory/Practical": ["Laboratory", "Practical"],
  "Teaching- Lecture": "Lecture",
  "Teaching- Other": "Other",
  "Teaching- Placement/Off-site": ["Placement", "Off-site"],
  "Teaching- Seminar/Tutorial/Workshop": ["Seminar", "Tutorial", "Workshop"],
  "Teaching- Short Course": "Short Course",
  "z- Ad-hoc Assessment": "Assessment",
  "z- Building Closed": "Building Closed",
  "z- Examination Period": "Examination Period"
}

var scrape = require("./scrape");
var pdf2txt = require("./pdf2txt");
var db = require("../public/javascripts/db");

function removeWhitespace(str) {
  // Removes all whitespace and newline characters
  return str.replace(/[ \n]/g,'')
}

async function test() {
  await db.init();
  await scrape.all();
  // await scrape.pdf();
  
  
  const data = {
    modules: await db.getModules(),
    staff: await db.getStaff(),
    groups: await db.getGroups(),
    rooms: await db.getRooms()
  }

  fs.readdir("timetables", async (err, files) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file != ".DS_Store") {
        
        const txt = await pdf2txt.transform(file);

        await pair(txt, data);
      }
    }
  })

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
  
  for (let j = 0; j < data.modules.length; j++) {
    if (removeWhitespace(class_object["raw"]).includes(removeWhitespace(data.modules[j].identifier))) {
      class_object["module"] = data.modules[j];
    }
  }
  
  for (let j = 0; j < data.groups.length; j++) {
    if (removeWhitespace(class_object["raw"]).includes(removeWhitespace(data.groups[j].identifier))) {
      class_object["groups"].push(data.groups[j]);
    }
  }

  for (let j = 0; j < Object.keys(types_min).length; j++) {
    const type = Object.keys(types_min)[j];
    if (removeWhitespace(class_object.raw).includes(removeWhitespace(type))) {
      class_object["type"] = types_min[type];
      break;
    }
  }

  time = removeWhitespace(class_object.raw).match(/[0-9][0-9]:[0-9][0-9]-[0-9][0-9]:[0-9][0-9]/g)[0]
  time = time.replace(/^\s+|\s+$/g, "");
  var [start, end] = time.split("-");

  class_object["time"] = {
    start: start,
    end: end
  };

  return class_object;
}

async function pair(txt, data) {
  const txt_list = txt.split("\r");
  var classes = [];
  [class_object, group_reset] = reset({}, 0, 0);
  var group_by_day = { classes: [] };
  for (let i = 0; i < txt_list.length; i++) {
    const element = txt_list[i];
    if (contains(removeWhitespace(element), Object.keys(types_min).map(type => { return removeWhitespace(type) } ) )) {
      if (contains(removeWhitespace(class_object.raw), Object.keys(types_min).map(type => { return removeWhitespace(type) } ) )) {
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
  
        if (class_object.raw != "" && contains(removeWhitespace(class_object.raw), Object.keys(types_min).map(type => { return removeWhitespace(type) } ) )) {
          class_object = raw2dict(class_object, data)
          group_by_day.classes.push(class_object);
        }

        for (let k = 0; k < group_by_day.classes.length; k++) {
          const class_ = group_by_day.classes[k];
          if (class_.module != undefined) {
            await db.addClass({
              raw: class_.raw,
              type: class_.type,
              module_id: class_.module.id,
              date: date,
              start: class_.time.start,
              finish: class_.time.end,
              staff: class_.staff.map(staff => {return staff.id}),
              rooms: class_.rooms.map(room => {return room.id}),
              groups: class_.groups.map(group => {return group.id})
            }); 
          }
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

    if (i - 25 < group_reset) {
      class_object["raw"] += element;
    }

  }

  const fs = require("fs");
  fs.writeFile("public/test.json", JSON.stringify(classes), function(err) {
    if (err) {
      return console.log(2, err);
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

router.get("/modules", async (req, res, next) => {
  const modules = await db.getModules({select: "id, identifier, name"});
  res.json(modules);
});

router.get("/groups/count", async (req, res, next) => {
  const count = await db.countGroups();
  res.json(count)
});

router.get("/staff/count", async (req, res, next) => {
  const count = await db.countStaff();
  res.json(count)
});

router.get("/modules/count", async (req, res, next) => {
  const count = await db.countModules();
  res.json(count)
});

router.get("/rooms/count", async (req, res, next) => {
  const count = await db.countRooms();
  res.json(count)
});

router.get("/modules/:id", async (req, res, next) => {
  const modules = await db.getModules({where: `id=${req.params.id}`, select: "id, identifier, name"});
  res.json(modules);
});

router.get("/groups/:id", async (req, res, next) => {
  const groups = await db.getGroups({where: `id=${req.params.id}`, select: "id, identifier, name"});
  res.json(groups);
});

router.get("/classes/group/:group_id", async (req, res, next) => {
  const classes = await db.getClasses(req.params.group_id);
  res.json(classes);
});

module.exports = router;
