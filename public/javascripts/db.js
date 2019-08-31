const  async = require("async");
const { Client } = require('pg')

// Docker should make sure that postgres is running before allowing node to connect
const client = new Client({
  database: process.env.DB_NAME || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

client.connect()

async function init() {

  console.log("Initializing Database...");

  // create staff table
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

  // create rooms table
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

  // create modules table
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

  // create groups table
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

  // create class table
  await client.query(`
    CREATE TABLE IF NOT EXISTS class (
      id SERIAL,
      raw VARCHAR,
      module_id INT,
      start timestamp,
      finish timestamp,
      type VARCHAR,
      PRIMARY KEY (id),
      UNIQUE (start, module_id)
    );
  `, []);

  // create table that maps staff to classes
  await client.query(`
    CREATE TABLE IF NOT EXISTS class_staff (
      staff_id INT,
      class_id INT,
      PRIMARY KEY (staff_id, class_id),
      UNIQUE (staff_id, class_id)
    );
  `, []);

  // create table that maps rooms to classes
  await client.query(`
    CREATE TABLE IF NOT EXISTS class_rooms (
      room_id INT,
      class_id INT,
      PRIMARY KEY (room_id, class_id),
      UNIQUE (room_id, class_id)
    )
  `, []);

  // create table that maps groups to classes
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
        raw, module_id, start, finish, type
      ) VALUES ($1, $2, to_timestamp($3), to_timestamp($4), $5)
      ON CONFLICT (module_id, start) DO NOTHING
        RETURNING id;
    `, [args.raw, args.module_id, args.start, args.finish, args.type]);

  
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

async function getClassesByX(table, id, id_value, date) {
  console.log(date);
  if (table == null) {
    var classes = await client.query(`
      SELECT id, start, finish, module_id, type FROM class
        WHERE start::date = date '${date}';
    `, []);
  } else {
    var classes = await client.query(`
      SELECT id, start, finish, module_id, type FROM class
        WHERE id = ANY(
          SELECT class_id FROM class_${table}
            WHERE ${id}=$1
        ) AND start::date = date '${date}'
    `, [id_value]);
    console.log(`SELECT id, start, finish, module_id, type FROM class
    WHERE id = ANY(
      SELECT class_id FROM class_${table}
        WHERE ${id}=$1
    ) AND start::date = date '${date}'`);

    var link = await client.query(`
      SELECT link FROM ${table}
        WHERE id=$1
    `, [id_value]);

    link = link.rows[0].link
  }
  
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
        SELECT id, identifier, name, building FROM rooms
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

  return {link: `http://celcat.rgu.ac.uk/RGU_MAIN_TIMETABLE/${link}`, classes: classes.rows};
}

async function getClasses() {
  return await getClassesByX(null, null, null, null);
}

async function getClassesByGroup(group_id, date) {
  return await getClassesByX("groups", "group_id", group_id, date)
}

async function getClassesByRoom(room_id, date) {
  return await getClassesByX("rooms", "room_id", room_id, date)
}

async function getClassesByStaff(staff_id, date) {
  return await getClassesByX("staff", "staff_id", staff_id, date)
}

async function getGroups(options) {
  return await get("groups", options)
}

async function getStaff(options) {
  return await get("staff", options)
}

async function getModules(options) {
  return await get("modules", options)
}

async function getRooms(options) {
  return await get("rooms", options)
}

async function getPDFs() {
  const PDFs = await client.query(`
    SELECT link from groups
  `, []);

  return PDFs.rows
}

async function getGroupPDF(id) {
  const PDFs = await client.query(`
    SELECT link from groups
      WHERE id=$1
  `, [id]);

  return PDFs.rows
}

async function countX(table) {
  const command = `
    SELECT COUNT(*) FROM ${table}
  `

  const count = await client.query(
    command, []);

  count.rows[0].count = parseInt(count.rows[0].count)

  return count.rows[0];
}

async function countGroups() {
  const count = await countX("groups");

  return count;
}

async function countRooms() {
  const count = await countX("rooms");

  return count;
}

async function countModules() {
  const count = await countX("modules");

  return count;
}

async function countStaff() {
  const count = await countX("staff");

  return count;
}

async function getClassByID(id) {
  var class_details = await client.query(`
    SELECT * FROM class
      WHERE id=$1
  `, [id]);

  class_details.rows[0].rooms = [];
  class_details.rows[0].groups = [];
  class_details.rows[0].staff = [];

  var module = await client.query(`
    SELECT * FROM modules
      WHERE id=$1
  `, [class_details.rows[0].module_id])
  class_details.rows[0].module = module.rows[0];

  // Get class rooms
  var class_rooms = await client.query(`
    SELECT * FROM class_rooms
      WHERE class_id=$1
  `, [id]);

  for (let j = 0; j < class_rooms.rows.length; j++) {
    const room_id = class_rooms.rows[j].room_id;
    var room = await client.query(`
      SELECT id, identifier, name, building FROM rooms
        WHERE id=$1
    `, [room_id]);

    class_details.rows[0].rooms.push(room.rows[0]);
  }

  // Get staff
  var class_staff = await client.query(`
    SELECT * FROM class_staff
      WHERE class_id=$1
  `, [id]);

  for (let j = 0; j < class_staff.rows.length; j++) {
    const staff_id = class_staff.rows[j].staff_id;
    var staff = await client.query(`
      SELECT * FROM staff
        WHERE id=$1
    `, [staff_id]);

    class_details.rows[0].staff.push(staff.rows[0]);
  }

  // Get groups
  var class_groups = await client.query(`
    SELECT * FROM class_groups
      WHERE class_id=$1
  `, [id]);

  for (let j = 0; j < class_groups.rows.length; j++) {
    const group_id = class_groups.rows[j].group_id;
    var group = await client.query(`
      SELECT * FROM groups
        WHERE id=$1
    `, [group_id]);

    class_details.rows[0].groups.push(group.rows[0]);
  }

  return class_details.rows[0]
}

module.exports = {
  init,
  addStaff,
  addModule,
  addRoom,
  addGroup,
  addClass,
  getClasses,
  getClassByID,
  getClassesByRoom,
  getClassesByGroup,
  getClassesByStaff,
  getGroups,
  getModules,
  getRooms,
  getStaff,
  getPDFs,
  getGroupPDF,
  countGroups,
  countModules,
  countRooms,
  countStaff
};
