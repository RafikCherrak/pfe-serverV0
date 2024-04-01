require('dotenv').config()
const path = require('path')

const express = require('express')
const cors = require('cors')
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json())

app.use(express.urlencoded({ extended: true }))

// Restauration routes
app.use('/api/ingredients/', require('./api/restauration/apiIngredients'))
app.use('/api/plats/', require('./api/restauration/apiPlats'))
app.use('/api/desserts/', require('./api/restauration/apiDesserts'))
app.use('/api/menus/', require('./api/restauration/apiMenus'))
app.use('/api/restaurants/', require('./api/restauration/apiRestaurants'))

// CampusResidences routes
app.use('/api/campus/', require('./api/campusResidences/apiCampus'))
app.use('/api/residences/', require('./api/campusResidences/apiResidences'))

// Hebergements routes
app.use('/api/dossiers/', require('./api/hebergements/apiDossiers'))

// Transport routes
app.use('/api/bus/', require('./api/transport/apiBus'))
app.use('/api/trajets/', require('./api/transport/apiTrajets'))

// Bourses routes
app.use('/api/bourses/', require('./api/bourses/apiBourses'))

// Auth routes
app.use('/api/auth/', require('./api/auth/apiAuth'))

// Users routes
app.use('/api/users/', require('./api/users/apiUsers'))

// File routes
app.get('/api/hebergements/images/:id_dossier/:image_name', (req, res) => {
    const { id_dossier, image_name } = req.params
    res.sendFile(path.join(__dirname, `/api/hebergements/images/${id_dossier}/${image_name}`))
})
app.get('/api/bourses/images/:id_dossier_b/:image_name', (req, res) => {
    const { id_dossier_b, image_name } = req.params
    res.sendFile(path.join(__dirname, `/api/bourses/images/${id_dossier_b}/${image_name}`))
})

app.get('/', (req, res) => {
    res.send({ connected: true })
})

app.listen(PORT, () => {
    console.log(`Server listenning on port ${PORT} !\n`)
})
