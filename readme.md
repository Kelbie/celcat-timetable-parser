# CELCAT Timetable API

# Installation

**Install Postgres:**

- [Ubuntu 16.04](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04)

**Install Celcat Timetable Parser:**

    git clone https://github.com/KevinKelbie/celcat-timetable-parser
    cd celcat-timetable-parser
    npm install

**Add Webpublisher link to config:**

In order to use this API you must have access to a CELCAT webpublisher and put the link in the `public/json/config.json` file in order for the API to scrape the modules, groups, staff, and rooms.

**Running it:**

Development:

    npm run dev

Production (WARNING will download EVERY pdf from the webpublisher)

    npm start

# Endpoints
`GET /classes/group/:group_id`

`GET /classes/staff/:staff_id`

`GET /classes/room/:room_id`

`GET /modules`

`GET /groups`

`GET /staff`

`GET /rooms`

`GET /modules/:module_id`

`GET /groups/:group_id`

`GET /staff/:staff_id`

`GET /rooms/:room_id`

`GET /modules/count`

`GET /staff/count`

`GET /groups/count`

`GET /rooms/count`