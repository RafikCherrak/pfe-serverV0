const express = require('express')
const db = require('../database')
let router = express.Router()

const uuid = require('uuid')
const { sumBy } = require('lodash')

// Endpoints :
// GET : /api/plats/ : Liste des plats
// POST : /api/plats/ : Ajouter plat
// PUT : /api/plats/ : Modifier plat
// DELETE (POST REQ) : /api/plats/delete : Supprimer plat(s)

router.get('/', async (req, res) => {
    let plats = []
    try {
        plats = await db('plats').select('*').orderBy('nom')
    } catch (err) {
        console.log(err)
        res.send({ error: 'Error retrieving dishs' })
    }

    const result = []
    Promise.all(
        plats.map(async (e) => {
            let ingredients = []
            try {
                ingredients = await db('ingredients_plat')
                    .select('ingredients.nom', 'ingredients.prix', 'ingredients.id_ingredient', 'ingredients_plat.quantite')
                    .where({ 'ingredients_plat.id_plat': e.id_plat })
                    .leftJoin('ingredients', 'ingredients.id_ingredient', 'ingredients_plat.id_ingredient')
            } catch (err) {
                console.log(err)
                res.send({ error: 'Error retrieving dishs' })
            }

            const prixTotal = sumBy(ingredients, (o) => parseFloat(o.prix) * parseFloat(o.quantite))

            result.push({
                ...e,
                category: 'plats',
                prix: prixTotal,
                ingredients: ingredients,
            })
        })
    )
        .then((r) => {
            res.send({ data: result })
        })
        .catch((err) => {
            console.log(err)
            res.send({ error: 'Error retrieving dishs' })
        })
})

router.post('/', async (req, res) => {
    const data = req.body.newPlat
    const id_plat = uuid.v4()

    const existing_plat = await db('plats').select('nom').where({ nom: data.nom })

    if (existing_plat.length === 0) {
        db('plats')
            .insert({ id_plat, nom: data.nom, description: data.description })
            .then((r) => {
                db.transaction((trx) => {
                    const queries = []

                    data.ingredients.map((elem) => {
                        const query = db('ingredients_plat').insert({ id_plat: id_plat, id_ingredient: elem.id_ingredient, quantite: elem.quantite }).transacting(trx)
                        queries.push(query)
                    })

                    Promise.all(queries)
                        .then((resp) => {
                            trx.commit()
                            res.send({ insert: true })
                        })
                        .catch((err) => {
                            console.log(err)
                            trx.rollback()
                            res.send({ insert: false })
                        })
                })
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
    const data = req.body.newPlat

    db.transaction((trx) => {
        const queries = [
            db('plats').where({ id_plat: data.id_plat }).update({ nom: data.nom, description: data.description }).transacting(trx),
            db('ingredients_plat').where('id_plat', data.id_plat).del().transacting(trx),
        ]

        data.ingredients.map((elem) => {
            const query = db('ingredients_plat').insert({ id_plat: data.id_plat, id_ingredient: elem.id_ingredient, quantite: elem.quantite }).transacting(trx)
            queries.push(query)
        })

        Promise.all(queries)
            .then((resp) => {
                trx.commit()
                res.status(200).send({ update: true })
            })
            .catch((err) => {
                console.log(err)
                trx.rollback()
                res.send({ update: false })
            })
    })
})

router.delete('/:id_plat', (req, res) => {
    const id_plat = req.params.id_plat

    db.transaction((trx) => {
        const queries = [db('ingredients_plat').where('id_plat', id_plat).del().transacting(trx), db('plats').where('id_plat', id_plat).del().transacting(trx)]

        Promise.all(queries)
            .then((resp) => {
                trx.commit()
                res.status(200).send({ delete: true })
            })
            .catch((err) => {
                console.log(err)
                trx.rollback()
                res.send({ delete: false })
            })
    })
})

module.exports = router
