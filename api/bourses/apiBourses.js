const express = require('express')
const db = require('../database')
let router = express.Router()

const fs = require('fs')
const multer = require('multer')

// Endpoints :
// GET : /api/bourses/ : Liste des bourses
// POST : /api/bourses/ : Ajouter dossier
// PUT : /api/bourses/ : Modifier dossier
// DELETE (POST REQ) : /api/bourses/delete : Supprimer dossier(s)

router.get('/', async (req, res) => {
    db('dossiers_bourse')
        .select(
            'dossiers_bourse.id_dossier_b',
            'dossiers_bourse.nom',
            'dossiers_bourse.prenom',
            'dossiers_bourse.n_etudiant',
            'dossiers_bourse.n_tel',
            'dossiers_bourse.email',
            'dossiers_bourse.date_depot',
            'dossiers_bourse.accepted',
            'dossiers_bourse.photo_id'
        )
        .orderBy('date_depot')
        .then((r) => {
            res.send({ data: r })
        })
        .catch((err) => {
            console.log(err)
            res.send({ error: 'Error retrieving data' })
        })
})

router.get('/single/:dossierBourseId', async (req, res) => {
    const id_dossier_b = req.params.dossierBourseId

    db('dossiers_bourse')
        .select('*')
        .where({ id_dossier_b })
        .orderBy('date_depot')
        .then((r) => {
            res.send({ data: r[0] })
        })
        .catch((err) => {
            console.log(err)
            res.send({ error: 'Error retrieving data' })
        })
})

router.post('/', async (req, res) => {
    const data = req.body.newDossierB

    const existing_dossier = await db('dossiers_bourse').select('n_etudiant').where({ n_etudiant: data.n_etudiant })

    if (existing_dossier.length === 0) {
        db('dossiers_bourse')
            .insert({ ...data })
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

router.post('/images/:id_dossier_b', async (req, res) => {
    const id_dossier_b = req.params.id_dossier_b

    if (!fs.existsSync('./api/bourses/images/' + id_dossier_b)) {
        fs.mkdir('./api/bourses/images/' + id_dossier_b, (err) => {
            if (err) {
                return console.error(err)
            }
            const storage = multer.diskStorage({
                destination: function (req, file, cb) {
                    cb(null, './api/bourses/images/' + id_dossier_b)
                },
                filename: function (req, file, cb) {
                    cb(null, file.originalname)
                },
            })

            const upload = multer({ storage: storage })

            upload.array('imgs')(req, res, (err) => {
                if (err) {
                    console.log(err)
                    res.send({ insert: false })
                } else {
                    res.send({ insert: true })
                }
            })
        })
    } else {
        res.send({ insert: false })
    }
})

router.put('/', (req, res) => {
    const data = req.body.updateDossierB

    db.transaction((trx) => {
        const queries = [
            db('dossiers_bourse')
                .update({
                    accepted: data.accepted,
                })
                .where({ id_dossier_b: data.id_dossier_b }),
        ]

        Promise.all(queries)
            .then((resp) => {
                trx.commit()
                res.status(200).send({ updated: true })
            })
            .catch((err) => {
                console.log(err)
                trx.rollback()
                res.send({ updated: false })
            })
    })
})

router.post('/delete', async (req, res) => {
    const ids = req.body.dossiersBoursesIds

    db.transaction((trx) => {
        const queries = []
        ids.map((e) => {
            queries.push(db('dossiers_bourse').where('id_dossier_b', e).del())
            try {
                fs.rmSync('./api/bourses/images/' + e, { recursive: true, force: true })
            } catch (err) {
                console.log(err)
            }
        })

        Promise.all(queries)
            .then((resp) => {
                trx.commit()
                res.status(200).send({ deleted: true })
            })
            .catch((err) => {
                console.log(err)
                trx.rollback()
                res.send({ deleted: false })
            })
    })
})

module.exports = router
