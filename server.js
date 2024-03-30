require('dotenv').config()
const path = require('path')

const express = require('express')
const cors = require('cors')
const PORT =  process.env.PORT ||  3005

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended :true }))




app.use('/api/users/', require('./api/users/apiUsers'))

app.get('/', (req, res) => {
    res.send({ connected: true })
})

app.listen(PORT, () => {
    console.log(`Server listenning on port ${PORT} !\n`)
})