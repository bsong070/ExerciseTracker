const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const mongodb = require('mongodb');
const bodyParser = require('body-parser');
const { MongoServerSelectionError } = require('mongodb');
mongoose.set('useFindAndModify', false);


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser:true, useUnifiedTopology: true})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

let exerciseSessionSchema = new mongoose.Schema({
  description: {type:String, required: true},
  duration: {type:Number, required:true},
  date: String
})

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema] //tells mongodb to expect exercise sessions
})

let Session = mongoose.model('Session', exerciseSessionSchema)
let User = mongoose.model('User', userSchema)


app.post('/api/exercise/new-user', bodyParser.urlencoded({extended:false}), (request,response)=>{ // body parser url encoder function to capture data from form
  console.log(request.body)
  let newUser = new User({username: request.body.username})
  newUser.save((error, savedUser) => {
    if(!error){
      let responseObject = {}
      responseObject['username'] = savedUser.username
      responseObject['_id'] = savedUser.id //mongodb saves in field called id
      response.json(responseObject)
    }
  })
})

app.get('/api/exercise/users', (request,response)=>{
  User.find({}, (error,arrayOfUsers)=>{
    if (!error) {
      response.json(arrayOfUsers)
    }
  })
})

app.post('/api/exercise/add', bodyParser.urlencoded({extended:false}), (request, response)=>{
  
  let newSession = new Session({
    description: request.body.description,
    duration: parseInt(request.body.duration),
    date: request.body.date
  })

  if (newSession.date === ''){
    newSession.date = new Date().toISOString().substring(0,10)
  }

  User.findByIdAndUpdate(
    request.body.userId,
    {$push : {log: newSession}}, //$push will add item to array for mongodb
    {new: true},
    (error, updatedUser) => {
      if(!error){
        let responseObject = {}
        responseObject['_id'] = updatedUser.id
        responseObject['username'] = updatedUser.username
        responseObject['date'] = new Date(newSession.date).toDateString()
        responseObject['description'] = newSession.description
        responseObject['duration'] = newSession.duration
        response.json(responseObject)
    }
  })
})

app.get('/api/exercise/log', (request, response)=>{
  
  User.findById(request.query.userId, (error,result)=>{
    if(!error){
      let responseObject = result

      if(request.query.from || request.query.to){
        let fromDate = newDate(0) // from jan 1 1970 , the lowest date
        let toDate = newDate()

        if(request.query.from){
          fromDate = newDate(request.query.from)
        }

        if(request.query.to){
          toDate = newDate(request.query.to)
        }

        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        responseObject.log = responseObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()

          return sessionDate >= fromDate && sessionDate <= toDate
        })
      }

      if(request.query.limit){
        responseObject.log = responseObject.log.slice(0,request.query.limit)
      }

      responseObject = responseObject.toJSON() //makes responseObject modifiable
      responseObject['count'] = result.log.length
      response.json(responseObject)
    }
  })
})