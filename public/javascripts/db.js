const  async = require("async");
const { Client } = require('pg')
const client = new Client({
})

client.connect()

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
      ) VALUES ($1, $2);
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
      raw, module_id, group_id
    ) VALUES ($1, $2, $3)
      RETURNING id;
  `, [args.raw, args.module_id, args.group_id]);
  
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