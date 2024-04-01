const express = require('express')
const db = require('../database')
let router = express.Router()

const uuid = require('uuid')

router.get('/', async (req, res) => {
db('restaurants')
.select('restaurants.id_restaurant', 'restaurants.nom', 'restaurants.id_camp_res')
.leftJoin('camp_res', 'restaurants.id_camp_res', 'camp_res.id_camp_res')
.orderBy('restaurants.nom')
.then((r)=> {
    res.send({data:r})
} )
.catch((err) =>{
    console.log(err)
    res.send({error :"Error"})
} )
})

router.post('/', async (req,res)=> {
    const data = req.body.newRestaurant
    const id_restaurant =uuid.v4()

    const exsiting_restaurant = await db('restaurant').select('nom').where({ nom: data.nom })

    if (existing_restaurant.length === 0) {
        await db('restaurants')
            .insert({ id_restaurant, ...data })
            .then((r) => {
                res.send({ insert: true })
            })
            .catch((err) => {
                console.log(err)
                res.send({ insert: false })
            })
    } else {
        res.send({ insert: false })
    }
})

router.put('/', async (req, res) => {
    const data = req.body.newRestaurant

    await db('restaurants')
        .update({ nom: data.nom, id_camp_res: data.id_camp_res })
        .where({ id_restaurant: data.id_restaurant })
        .then((r) => {
            res.send({ update: true })
        })
        .catch((err) => {
            console.log(err)
            res.send({ update: false })
        })
})

router.delete('/:id_restaurant', async (req, res) => {
    const id = req.params.id_restaurant

    await db('restaurants')
        .where('id_restaurant', id)
        .del()
        .then((r) => {
            res.send({ deleted: true })
        })
        .catch((err) => {
            res.send({ deleted: false })
        })
})

module.exports = router
