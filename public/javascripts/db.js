const  async = require("async");
const { Client } = require('pg')
  const client = new Client({
  })

client.connect()

async function init() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL, 
      first VARCHAR, 
      last VARCHAR, 
      raw VARCHAR, 
      link VARCHAR UNIQUE, 
      tag VARCHAR, 
      PRIMARY KEY (id)
    );
  `, []);

  await client.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL,
      identifier VARCHAR,
      raw VARCHAR,
      name VARCHAR,
      building VARCHAR,
      link VARCHAR UNIQUE,
      PRIMARY KEY (id)
    );
  `, []);

  await client.query(`
    CREATE TABLE IF NOT EXISTS modules (
      id SERIAL, 
      identifier VARCHAR, 
      raw VARCHAR, 
      name VARCHAR, 
      link VARCHAR UNIQUE, 
      PRIMARY KEY(id)
    );
  `, []);

  await client.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL,
      identifier VARCHAR,
      name VARCHAR,
      link VARCHAR UNIQUE,
      raw VARCHAR,
      PRIMARY KEY (id)
    );
  `, []);

  await client.query(`
    CREATE TABLE IF NOT EXISTS class (
      id SERIAL,
      raw VARCHAR,
      module_id INT,
      start VARCHAR,
      finish VARCHAR,
      date DATE,
      PRIMARY KEY (id),
      UNIQUE (date, start, module_id)
    );
  `, []);

  await client.query(`
    CREATE TABLE IF NOT EXISTS class_staff (
      staff_id INT,
      class_id INT,
      PRIMARY KEY (staff_id, class_id),
      UNIQUE (staff_id, class_id)
    );
  `, []);

  await client.query(`
    CREATE TABLE IF NOT EXISTS class_rooms (
      room_id INT,
      class_id INT,
      PRIMARY KEY (room_id, class_id),
      UNIQUE (room_id, class_id)
    )
  `, []);

  await client.query(`
    CREATE TABLE IF NOT EXISTS class_groups (
      group_id INT,
      class_id INT,
      PRIMARY KEY (group_id, class_id),
      UNIQUE (group_id, class_id)
    )
  `, []);
}

async function add(args, table) {
  var keys = Object.keys(args).join(",");
  var values = Object.values(args);
  var params = values.map((value, i) => {
    return `$${i+1}`
  })

  await client.query(`
    INSERT INTO ${table} (${keys})
      VALUES (${params.join(",")})
        ON CONFLICT (link) DO NOTHING;
  `, [...values])
}

async function get(table, options) {
  var select = "*";
  var where = "TRUE"
  if (options != undefined) {
    if (options.select != undefined) {
      select = options.select
    }
    if (options.where != undefined) {
      where = options.where
    }
  }
  const response =  await client.query(`
    SELECT ${select} FROM ${table}
      WHERE ${where};
  `, []);

  return response.rows;
}

async function addStaff(args) {
  // Add staff member if not exists
  await add(args, "staff")
}

async function addModule(args) {
  // Add module if not exists
  await add(args, "modules")
}

async function addRoom(args) {
  await add(args, "rooms")
}

async function addGroup(args) {
  await add(args, "groups")
}

async function addClassX(table, type_id, arr, class_id) {
  await arr.forEach(async (x_id) => {
    await client.query(`
      INSERT INTO ${table} (
        ${type_id}, class_id
      ) VALUES ($1, $2)
          ON CONFLICT (${type_id}, class_id) DO NOTHING;
    `, [x_id, class_id])
  });
}

async function addClassRooms(rooms, class_id) {
  await addClassX("class_rooms", "room_id", rooms, class_id)
}

async function addClassStaff(staff, class_id) {
  await addClassX("class_staff", "staff_id", staff, class_id)
}

async function addClassGroups(groups, class_id) {
  await addClassX("class_groups", "group_id", groups, class_id)
}

async function addClass(args) {
  var class_ = await client.query(`
    INSERT INTO class (
      raw, module_id, start, finish, date
    ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (date, start, module_id) 
        DO NOTHING
          RETURNING id
  `, [args.raw, args.module_id, args.start, args.finish, args.date]);
  
  class_ = class_.rows[0]

  // If class_ is undefined then its already added
  if (class_ != undefined) {
    if (args.rooms) {
      await addClassRooms(args.rooms, class_.id);
    }
    if (args.staff) {
      await addClassStaff(args.staff, class_.id);
    }
    if (args.groups) {
      await addClassGroups(args.groups, class_.id);
    }
  }

}

async function getClasses(group_id) {

  var classes = await client.query(`
    SELECT id, start, finish, date, module_id, raw FROM class
      WHERE id = ANY(
        SELECT class_id FROM class_groups
          WHERE group_id=$1
      )
  `, [group_id]);

  
  for (let i = 0; i < classes.rows.length; i++) {
    const class_ = classes.rows[i];
    classes.rows[i].rooms = [];
    classes.rows[i].groups = [];
    classes.rows[i].staff = [];

    var module = await client.query(`
      SELECT id, identifier, name FROM modules
        WHERE id=$1
    `, [class_.module_id])
    classes.rows[i].module = module.rows[0];
    delete classes.rows[i].module_id;

    // Get class rooms
    var class_rooms = await client.query(`
      SELECT * FROM class_rooms
        WHERE class_id=$1
    `, [class_.id]);

    for (let j = 0; j < class_rooms.rows.length; j++) {
      const room_id = class_rooms.rows[j].room_id;
      var room = await client.query(`
        SELECT id, identifier, name FROM rooms
          WHERE id=$1
      `, [room_id]);

      classes.rows[i].rooms.push(room.rows[0]);
    }

    // Get class groups
    var class_groups = await client.query(`
      SELECT * FROM class_groups
        WHERE class_id=$1
    `, [class_.id]);

    for (let j = 0; j < class_groups.rows.length; j++) {
      const group_id = class_groups.rows[j].group_id;
      var group = await client.query(`
        SELECT id, identifier, name FROM groups
          WHERE id=$1
      `, [group_id]);

      classes.rows[i].groups.push(group.rows[0]);
    }

    // Get class staff
    var class_staff = await client.query(`
      SELECT * FROM class_staff
        WHERE class_id=$1
    `, [class_.id]);

    for (let j = 0; j < class_staff.rows.length; j++) {
      const staff_id = class_staff.rows[j].staff_id;
      var staff = await client.query(`
        SELECT id, first, last, tag FROM staff
          WHERE id=$1
      `, [staff_id]);

      classes.rows[i].staff.push(staff.rows[0]);
    }
  }

  return classes.rows;
}

async function getGroups() {
  return await get("groups")
}

async function getStaff() {
  return await get("staff")
}

async function getModules(options) {
  return await get("modules", options)
}

async function getRooms() {
  return await get("rooms")
}

async function getPDFs() {
  const PDFs = await client.query(`
    SELECT link from groups
  `, []);

  return PDFs.rows
}

module.exports = {
  init,
  addStaff,
  addModule,
  addRoom,
  addGroup,
  addClass,
  getClasses,
  getGroups,
  getModules,
  getRooms,
  getStaff,
  getPDFs
};