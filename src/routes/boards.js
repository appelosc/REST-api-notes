const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const authorize = require('../middleware/authorize')

const prisma = new PrismaClient()

router.use(authorize)

router.get('/', async (req,res)=>{
    try{
        const userId = req.authUser.id
        const boards = await prisma.boards.findMany({
        where: {
            userIds: { has: String(userId) }
        }
    })
    if(!boards){
        return res.status(404).json({
            message: "No boards found"
        })
    }
    res.status(200).json(boards)

    }catch(err){
        console.error(err)
    }

})

module.exports = router