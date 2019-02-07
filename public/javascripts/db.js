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
      group_id INT,
      module_id INT,
      start VARCHAR,
      finish VARCHAR,
      date VARCHAR,
      PRIMARY KEY (id),
      UNIQUE (date, start)
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

async function get(table) {
  const response =  await client.query(`
    SELECT * FROM ${table};
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

async function addClass(args) {
  var class_ = await client.query(`
    INSERT INTO class (
      raw, module_id, group_id, start, finish, date
    ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (start, date) DO UPDATE 
          SET id = class.id
            RETURNING id
  `, [args.raw, args.module_id, args.group_id, args.start, args.finish, args.date]);
  
  class_ = class_.rows[0]

  if (args.rooms) {
    await addClassRooms(args.rooms, class_.id);
  }
  if (args.staff) {
    await addClassStaff(args.staff, class_.id);
  }
}

async function getGroups() {
  return await get("groups")
}

async function getStaff() {
  return await get("staff")
}

async function getModules() {
  return await get("modules")
}

async function getRooms() {
  return await get("rooms")
}

module.exports = {
  init,
  addStaff,
  addModule,
  addRoom,
  addGroup,
  addClass,
  getGroups,
  getModules,
  getRooms,
  getStaff
};