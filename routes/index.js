var express = require("express");
var pdf2json = require("pdf2json");
var async = require("async");
var fs = require("fs");
var router = express.Router();

const types_min = {
  "Event- Board": "Board",
  "Event- External": "External",
  "Event- Internal": "Internal",
  "Event- Student/SU": "Student/SU",
  "Staff N/A- Non-teaching Time": "Non-teaching Time",
  "Staff N/A- Part-time": "Part-time",
  "Staff N/A- Research Time": "Research Time",
  "Teaching- Directed Study": "Directed Study",
  "Teaching- Distance Learning": "Distance Learning",
  "Teaching- Enrolment/Induction": "Enrolment/Induction",
  "Teaching- Laboratory/Practical": "Laboratory/Practical",
  "Teaching- Lecture": "Lecture",
  "Teaching- Other": "Other",
  "Teaching- Placement/Off-site": "Placement/Off-site",
  "Teaching- Seminar/Tutorial/Workshop": "Seminar/Tutorial/Workshop",
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
  // initialize the database
  await db.init();
  // get the schema
  await scrape.all();

  // get and parse all timetables
  await scrape.pdf(async function(file) {
    const data = {
      modules: await db.getModules(),
      staff: await db.getStaff(),
      groups: await db.getGroups(),
      rooms: await db.getRooms()
    }
  
    console.log(`Parsing ${file}`);

    // converts pdf into text
    const txt = await pdf2txt.transform(file);

    // uses the data schema to figure out whats going on in the text
    await pair(txt, data);
  });

  

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
  
        if (class_object.raw != "" && contains(removeWhitespace(class_object.raw), Object.keys(types_min).map(type => { return removeWhitespace(type) } ) )) {
          class_object = raw2dict(class_object, data)
          group_by_day.classes.push(class_object);
        }

        for (let k = 0; k < group_by_day.classes.length; k++) {
          const class_ = group_by_day.classes[k];

          var date = element.match(/[0-9][0-9]\/[0-9][0-9]\/[0-9][0-9][0-9][0-9]/g)[0].split("/");

          time = removeWhitespace(class_.raw).match(/[0-9][0-9]:[0-9][0-9]-[0-9][0-9]:[0-9][0-9]/g)[0]
          time = time.replace(/^\s+|\s+$/g, "");
          var [start, end] = time.split("-");

          if (class_.module != undefined) {
            await db.addClass({
              raw: class_.raw,
              type: class_.type,
              module_id: class_.module.id,
              start: new Date(date[2], date[1]-1, date[0], start.split(":")[0], start.split(":")[1]).getTime() / 1000,
              finish: new Date(date[2], date[1]-1, date[0], end.split(":")[0], end.split(":")[1]).getTime() / 1000,
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
}

/* GET home page. */
router.get("/", function(req, res, next) {
  res.json({
    "paths": [{
        path: "/modules", 
        desc: "returns list of all modules"
      }, {
        path: "/staff", 
        desc: "returns list of all staff"
      }, {
        path: "/groups", 
        desc: "returns list of all groups"
      }, {
        path: "/rooms", 
        desc: "returns list of all rooms"
      }, {
        path: "/modules/count", 
        desc: "returns total number of modules"
      }, {
        path: "/staff/count", 
        desc: "returns total number of staff"
      }, {
        path: "/groups/count", 
        desc: "returns total number of groups"
      }, {
        path: "/rooms/count", 
        desc: "returns total number of rooms"
      }, {
        path: "/module/:id", 
        desc: "where :id is the id of the module it returns more info about it"
      }, {
        path: "/staff/:id", 
        desc: "where :id is the id of the staff member it returns more info about it"
      }, {
        path: "/group/:id",
        desc: "where :id is the id of the group it returns more info about it"
      }, {
        path: "/rooms/:id", 
        desc: "where :id is the id of the room it returns more info about it"
      }, {
        path: "/classes/staff/:staff_id", 
        desc: "where :staff_id is the id of the staff member it returns all the classes associated with them"
      }, {
        path: "/classes/group/:group_id", 
        desc: "where :group_id is the id of the group it returns all the classes associated with it"
      }, {
        path: "/classes/room/:room_id", 
        desc: "where :room_id is the id of the room it returns all the classes associated with it"
      }, {
        path: "/classes",
        desc: "returns list of all classes"
      }
    ]
  })
});

router.get("/modules", async (req, res, next) => {
  const modules = await db.getModules({select: "id, identifier, name"});
  res.json(modules);
});

router.get("/staff", async (req, res, next) => {
  const staff = await db.getStaff({select: "id, first, last, tag"});
  res.json(staff);
});

router.get("/groups", async (req, res, next) => {
  const groups = await db.getGroups({select: "id, identifier"});
  res.json(groups);
});

router.get("/rooms", async (req, res, next) => {
  const rooms = await db.getRooms({select: "id, identifier, name, building"})
  res.json(rooms)
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

router.get("/module/:id", async (req, res, next) => {
  const modules = await db.getModules({where: `id=${req.params.id}`, select: "id, identifier, name"});
  res.json(modules);
});

router.get("/group/:id", async (req, res, next) => {
  const groups = await db.getGroups({where: `id=${req.params.id}`, select: "id, identifier, name"});
  res.json(groups);
});

router.get("/room/:id", async (req, res, next) => {
  const rooms = await db.getRooms({where: `id=${req.params.id}`, select: "id, identifier, name, building"});
  res.json(rooms);
});

router.get("/staff/:id", async (req, res, next) => {
  const staff = await db.getStaff({where: `id=${req.params.id}`, select: "id, first, last, tag"});
  res.json(staff);
});

router.get("/classes/group/:group_id", async (req, res, next) => {
  const classes = await db.getClassesByGroup(req.params.group_id);
  res.json(classes);
});

router.get("/classes/room/:room_id", async (req, res, next) => {
  const classes = await db.getClassesByRoom(req.params.room_id);
  res.json(classes);
});

router.get("/classes/staff/:staff_id", async (req, res, next) => {
  const classes = await db.getClassesByStaff(req.params.staff_id);
  res.json(classes);
});

router.get("/classes", async (req, res, next) => {
  const classes = await db.getClasses();
  res.json(classes);
});

router.get("/classes/:class_id", async (req, res, next) => {
  const class_details = await db.getClassByID(1000);
  res.json(class_details);
});

module.exports = router;
