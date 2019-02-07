# CELCAT PDF 2 JSON

# Output Structure

All data structures should contain a raw <String> version incase there are edge-cases I haven't considered.

    [
      {
        "classes": [
          "raw": <String>,
          "staff": [
            {
              "first": <String>,
              "last": <String>,
              "tag": <String | Void>
              "raw": <String>
            }
          ]
          "rooms": [
            {
              "id": <String>,
              "name": <String>,
              "building": <String>,
              "raw": <String>
            }, ...
          ],
          "group": <String>,
          "module": {
            "id": <String>,
            "name": <String>,
            "raw": <String>
          }
        ]
      }
    ]

# Output Example:

    [
      {
        "classes": [
          {
            "raw": "\nTeaching- Laboratory/Practical, 09:00-12:00\nN528 (PG IT Lab - 30 cap) - SIWB; N529(PG IT Lab - 30 cap) - SIWB\nCMPG - DS; CMPG-CS (Sep); CMPG-CY (Jan19); CMPG-CY (Sep); CMPG-DS (Jan 19)\nCMM507 (PROFESSIONAL DEVELOPMENTAND RESEARCH SKILLS - CMM507)\nElyan, Eyad\n482021",
            "staff": [{ "first": "Eyad", "last": "Elyan", "raw": "Elyan, Eyad" }],
            "rooms": [
              {
                "id": "N528",
                "name": "(PG IT Lab - 30 cap)",
                "building": "SIWB",
                "raw": "N528 (PG IT Lab - 30 cap) - SIWB"
              },
              {
                "id": "N529",
                "name": "(PG IT Lab - 30 cap)",
                "building": "SIWB",
                "raw": "N529 (PG IT Lab - 30 cap) - SIWB"
              }
            ],
            "group": "CMPG Data Science, CMPG - DS",
            "module": {
              "id": "CMM507",
              "name": "PROFESSIONAL DEVELOPMENT AND RESEARCH SKILLS - CMM507",
              "raw": "CMM507, PROFESSIONAL DEVELOPMENT AND RESEARCH SKILLS - CMM507"
            }
          },
          {
            "raw": "\nTeaching- Laboratory/Practical,14:00-16:00\nN528 (PG IT Lab - 30 cap) -SIWB; N529 (PG IT Lab - 30\ncap) - SIWB; N533 (FY ITLab - 116 cap) - SIWB\nCM2-CS; CM2-CY; CM2-DMCM3-ASD; CM3-DM DE\nCM2104 (DYNAMIC WEBDEVELOPMENT - CM2104)\nAnkrah, Reginald; Henderson,Cara; Isaacs, John; Moir,\nChristina; Savoye, Yann\n401022\n150\nMonday04/02/2019",
            "staff": [
              { "first": "Reginald", "last": "Ankrah", "raw": "Ankrah, Reginald" },
              { "first": "Cara", "last": "Henderson", "raw": "Henderson, Cara" },
              { "first": "John", "last": "Isaacs", "raw": "Isaacs, John" },
              { "first": "Christina", "last": "Moir", "raw": "Moir, Christina" },
              { "first": "Yann", "last": "Savoye", "raw": "Savoye, Yann" }
            ],
            "rooms": [
              {
                "id": "N528",
                "name": "(PG IT Lab - 30 cap)",
                "building": "SIWB",
                "raw": "N528 (PG IT Lab - 30 cap) - SIWB"
              },
              {
                "id": "N529",
                "name": "(PG IT Lab - 30 cap)",
                "building": "SIWB",
                "raw": "N529 (PG IT Lab - 30 cap) - SIWB"
              },
              {
                "id": "N533",
                "name": "(FY IT Lab - 116 cap)",
                "building": "SIWB",
                "raw": "N533 (FY IT Lab - 116 cap) - SIWB"
              }
            ],
            "group": "CM3 Digital Media (Direct Entry), CM3-DM DE",
            "module": {
              "id": "CM2104",
              "name": "DYNAMIC WEB DEVELOPMENT - CM2104",
              "raw": "CM2104, DYNAMIC WEB DEVELOPMENT - CM2104"
            }
          }
        ],
        "date": "04/02/2019",
        "day": "Monday"
      },

# Limitations

Currently only gets the type "Teaching- Laboratory/Practical" as defined by CELCAT. Other classes will be skipped.

You have to download the PDF manually (for now).

# Usage

Put a PDF file in `/public` then alter the path in `/routes/pdf2txt.js`

# Postgres

## Staff

    CREATE TABLE staff (
      id SERIAL, 
      first VARCHAR, 
      last VARCHAR, 
      raw VARCHAR, 
      link VARCHAR UNIQUE, 
      tag VARCHAR, 
      PRIMARY KEY (id)
    );

## Room

    CREATE TABLE rooms (
      id SERIAL,
      identifier VARCHAR,
      raw VARCHAR,
      name VARCHAR,
      building VARCHAR,
      link VARCHAR UNIQUE,
      PRIMARY KEY (id)
    );

## Modules

    CREATE TABLE modules (
      id SERIAL, 
      identifier VARCHAR, 
      raw VARCHAR, 
      name VARCHAR, 
      link VARCHAR UNIQUE, 
      PRIMARY KEY(id)
    );

## Groups

    CREATE TABLE groups (
      id SERIAL,
      identifier VARCHAR,
      name VARCHAR,
      link VARCHAR UNIQUE,
      raw VARCHAR,
      PRIMARY KEY (id)
    );

## Class

`start` could probably be considered unique if it a unix timestamp of the time the class starts since I don't think multiple classes can start simultaneously.

    CREATE TABLE class (
      id SERIAL,
      raw VARCHAR,
      group_id INT,
      module_id INT,
      start BIGINT UNIQUE,
      end BIGINT
      PRIMARY KEY (id)
    );

Many to many for `staff` and `groups` since a staff member can have many classes and a class can have many staff members. The same applies for groups.

## Class_Staff

    CREATE TABLE class_staff (
      staff_id INT,
      class_id INT,
      PRIMARY KEY (staff_id, class_id)
    );
## Class_Rooms

    CREATE TABLE class_rooms (
      room_id INT,
      class_id INT,
      PRIMARY KEY (room_id, class_id)
    )