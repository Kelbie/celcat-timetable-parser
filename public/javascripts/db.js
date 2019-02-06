const  async = require("async");
const { Client } = require('pg')
const client = new Client({
})

client.connect()

async function addStaff (args) {
  // Add staff member if not exists

  var keys = Object.keys(args).join(",");
  var values = Object.values(args);
  var params = values.map((value, i) => {
    return `$${i+1}`
  })

  await client.query(`
    INSERT INTO staff (${keys})
      VALUES (${params.join(",")})
        ON CONFLICT (link) DO NOTHING;
  `, [...values])
}

module.exports.addStaff = addStaff;