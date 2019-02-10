# CELCAT Timetable API

# Endpoints
```
GET /classes/group/:group_id

{
  "link": "http://celcat.rgu.ac.uk/RGU_MAIN_TIMETABLE/g16737.pdf",
  "classes": [
    {
      "id" :9,
      "start": "11:00",
      "finish": "12:00",
      "date": "2019-02-04T00:00:00.000Z",
      "type": "Lecture",
      "rooms": [
        {
          "id": 62,
          "identifier": "H234",
          "name": "(147 cap L/T)",
          "building": "IGB"
        }
      ],
      "groups": [
        {
          "id": 296,
          "identifier": " CM3-CNMD",
          "name": "CM3 Computer Network Management & Design"
        }, ... ],
      "staff": [
        {
          "id": 973,
          "first": "Ian",
          "last": "Harris",
          "tag": null
        }, ... ],
      "module": {
        "id": 2265,
        "identifier": "CM3104",
        "name": "COMPUTER SECURITY AND CRYPTOGRAPHY - CM3104"
      }
    } ... ]
}

```

```
GET /modules

[
  {
    "id": 1,
    "identifier": "AA1001",
    "name": "DRAWING & VISUALISATION 1 - AA1001"
  }, ... ]
```

```
GET /modules/:id

{
  "id": 2359,
  "identifier": "CM4107",
  "name": "ADVANCED ARTIFICIAL INTELLIGENCE - CM4107"
}
```

```
GET /modules/count

{
  "count": 4521
}
```

```
GET /staff/count

{
  "count": 2684
}
```

```
GET /groups/count

{
  "count": 679
}
```

```
GET /rooms/count

{
  "count": 203
}
```