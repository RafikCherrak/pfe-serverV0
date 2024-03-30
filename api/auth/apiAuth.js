const express = require('express')
const db = require('../database')
let router= express.Router()

const jwt =require('jsonwebtoken');
const bcrypt = require('bcryptjs')
const {v4} = require('uuid');

const jwtConfig = {
    secret : '53cr3t-57uff_^*ba7ata#96/zr0ud1y@',
    expiresIn :'2 days'
}

router.post('/', async (rq,res)=>{
    const data= req.body.data
    const {email, password} = data
    const user = await db('users').select('*').where({email})
    const error = {
        email :user[0] ?  null : "vérifier votre email",
        password :user[0] && bcrypt.compareSync(password, user[0].password) ? null: "vérifiez votre mot de passe"
    }
    if(!error.email && !error.password && !error.displayName){
        delete user[0]['password']
        const access_token = jwt.sign({ id_user: user[0].id_user }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })
        const response = {
            user: {
                id_user: user[0].id_user,
                role: user[0].role,
                data: {
                    displayName: user[0].displayName,
                    email: user[0].email,
                },
            },
            access_token: access_token,
        }

        res.status(200).send(response)
    } else {
        res.status(200).send({ error })
    }
})
router.post('/access-token', async (req, res) => {
    const data = req.body.data
    const { access_token } = data

    try {
        const { id_user } = jwt.verify(access_token, jwtConfig.secret)

        const user = await db('users').select('id_user', 'email', 'displayName', 'role').where({ id_user: id_user })

        const updatedAccessToken = jwt.sign({ id_user: user[0].id_user }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })

        const response = {
            user: {
                id_user: user[0].id_user,
                role: user[0].role,
                data: {
                    displayName: user[0].displayName,
                    email: user[0].email,
                },
            },
            access_token: updatedAccessToken,
        }

        res.status(200).send(response)
    } catch (e) {
        const error = "Token d'accès invalid"
        res.status(401).send({ error })
    }
})

router.post('/register', async (req, res) => {
    const data = req.body
    const { displayName, password, email, role = 'staff' } = data

    const isEmailExists = await db('users').select('id_user').where({ email })

    const error = {
        email: isEmailExists.length > 0 ? 'Cette e-mail a déja été utiliser' : null,
        displayName: displayName !== '' ? null : 'Veuillez Entrez un nom a afficher',
        password: null,
    }

    if (!error.displayName && !error.password && !error.email) {
        const newUser = {
            id_user: v4(),
            email: email,
            password: bcrypt.hashSync(password, 8),
            displayName: displayName,
            role: role,
        }

        db('users')
            .insert(newUser)
            .then((r) => {
                delete newUser['password']

                console.log(newUser)

                const access_token = jwt.sign({ id_user: newUser.id_user }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })
                const response = {
                    user: {
                        id_user: newUser.id_user,
                        role: newUser.role,
                        data: {
                            displayName: newUser.displayName,
                            email: newUser.email,
                        },
                    },
                    access_token: access_token,
                }

                res.status(200).send(response)
            })
            .catch((err) => {
                res.status(500).send({ error: "Error lors de l'ajout de l'utilisateur" })
            })
    } else {
        res.status(200).send({ error })
    }
})

module.exports = router