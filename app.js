var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');
// const schema = require("./graphql/schema/index");
// const resolvers = require("./graphql/resolvers/index");

var indexRouter = require('./routes/index');

var app = express();


// Construct a schema, using GraphQL schema language
// var schema = buildSchema(`
//   type Group {
//     id: String!,
//     name: String!,
//     link: String!
//   }

//   type Module {
//     id: String!,
//     name: String!,
//     link: String!
//   }

//   type Room {
//     id: String!,
//     name: String!,
//     building: String!,
//     link: String!
//   }

//   type Staff {
//     title: String,
//     position: String,
//     telephone: String,
//     email: String,

//     firstName: String!,
//     surname: String!,
//     tag: String,
//     link: String!
//   }

//   type Class {
//     start: String!,
//     end: String!,
//     type: String!,
    
//     rooms: [Room]!,
//     groups: [Group]!,
//     staff: [Staff]!,
//     module: Module!
//   }

//   type Query {
//     classes(): [Class]!
//   }
// `);

// The root provides a resolver function for each API endpoint
// var resolvers = {
//   classes: () => {
//     return [{
//       start: "",
//       end: "",
//       type: "",
//       rooms: [
//         {
//           id: "",
//           name: "",
//           building: "",
//           link: ""
//         }
//       ],
//       groups: [
//         {
//           id: "",
//           name: "",
//           link: ""
//         }
//       ],
//       staff: [
//         {
//           title: "",
//           position: "",
//           telephone: "",
//           email: "",

//           firstName: "",
//           surname: "",
//           tag: "",
//           link: ""
//         }
//       ],
//       module: {
//         id: "",
//         name: "",
//         link: ""
//       }
//     }]
//   }
// };

// app.use(
//   '/graphql',
//   graphqlHTTP({
//     schema: schema,
//     rootValue: resolvers,
//     graphiql: true,
//   }),
// );

app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
