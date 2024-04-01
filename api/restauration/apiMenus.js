const express = require('express')
let router = express.Router()

const db = require('../database')

const { RRule } = require('rrule')
const { flattenDeep, filter, sumBy, chain, mergeWith, groupBy } = require('lodash')
const uuid = require('uuid')
const moment = require('moment')

// Endpoints :
// GET : /api/menus/ : Liste des menus
// POST : /api/menus/ : Ajouter menu
// PUT : /api/menus/ : Modifier menu
// DELETE (POST REQ) : /api/menus/delete : Supprimer menu(s)

router.get('/:date/:resto', async (req, res) => {
    const dateStart = moment(req.params.date).startOf('month')
    const dateEnd = moment(req.params.date).endOf('month')

    const resto = req.params.resto

    if (resto === 'null') {
        res.send({ data: [] })
        return null
    }

    let result = []
    try {
        result = await db('menus')
            .select(
                'menus.id_menu',
                'menus.id_plat_un',
                'menus.id_plat_deux',
                'menus.id_dessert_un',
                'menus.id_dessert_deux',
                'menus.start',
                'menus.end',
                'menus.recurring',
                'menus.until',
                'menus.interval',
                'menus.freq',
                'menus.title',
                'menus.id_restaurant',
                'dessert_un.prix as prix_dessert_un',
                'dessert_un.nom as nom_dessert_un',
                'dessert_deux.prix as prix_dessert_deux',
                'dessert_deux.nom as nom_dessert_deux'
            )
            .where('id_restaurant', resto)
            .leftJoin('desserts as dessert_un', 'menus.id_dessert_un', 'dessert_un.id_dessert')
            .leftJoin('desserts as dessert_deux', 'menus.id_dessert_deux', 'dessert_deux.id_dessert')
    } catch (err) {
        console.log(err)
        res.send({ error: 'Error retrieving dishs' })
    }

    const data = []
    Promise.all(
        result.map(async (e) => {
            let ingredients_plats = []
            try {
                ingredients_plats = await db('ingredients_plat')
                    .select('ingredients.nom', 'ingredients.prix', 'ingredients.id_ingredient as id', 'ingredients_plat.quantite')
                    .where({ 'ingredients_plat.id_plat': e.id_plat_un })
                    .orWhere({ 'ingredients_plat.id_plat': e.id_plat_deux })
                    .leftJoin('ingredients', 'ingredients.id_ingredient', 'ingredients_plat.id_ingredient')
            } catch (err) {
                console.log(err)
                res.send({ error: 'Error retrieving data' })
            }

            const prixTotal = sumBy(ingredients_plats, (o) => parseFloat(o.prix) * parseFloat(o.quantite)) + parseFloat(e.prix_dessert_un) + parseFloat(e.prix_dessert_deux)

            if (ingredients_plats.length > 0)
                ingredients_plats = chain(ingredients_plats)
                    .groupBy('id')
                    .map((value) =>
                        mergeWith(...value, (o, s, key) => {
                            if (key === 'quantite') {
                                return parseInt(o) + parseInt(s)
                            } else {
                                return o
                            }
                        })
                    )
                    .value()

            data.push({
                ...e,
                ingredients_plats: ingredients_plats,
                prix_total: prixTotal,
            })
        })
    )
        .then((r) => {
            let entities = data.map((e) => {
                if (e.recurring) {
                    const rule = new RRule({
                        freq: e.freq,
                        dtstart: e.start,
                        until: e.until,
                        interval: e.interval,
                        wkst: RRule.SU,
                    }).all()

                    return rule.map((re) => {
                        if (re >= dateStart && re < dateEnd) {
                            return {
                                ...e,
                                is_child: true,
                                parent_id: e.id,
                                start: re,
                                end: re,
                                parent_start: e.start,
                                parent_end: e.end,
                            }
                        }
                    })
                } else {
                    if (e.start >= dateStart && e.start < dateEnd) return { ...e, is_child: false, parent_id: e.id }
                }
            })
            res.send({ data: filter(flattenDeep(entities), (o) => o !== undefined) })
        })
        .catch((err) => {
            console.log(err)
            res.send({ error: 'Error retrieving data' })
        })
})

router.post('/', async (req, res) => {
    const data = req.body.newMenu
    const id_menu = uuid.v4()

    const existing_menu = await db('menus').select('title').where({ title: data.title })

    if (existing_menu.length === 0) {
        await db('menus')
            .insert({
                id_menu,
                ...data,
            })
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
    const data = req.body.menu

    await db('menus')
        .update({
            id_plat_un: data.id_plat_un,
            id_plat_deux: data.id_plat_deux,
            id_dessert_un: data.id_dessert_un,
            id_dessert_deux: data.id_dessert_deux,
            start: data.start,
            end: data.end,
            recurring: data.recurring,
            until: data.until,
            interval: data.interval,
            freq: data.freq,
        })
        .where({ id_menu: data.id_menu })
        .then((r) => {
            res.send({ update: true })
        })
        .catch((err) => {
            console.log(err)
            res.send({ update: false })
        })
})

router.delete('/:id_menu', (req, res) => {
    const id = req.params.id_menu

    db('menus')
        .where('id_menu', id)
        .del()
        .then((r) => {
            res.send({ deleted: true })
        })
        .catch((err) => {
            res.send({ deleted: false })
        })
})

router.get('/details/:date/:resto', async (req, res) => {
    const dateStart = moment(req.params.date).startOf('month')
    const dateEnd = moment(req.params.date).endOf('month')

    const resto = req.params.resto

    if (resto === 'null') {
        res.send({ data: [] })
        return null
    }

    let result = []
    try {
        result = await db('menus')
            .select(
                'menus.id_plat_un',
                'menus.id_plat_deux',
                'menus.id_dessert_un',
                'menus.id_dessert_deux',
                'menus.start',
                'menus.end',
                'menus.recurring',
                'menus.until',
                'menus.interval',
                'menus.freq',
                'dessert_un.prix as prix_dessert_un',
                'dessert_un.nom as nom_dessert_un',
                'dessert_deux.prix as prix_dessert_deux',
                'dessert_deux.nom as nom_dessert_deux',
                'plat_un.nom as nom_plat_un',
                'plat_deux.nom as nom_plat_deux'
            )
            .where('id_restaurant', resto)
            .leftJoin('desserts as dessert_un', 'menus.id_dessert_un', 'dessert_un.id_dessert')
            .leftJoin('desserts as dessert_deux', 'menus.id_dessert_deux', 'dessert_deux.id_dessert')
            .leftJoin('plats as plat_un', 'menus.id_plat_un', 'plat_un.id_plat')
            .leftJoin('plats as plat_deux', 'menus.id_plat_deux', 'plat_deux.id_plat')
    } catch (err) {
        console.log(err)
        res.send({ error: 'Error retrieving dishs' })
    }

    const data = []
    Promise.all(
        result.map(async (e) => {
            let ingredients_plats_un,
                ingredients_plats_deux = []
            try {
                ingredients_plats_un = await db('ingredients_plat')
                    .select('ingredients.nom', 'ingredients.prix', 'ingredients.id_ingredient as id', 'ingredients_plat.quantite')
                    .where({ 'ingredients_plat.id_plat': e.id_plat_un })
                    .leftJoin('ingredients', 'ingredients.id_ingredient', 'ingredients_plat.id_ingredient')

                ingredients_plats_deux = await db('ingredients_plat')
                    .select('ingredients.nom', 'ingredients.prix', 'ingredients.id_ingredient as id', 'ingredients_plat.quantite')
                    .where({ 'ingredients_plat.id_plat': e.id_plat_deux })
                    .leftJoin('ingredients', 'ingredients.id_ingredient', 'ingredients_plat.id_ingredient')
            } catch (err) {
                console.log(err)
                res.send({ error: 'Error retrieving data' })
            }

            const prixPlatUn = sumBy(ingredients_plats_un, (o) => parseFloat(o.prix) * parseFloat(o.quantite))
            const prixPlatDeux = sumBy(ingredients_plats_deux, (o) => parseFloat(o.prix) * parseFloat(o.quantite))

            if (ingredients_plats_un.length > 0)
                ingredients_plats_un = chain(ingredients_plats_un)
                    .groupBy('id')
                    .map((value) =>
                        mergeWith(...value, (o, s, key) => {
                            if (key === 'quantite') {
                                return parseInt(o) + parseInt(s)
                            } else {
                                return o
                            }
                        })
                    )
                    .value()

            if (ingredients_plats_deux.length > 0)
                ingredients_plats_deux = chain(ingredients_plats_deux)
                    .groupBy('id')
                    .map((value) =>
                        mergeWith(...value, (o, s, key) => {
                            if (key === 'quantite') {
                                return parseInt(o) + parseInt(s)
                            } else {
                                return o
                            }
                        })
                    )
                    .value()

            let rr = { freq: e.freq, dtstart: e.start, until: e.until, interval: e.interval, recurring: e.recurring }

            data.push(
                {
                    id: e.id_plat_un,
                    nom: e.nom_plat_un,
                    ingredients: ingredients_plats_un,
                    prix: prixPlatUn,
                    type: 'plat',
                    start: e.start,
                    ...rr,
                },
                {
                    id: e.id_plat_deux,
                    nom: e.nom_plat_deux,
                    ingredients: ingredients_plats_deux,
                    prix: prixPlatDeux,
                    type: 'plat',
                    start: e.start,
                    ...rr,
                },
                {
                    id: e.id_dessert_un,
                    nom: e.nom_dessert_un,
                    prix: e.prix_dessert_un,
                    type: 'dessert',
                    start: e.start,
                    ...rr,
                },
                {
                    id: e.id_dessert_deux,
                    nom: e.nom_dessert_deux,
                    prix: e.prix_dessert_deux,
                    type: 'dessert',
                    start: e.start,
                    ...rr,
                }
            )
        })
    )
        .then((r) => {
            let entities = filter(
                flattenDeep(
                    data.map((e) => {
                        if (e.recurring) {
                            const rule = new RRule({
                                freq: e.freq,
                                dtstart: e.start,
                                until: e.until,
                                interval: e.interval,
                                wkst: RRule.SU,
                            })

                            return rule.all().map((re) => {
                                if (re >= dateStart && re < dateEnd) {
                                    return {
                                        ...e,
                                        start: re,
                                        end: re,
                                        parent_start: e.start,
                                        parent_end: e.end,
                                        is_child: true,
                                        parent_id: e.id,
                                    }
                                }
                            })
                        } else {
                            if (e.start >= dateStart && e.start < dateEnd) return { ...e, is_child: false, parent_id: e.id }
                        }
                    })
                ),
                (o) => o !== undefined
            )

            entities = entities.map((e) => {
                let week = parseInt(moment(e.start).diff(dateStart, 'weeks'))
                return {
                    ...e,
                    week,
                    quantite: 1,
                }
            })

            entities = chain(entities)
                .groupBy('week')
                .map((value) =>
                    chain(value)
                        .groupBy('id')
                        .map((elem) =>
                            mergeWith(...elem, (o, s, key) => {
                                if (key === 'quantite') {
                                    return parseInt(o) + parseInt(s)
                                } else {
                                    return o
                                }
                            })
                        )
                        .value()
                )
                .value()

            res.send({ data: entities })
        })
        .catch((err) => {
            console.log(err)
            res.send({ error: 'Error retrieving data' })
        })
})

module.exports = router
