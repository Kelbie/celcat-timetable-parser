const  async = require("async");
const { Client } = require('pg')
const client = new Client({
})

client.connect()


function sanatize(str) {
  return str.replace(/'/g, `''`);
}

async function addStaff (args) {
  // Add staff member if not exists

  

  var keys = Object.keys(args).join(",");
  var values = Object.values(args);
  var params = values.map((value, i) => {
    return `$${i+1}`
  })

  const command = `
    INSERT INTO staff (${keys})
      VALUES (${params.join(",")})
      on conflict (link) do nothing;
  `

  await client.query(command, [...values])
}

module.exports.addStaff = addStaff;