const express = require('express')
const db = require('../database')
const uuid =require('uuid')
const bcrypt = require('bcryptjs');
let router = express.Router()


router.get('/', (req, res) => {
db('users')
.select('id_user', 'email','displayName','role')
.orderBy('displayName')
.then((r)=> {
    console.log(r)
    res.send({date: r})
})
.catch((err)=> {

    console.log(err)
    res.send({error :'error  to list users'})
}) })



router.post( '/', async (req,res) =>{
const data = req.body
const id_user = uuid.v4()

const existing_user = await  db('users').select('email').where({ email :data.email}).first()
if(existing_user.length === 0){
    db('users')
    .insert({email:data.email ,displayName:data.displayName, role: data.role, id_user, password : bcrypt.hashSync(data.password) })
    .then((r) => {
            res.send({insert:true})
        }
    )
    .catch((err) => {
    res.send({insert:false})
    })
}else{
    res.send({ insert: false })
}
})

router.put( "/", async (req ,res)=>{
        const data =req.body.user

        await db('users')
        .update({email :data.email, password : bcrypt.hashSync(data.password), displayName: data.displayName, role: data.role })
        .where({id_user:data.id_user})
        .then((r)=>{
        res.send({update :true})
        })
        .catch((err) =>{
            console.log(err)
            res.send({update: false})
        })
})


router.post('/delete', (req, res) => {
    const ids = req.body.id_user

    db.transaction((trx) => {
        const queries = []

        ids.map((elem) => {
            const query = db('users').where('id_user', elem).del().transacting(trx)
            queries.push(query)
        })

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