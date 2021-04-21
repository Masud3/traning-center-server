const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const fileUpload = require('express-fileupload');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config()




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o08lr.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;


const app = express()

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('trainers'));
app.use(fileUpload());

const port = 5000;

app.get('/', (req, res) => {
    res.send('hello from db its working working')
})

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const appointmentCollection = client.db("trainingCenter").collection("appointments");
    const trainerCollection = client.db("trainingCenter").collection("trainers");

    app.post('/addAppointment', (req, res) => {
        const appointment = req.body;
        appointmentCollection.insertOne(appointment)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    });

    app.get('/appointments', (req, res) => {
        appointmentCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.post('/appointmentByDate', (req, res) => {
        const date = req.body;
        const email = req.body.email;
        trainerCollection.find({ email: email })
            .toArray((err, trainers) => {
                const filter = { date: date.date }
                if (trainers.length === 0) {
                    filter.email = email;
                }
                appointmentCollection.find(filter)
                    .toArray((err, documents) => {
                        console.log(email, date.date, trainers, documents)
                        res.send(documents)
                    })
            })
    })

    app.post('/addTrainer', (req, res) => {
        const file = req.files.file;
        const name = req.body.name;
        const email = req.body.email;
        const filePath = `${__dirname}/trainers/${file.name}`;
        file.mv(filePath, err => {
            if (err) {
                console.log(err);
                 res.status(500).send({ msg: 'File to upload image' })
            }
            const newImg = fs.readFileSync(filePath);
            const encImg = newImg.toString('base64');

            var image = {
                contentType: req.files.file.mimetype,
                size: req.files.file.size,
                img: Buffer.from(encImg, 'base64')
            };

            trainerCollection.insertOne({ name, email, image})
                .then(result => {
                    fs.remove(filePath, error =>{
                        if(error){
                            console.log(error)
                            res.status(500).send({ msg: 'Failed to upload image' })
                        }
                        res.send(result.insertedCount > 0);
                    })
                   
                })
        })
   
    });

    app.get('/trainers', (req, res) => {
        trainerCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    });

    app.post('/isTrainer', (req, res) => {
        const email = req.body.email;
        trainerCollection.find({ email: email })
            .toArray((err, trainers) => {
                res.send(trainers.length > 0);
            })
    })


});

app.listen(process.env.PORT || port)